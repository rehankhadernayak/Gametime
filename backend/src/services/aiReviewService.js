import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRecommendation(value) {
  if (!value) return 'NeedsParentReview';
  if (value === 'Approve') return 'Approve';
  if (value === 'Reject') return 'Reject';
  return 'NeedsParentReview';
}

function toWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function clip(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function buildReason(parts) {
  const joined = parts.filter(Boolean).join(' ');
  return joined.slice(0, 220) || 'Local advisory generated from evidence checks.';
}

// ─── Local rule fallback (no AI required) ─────────────────────────────────────

function localRuleAdvisory({ taskTitle, taskDescription, evidenceType, evidenceMime, evidenceData, evidenceNote, cloudFailedReason = '' }) {
  let score = 0.45;
  const reasons = [];

  const evidencePresent = Boolean(evidenceData && String(evidenceData).length > 24);
  if (evidencePresent) {
    score += 0.2;
    reasons.push('Evidence file is attached.');
  } else {
    score -= 0.5;
    reasons.push('No usable evidence was detected.');
  }

  const mime = String(evidenceMime || '').toLowerCase();
  const expectsImage = evidenceType === 'Photo';
  const expectsVideo = evidenceType === 'Video';
  const mimeLooksImage = mime.startsWith('image/');
  const mimeLooksVideo = mime.startsWith('video/');

  if ((expectsImage && mimeLooksImage) || (expectsVideo && mimeLooksVideo)) {
    score += 0.1;
    reasons.push('Evidence type matches the uploaded file format.');
  } else if (mime) {
    score -= 0.25;
    reasons.push('Evidence type does not match uploaded file format.');
  }

  if (expectsVideo) {
    score += 0.05;
    reasons.push('Video evidence usually provides stronger context.');
  }

  const note = String(evidenceNote || '').trim();
  if (note.length >= 12) {
    score += 0.08;
    reasons.push('Child note includes useful context.');
  } else if (note.length > 0) {
    score -= 0.03;
    reasons.push('Child note is very short.');
  }

  const taskWords = toWords(`${taskTitle || ''} ${taskDescription || ''}`);
  const noteWords = toWords(note);
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'have', 'just', 'into', 'about', 'task', 'done', 'then', 'was', 'were', 'when', 'what', 'where', 'there', 'their', 'they', 'them', 'will', 'would', 'should', 'could'
  ]);

  const taskKeywords = [...new Set(taskWords.filter((word) => word.length >= 4 && !stopWords.has(word)))];
  if (taskKeywords.length > 0 && noteWords.length > 0) {
    const noteSet = new Set(noteWords);
    const overlapCount = taskKeywords.filter((word) => noteSet.has(word)).length;
    const overlapRatio = overlapCount / taskKeywords.length;

    if (overlapRatio >= 0.3) {
      score += 0.15;
      reasons.push('Child note aligns closely with task details.');
    } else if (overlapRatio >= 0.15) {
      score += 0.08;
      reasons.push('Child note partly matches task details.');
    } else {
      score -= 0.1;
      reasons.push('Child note has weak overlap with task details.');
    }
  }

  const lowerNote = note.toLowerCase();
  if (/(done|finished|completed|cleaned|submitted|recorded|checked)/.test(lowerNote)) {
    score += 0.06;
    reasons.push('Completion language detected in child note.');
  }
  if (/(later|didn\'t|didnt|not done|forgot|maybe|try|tomorrow)/.test(lowerNote)) {
    score -= 0.12;
    reasons.push('Uncertain or incomplete language detected.');
  }

  score = clip(score, 0.05, 0.95);

  let recommendation = 'NeedsParentReview';
  let confidence = 0.55;
  if (score >= 0.7) {
    recommendation = 'Approve';
    confidence = clip(score, 0.65, 0.95);
  } else if (score <= 0.28) {
    recommendation = 'Reject';
    confidence = clip(1 - score, 0.65, 0.95);
  } else {
    confidence = clip(0.45 + Math.abs(score - 0.5), 0.45, 0.75);
  }

  if (cloudFailedReason) {
    reasons.push('Cloud AI unavailable, local rules were used.');
  }

  return {
    recommendation,
    confidence: round2(confidence),
    reason: buildReason(reasons),
    model: 'local-rules-v1',
    status: 'Completed'
  };
}

