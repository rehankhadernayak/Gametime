import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../api/client.js';

export default function TaskCompletionForm({ tasks, onComplete, token }) {
  const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10 MB - matches backend validation limit
  const [taskId, setTaskId] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI evidence coaching state
  const [coaching, setCoaching] = useState(null); // { coaching, recommendation }
  const [coachingLoading, setCoachingLoading] = useState(false);
  const coachingAbortRef = useRef(null);

  async function toDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read evidence file'));
      reader.readAsDataURL(file);
    });
  }

  const selectedTask = tasks.find((t) => t.id === taskId);
  const requiredEvidenceType = selectedTask?.requiredEvidenceType || null;

  // When file changes: build preview URL and trigger AI coaching
  useEffect(() => {
    if (!evidenceFile) {
      setEvidencePreviewUrl(null);
      setCoaching(null);
      return;
    }

    // Build a local preview URL for images
    const url = URL.createObjectURL(evidenceFile);
    setEvidencePreviewUrl(url);
    setCoaching(null);

    // Only call AI coaching for image files and only if we have a taskId + token
    if (!evidenceFile.type.startsWith('image/') || !taskId || !token || requiredEvidenceType === 'Video') {
      return () => URL.revokeObjectURL(url);
    }

    // Abort any in-flight request
    if (coachingAbortRef.current) coachingAbortRef.current.abort();
    const controller = new AbortController();
    coachingAbortRef.current = controller;

    setCoachingLoading(true);

    (async () => {
      try {
        const evidenceData = await toDataUrl(evidenceFile);
        const evidenceMime = evidenceFile.type;

        const res = await fetch(`${API_BASE}/ai/evidence-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ taskId, evidenceData, evidenceMime }),
          signal: controller.signal
        });

        if (!res.ok) throw new Error('coaching failed');
        const data = await res.json();
        setCoaching(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Fail silently - coaching is an enhancement only
          setCoaching(null);
        }
      } finally {
        if (!controller.signal.aborted) setCoachingLoading(false);
      }
    })();

    return () => {
      URL.revokeObjectURL(url);
      controller.abort();
    };
  // Re-run when file OR taskId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceFile, taskId, requiredEvidenceType, token]);

  const fileAccept = requiredEvidenceType === 'Video' ? 'video/*' : requiredEvidenceType === 'Photo' ? 'image/*' : 'image/*,video/*';

  return (
    <div className="panel">
      <h2>Task Completion</h2>
      <p id="completion-help" className="helper-text">
        {requiredEvidenceType === 'Video' && 'This quest requires a video clip (max 10MB). '}
        {requiredEvidenceType === 'Photo' && 'This quest requires a photo (max 10MB). '}
        {!requiredEvidenceType && 'Upload photo or video evidence (max 10MB) and submit for parent approval.'}
      </p>
      <form
        className="inline-form"
        aria-describedby="completion-help"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting) return;
          setFormError('');
          setMessage('');
          if (!taskId) {
            setFormError('Select a task first.');
            return;
          }

          if (!evidenceFile) {
            setFormError('Evidence file is required.');
            return;
          }

          let evidenceData = null;
          let evidenceMime = null;
          let evidenceType = null;

          const isImage = evidenceFile.type.startsWith('image/');
          const isVideo = evidenceFile.type.startsWith('video/');
          const isAllowed = isImage || isVideo;
          if (!isAllowed) {
            setFormError('Only image or video evidence is allowed.');
            return;
          }
          if (requiredEvidenceType === 'Photo' && !isImage) {
            setFormError('This quest requires a photo. Please choose an image file.');
            return;
          }
          if (requiredEvidenceType === 'Video' && !isVideo) {
            setFormError('This quest requires a video. Please choose a video file.');
            return;
          }
          if (evidenceFile.size > MAX_EVIDENCE_BYTES) {
            setFormError('Evidence must be 10MB or less.');
            return;
          }

          setSubmitting(true);
          try {
            evidenceData = await toDataUrl(evidenceFile);
            evidenceMime = evidenceFile.type || null;
            evidenceType = evidenceMime?.startsWith('video/') ? 'Video' : 'Photo';
            if (requiredEvidenceType && evidenceType !== requiredEvidenceType) {
              setFormError(`This quest requires ${requiredEvidenceType.toLowerCase()} proof.`);
              return;
            }

            const result = await onComplete({
              taskId,
              evidenceData,
              evidenceMime,
              evidenceType,
              evidenceNote: evidenceNote || null
            });

            setMessage(result.message || 'Submitted for parent review.');
            setTaskId('');
            setEvidenceFile(null);
            setEvidenceNote('');
            setCoaching(null);
          } catch (error) {
            setFormError(error?.message || 'Failed to submit task completion');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label>
          Active task
          <select
            value={taskId}
            onChange={(e) => {
              setTaskId(e.target.value);
              setEvidenceFile(null);
              setCoaching(null);
            }}
          >
            <option value="">Select active task</option>
            {tasks.filter((task) => task.state === 'Active').map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
        </label>

        <label>
          Evidence file
          <input
            type="file"
            accept={fileAccept}
            required
            onChange={(e) => {
              setEvidenceFile(e.target.files?.[0] || null);
            }}
          />
        </label>

        {/* Image preview */}
        {evidencePreviewUrl && evidenceFile?.type?.startsWith('image/') && (
          <div className="evidence-preview-wrap">
            <img src={evidencePreviewUrl} alt="Evidence preview" className="evidence-preview-thumb" />
          </div>
        )}

        {/* AI coaching card */}
        {coachingLoading && (
          <div className="evidence-coaching-card">
            <span className="ai-typing" aria-label="Analysing"><span /><span /><span /></span>
            <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-muted)' }}>AI reviewing your photo…</span>
          </div>
        )}

        {!coachingLoading && coaching && (
          coaching.recommendation === 'submit' ? (
            <div className="evidence-coaching-card evidence-coaching-good">
              <span className="evidence-coaching-icon">✓</span>
              <div className="evidence-coaching-body">
                <p className="evidence-coaching-text">{coaching.coaching}</p>
              </div>
            </div>
          ) : (
            <div className="evidence-coaching-card evidence-coaching-warn">
              <span className="evidence-coaching-icon">!</span>
              <div className="evidence-coaching-body">
                <p className="evidence-coaching-text">{coaching.coaching}</p>
                <button
                  type="button"
                  className="evidence-retake-btn"
                  onClick={() => {
                    setEvidenceFile(null);
                    setCoaching(null);
                  }}
                >
                  Retake photo
                </button>
                <span className="evidence-submit-anyway"> or </span>
                <button type="submit" disabled={submitting} className="evidence-submit-anyway-btn">
                  {submitting ? 'Uploading…' : 'Submit anyway'}
                </button>
              </div>
            </div>
          )
        )}

        <label>
          Evidence note
          <input
            maxLength={200}
            placeholder="Optional note for parent"
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Uploading…' : 'Submit Completion'}
        </button>
      </form>
      {formError && <p className="error" role="alert">{formError}</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
