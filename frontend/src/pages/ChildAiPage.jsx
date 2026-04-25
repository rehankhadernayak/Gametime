import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppRouter } from 'gametime-web-nav';
import { API_BASE } from '../api/client.js';

/* ─────────────────────────────────────────────────────────────────────────
   Icons
   ───────────────────────────────────────────────────────────────────────── */
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function SparkIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Text renderer
   ───────────────────────────────────────────────────────────────────────── */
function renderText(content) {
  if (!content) return null;
  return content.split(/\n{2,}/).map((para, pIdx) => {
    const lines = para.split('\n');
    return (
      <p key={pIdx} className="aws-bubble-para">
        {lines.map((line, lIdx) =>
          lIdx < lines.length - 1
            ? <span key={lIdx}>{line}<br /></span>
            : line
        )}
      </p>
    );
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Tool badge
   ───────────────────────────────────────────────────────────────────────── */
function ToolBadge({ event }) {
  const isPending = event.type === 'tool_start';
  const isSuccess = !isPending && event.success;
  return (
    <span className={`ai-tool-badge ${isPending ? 'pending' : isSuccess ? 'success' : 'error'}`}>
      {isPending ? '⟳ ' : isSuccess ? '✓ ' : '✗ '}
      {isPending ? event.label : event.message}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Chat bubbles
   ───────────────────────────────────────────────────────────────────────── */
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`aws-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <span className="aws-avatar child-avatar" aria-hidden="true" />}
      <div className={`aws-bubble${msg.isError ? ' error' : ''}`}>
        {msg.toolEvents?.map((te, i) => <ToolBadge key={i} event={te} />)}
        {isUser
          ? <p className="aws-bubble-text">{msg.content}</p>
          : renderText(msg.content)
        }
      </div>
    </div>
  );
}

function StreamingBubble({ text, toolEvents }) {
  return (
    <div className="aws-message assistant">
      <span className="aws-avatar child-avatar" aria-hidden="true" />
      <div className="aws-bubble">
        {toolEvents.map((te, i) => <ToolBadge key={i} event={te} />)}
        {text
          ? <p className="aws-bubble-text">{text}<span className="ai-cursor" aria-hidden="true" /></p>
          : <span className="ai-typing" aria-label="Thinking"><span /><span /><span /></span>
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Break timer canvas card
   ───────────────────────────────────────────────────────────────────────── */
const BREAK_ICONS = {
  eye_rest:    'EYE',
  study_break: 'STD',
  stretch:     'STR',
  water:       'H2O',
  custom:      'TMR'
};

function BreakTimerCard({ timerData, onDismiss }) {
  const totalSeconds = Math.round(timerData.durationMinutes * 60);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) { setDone(true); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');
  const pct = done ? 100 : Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  return (
    <div className="child-timer-card">
      <div className="child-timer-emoji">{BREAK_ICONS[timerData.breakType] || 'TMR'}</div>
      <p className="child-timer-type">{timerData.breakType.replace('_', ' ').toUpperCase()}</p>
      {!done
        ? <div className="child-timer-display">{mm}:{ss}</div>
        : <div className="child-timer-done-msg">Done!</div>
      }
      <p className="child-timer-message">{timerData.message}</p>
      <div className="child-timer-progress">
        <div className="child-timer-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <button type="button" className="child-timer-dismiss" onClick={onDismiss}>
        {done ? 'Great! ✓' : 'Skip'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stats canvas card
   ───────────────────────────────────────────────────────────────────────── */
function StatsCard({ data }) {
  const child = data?.child || {};
  return (
    <div className="child-stats-card">
      <div className="child-stats-header">
        <span className="child-stats-title">My Stats</span>
        <span className="child-stats-badge">Live</span>
      </div>
      <div className="child-stats-grid">
        <div className="child-stat-item">
          <span className="child-stat-label">RP</span>
          <strong className="child-stat-value rp">{child.rpBalance ?? 0}</strong>
        </div>
        <div className="child-stat-item">
          <span className="child-stat-label">GP</span>
          <strong className="child-stat-value gp">{child.gpBalance ?? 0}</strong>
        </div>
        <div className="child-stat-item">
          <span className="child-stat-label">Play mins available</span>
          <strong className="child-stat-value play">{data?.playableMinutes ?? 0}</strong>
        </div>
        <div className="child-stat-item">
          <span className="child-stat-label">Gaming today</span>
          <strong className="child-stat-value">{data?.gamingToday ?? 0} min</strong>
        </div>
        <div className="child-stat-item">
          <span className="child-stat-label">Tasks this week</span>
          <strong className="child-stat-value">{data?.weeklyCompletions ?? 0}</strong>
        </div>
        <div className="child-stat-item">
          <span className="child-stat-label">Active tasks</span>
          <strong className="child-stat-value">{data?.activeTasks?.length ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Canvas empty state
   ───────────────────────────────────────────────────────────────────────── */
function ChildCanvasEmpty() {
  return (
    <div className="child-canvas-empty">
      <h3>Hey! I'm Buddy</h3>
      <p>Your personal study and gaming coach. Ask me anything!</p>
      <div className="child-canvas-hints">
        <span>Homework help</span>
        <span>Eye rest timer</span>
        <span>Gaming check</span>
        <span>Quiz me</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Quick action chips
   ───────────────────────────────────────────────────────────────────────── */
const CHILD_CHIPS = [
  { label: 'Help with homework',      prompt: 'I need help with my homework. What subject should we start with?' },
  { label: 'How much play time left?', prompt: 'How much gaming time do I have available right now?' },
  { label: 'Eye rest timer',          prompt: 'Give me a 20-20-20 eye rest break right now.' },
  { label: 'Quiz me!',                prompt: 'I want to do a quick quiz. Ask me a fun question on any school subject.' },
  { label: 'Stretch break',           prompt: 'I need a stretch break. Set a 5-minute timer and tell me what to do.' },
];

/* ─────────────────────────────────────────────────────────────────────────
   Main page component
   ───────────────────────────────────────────────────────────────────────── */
export default function ChildAiPage({ token, childName }) {
  const router = useAppRouter();

  const [messages,       setMessages]      = useState([]);
  const [streamingText,  setStreamingText]  = useState('');
  const [streamingTools, setStreamingTools] = useState([]);
  const [input,          setInput]          = useState('');
  const [isStreaming,    setIsStreaming]     = useState(false);

  /* Canvas state */
  const [statsData, setStatsData] = useState(null);
  const [timerData, setTimerData] = useState(null);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);
  const typingQueueRef = useRef([]);
  const typingDrainRef = useRef(null);
  const typingShownRef = useRef('');

  function stopTypingDrain() {
    clearInterval(typingDrainRef.current);
    typingDrainRef.current = null;
    typingQueueRef.current = [];
    typingShownRef.current = '';
  }

  function startTypingDrain() {
    if (typingDrainRef.current) return;
    typingDrainRef.current = setInterval(() => {
      if (!typingQueueRef.current.length) return;
      const n = typingQueueRef.current.length > 50 ? 5
              : typingQueueRef.current.length > 20 ? 3
              : typingQueueRef.current.length >  5 ? 2
              : 1;
      typingShownRef.current += typingQueueRef.current.splice(0, n).join('');
      setStreamingText(typingShownRef.current);
    }, 28);
  }

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, streamingTools]);

  /* Process tool_done → update canvas */
  function processToolDone(event) {
    if (!event.success) return;
    if (event.tool === 'get_my_stats') {
      setStatsData(event.data);
    }
    if (event.tool === 'start_break_timer' && event.data) {
      setTimerData(event.data);
    }
  }

  /* Send message */
  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;

    setInput('');
    const ta = inputRef.current;
    if (ta) ta.style.height = 'auto';
    setIsStreaming(true);
    stopTypingDrain();
    setStreamingText('');
    setStreamingTools([]);
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);

    const controller = new AbortController();
    abortRef.current = controller;

    let currentText  = '';
    let currentTools = [];
    let doneReceived = false;
    let wasAborted   = false;

    try {
      const response = await fetch(`${API_BASE}/ai/child/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message: msg, history: messages }),
        signal:  controller.signal
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'text') {
            currentText += event.delta;
            typingQueueRef.current.push(...event.delta.split(''));
            startTypingDrain();

          } else if (event.type === 'tool_start') {
            currentTools = [...currentTools, { ...event, _id: Date.now() + Math.random() }];
            setStreamingTools([...currentTools]);

          } else if (event.type === 'tool_done') {
            const idx = [...currentTools].reverse().findIndex(
              (t) => t.tool === event.tool && t.type === 'tool_start'
            );
            if (idx !== -1) {
              const realIdx = currentTools.length - 1 - idx;
              currentTools = currentTools.map((t, i) =>
                i === realIdx ? { ...event, _id: t._id } : t
              );
            } else {
              currentTools = [...currentTools, { ...event, _id: Date.now() + Math.random() }];
            }
            setStreamingTools([...currentTools]);
            processToolDone(event);

          } else if (event.type === 'done') {
            doneReceived = true;
            const finalContent = event.assistantMessage || currentText;
            stopTypingDrain();
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: finalContent, toolEvents: currentTools }
            ]);
            setStreamingText('');
            setStreamingTools([]);

          } else if (event.type === 'error') {
            throw new Error(event.message || 'AI error');
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        wasAborted = true;
      } else {
        const errMsg = err.message || '';
        const errorContent =
          errMsg.includes('API key') || errMsg.includes('api_key')
            ? 'Buddy is offline - API key not configured.'
            : errMsg.includes('fetch') || err.name === 'TypeError'
            ? 'Cannot reach the server. Make sure the backend is running.'
            : errMsg || 'Something went wrong. Try again!';
        setMessages((prev) => [...prev, { role: 'assistant', content: errorContent, isError: true }]);
      }
    } finally {
      stopTypingDrain();
      if (!wasAborted && !doneReceived && currentText) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: currentText, toolEvents: currentTools }
        ]);
      }
      setIsStreaming(false);
      setStreamingText('');
      setStreamingTools([]);
      abortRef.current = null;
      if (!wasAborted) setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [input, isStreaming, messages, token]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const isActive   = isStreaming || streamingText || streamingTools.length > 0;
  const firstName  = childName?.split(' ')[0] || 'there';
  const hasCanvas  = statsData || timerData;

  return (
    <div className="child-ai-page">

      {/* ════════════════════════════════════
          LEFT - Chat panel
          ════════════════════════════════════ */}
      <div className="child-ai-chat">

        {/* Header */}
        <div className="child-ai-header">
          <button
            type="button"
            className="aws-back-btn"
            onClick={() => router.push('/child/dashboard')}
            aria-label="Back to dashboard"
          >
            <BackIcon /> Dashboard
          </button>
          <div className="child-ai-brand">
            <span className="child-ai-brand-name">Study Buddy</span>
            <span className="aws-brand-badge">Beta</span>
          </div>
          <div style={{ width: 80 }} /> {/* spacer */}
        </div>

        {/* Messages */}
        <div className="aws-messages" role="log" aria-live="polite" aria-atomic="false">
          {messages.length === 0 && !isActive && (
            <div className="aws-chat-empty">
              <p className="aws-chat-empty-greeting">Hey {firstName}! I'm Buddy!</p>
              <p className="aws-chat-empty-sub">
                I can help with homework, gaming checks, study breaks, and more. What do you need?
              </p>
            </div>
          )}

          {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
          {isActive && <StreamingBubble text={streamingText} toolEvents={streamingTools} />}
          <div ref={bottomRef} />
        </div>

        {/* Quick action chips */}
        {!isStreaming && (
          <div className="aws-chips-bar">
            {CHILD_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="aws-chip"
                onClick={() => sendMessage(chip.prompt)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="aws-input-bar">
          <textarea
            ref={inputRef}
            className="aws-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Buddy anything…"
            disabled={isStreaming}
            rows={1}
            aria-label="Message input"
          />
          <button
            type="button"
            className="aws-send-btn"
            onClick={() => sendMessage()}
            disabled={isStreaming || !input.trim()}
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════
          RIGHT - Canvas panel
          ════════════════════════════════════ */}
      <div className="child-ai-canvas">
        <div className="aws-canvas-header">
          <span className="aws-canvas-title">Buddy's Board</span>
          <span className="aws-canvas-sub">
            {!hasCanvas ? 'Your stats and timers will appear here' : 'Updated live'}
          </span>
        </div>

        <div className="aws-canvas-content">
          {!hasCanvas && <ChildCanvasEmpty />}

          {timerData && (
            <div className="aws-artifact-wrap">
              <BreakTimerCard
                timerData={timerData}
                onDismiss={() => setTimerData(null)}
              />
            </div>
          )}

          {statsData && (
            <div className="aws-artifact-wrap">
              <StatsCard data={statsData} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