// ─── Claude vision analysis ───────────────────────────────────────────────────

function parseJsonFromText(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Strip the "data:<mime>;base64," prefix from a data URL and return just
 * the raw base64 string that the Anthropic SDK expects.
 */
function extractBase64(dataUrl) {
  if (!dataUrl) return null;
  const commaIndex = String(dataUrl).indexOf(',');
  if (commaIndex === -1) return String(dataUrl); // already raw base64
  return dataUrl.slice(commaIndex + 1);
}

/**
 * Map a MIME type string to one of the four image types Anthropic accepts.
 * Returns null if the MIME type is not a supported image.
 */
function toAnthropicImageType(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'image/jpeg';
  if (m.includes('png')) return 'image/png';
  if (m.includes('gif')) return 'image/gif';
  if (m.includes('webp')) return 'image/webp';
  return null;
}

async function analyzeWithClaude(input) {
  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const systemPrompt = [
    'You are an assistant helping a parent review evidence that a child submitted for a household task.',
    'You are advisory only - the final decision belongs to the parent.',
    'Output strict JSON only with exactly three keys: recommendation, confidence, reason.',
    'recommendation must be exactly one of: Approve, Reject, NeedsParentReview.',
    'confidence must be a number between 0 and 1 (e.g. 0.82).',
    'reason must be a plain-English explanation under 220 characters.',
    'Do not output any text outside the JSON object.'
  ].join(' ');

  const userContext = [
    `Task title: ${input.taskTitle}`,
    `Task description: ${input.taskDescription}`,
    `Evidence type declared by child: ${input.evidenceType}`,
    `Child note: ${input.evidenceNote || 'none'}`
  ].join('\n');

  // Build the content array for the user message
  const userContent = [{ type: 'text', text: userContext }];

  // Attach image if this is a photo submission and the MIME type is supported
  const isPhoto = input.evidenceType === 'Photo';
  const imageType = isPhoto ? toAnthropicImageType(input.evidenceMime) : null;
  const base64Data = isPhoto && imageType ? extractBase64(input.evidenceData) : null;

  if (base64Data && imageType) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageType,
        data: base64Data
      }
    });
  } else {
    // Video or unsupported image format - describe the limitation
    userContent.push({
      type: 'text',
      text: input.evidenceType === 'Video'
        ? 'The child uploaded a video file. You cannot view it. Base your assessment on the task description and child note only, and lean toward NeedsParentReview.'
        : 'The image could not be decoded. Base your assessment on the task description and child note only, and lean toward NeedsParentReview.'
    });
  }

  const response = await client.messages.create({
    model: env.claudeModel,
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  });

  const rawText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const parsed = parseJsonFromText(rawText);
  if (!parsed) {
    throw new Error('Claude response could not be parsed as JSON');
  }

  return {
    recommendation: normalizeRecommendation(parsed.recommendation),
    confidence: round2(clip(Number(parsed.confidence) || 0.5, 0, 1)),
    reason: String(parsed.reason || 'AI advisory generated.').slice(0, 220),
    model: env.claudeModel,
    status: 'Completed'
  };
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function analyzeTaskEvidence(input) {
  // If no Anthropic API key is configured, fall back to local rules immediately
  // and mark status as 'Unavailable' so parents know Claude was not used.
  if (!env.anthropicApiKey) {
    const advisory = localRuleAdvisory({ ...input, cloudFailedReason: 'ANTHROPIC_API_KEY not configured' });
    return { ...advisory, status: 'Unavailable' };
  }

  try {
    return await analyzeWithClaude(input);
  } catch (error) {
    // Claude was attempted but failed - local rules ran as fallback.
    // Keep status 'Completed' since a real advisory was produced.
    return localRuleAdvisory({
      ...input,
      cloudFailedReason: String(error?.message || 'Cloud AI failed')
    });
  }
}
