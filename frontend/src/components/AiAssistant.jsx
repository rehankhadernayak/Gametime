import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

/* ── Send icon ──────────────────────────────────────────────────────── */
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Spark icon ─────────────────────────────────────────────────────── */
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
    </svg>
  );
}

/* ── Trash icon ─────────────────────────────────────────────────────── */
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

/* ── Tool badge ─────────────────────────────────────────────────────── */
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

/* ── Text renderer: splits content into paragraphs + line breaks ────── */
function renderText(content) {
  if (!content) return null;
  const paragraphs = content.split(/\n{2,}/);
  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    return (
      <p key={pIdx} className="ai-bubble-para">
        {lines.map((line, lIdx) =>
          lIdx < lines.length - 1
            ? <span key={lIdx}>{line}<br /></span>
            : line
        )}
      </p>
    );
  });
}

/* ── Message bubble ─────────────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`ai-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <span className="ai-msg-avatar" aria-hidden="true" />}
      <div className={`ai-bubble${msg.isError ? ' error' : ''}`}>
        {msg.toolEvents?.map((te, i) => <ToolBadge key={i} event={te} />)}
        {isUser
          ? <p className="ai-bubble-text">{msg.content}</p>
          : renderText(msg.content)
        }
      </div>
    </div>
  );
}

/* ── Streaming bubble (live assistant message) ──────────────────────── */
function StreamingBubble({ text, toolEvents }) {
  return (
    <div className="ai-message assistant">
      <span className="ai-msg-avatar" aria-hidden="true" />
      <div className="ai-bubble">
        {toolEvents.map((te, i) => <ToolBadge key={i} event={te} />)}
        {text ? (
          <p className="ai-bubble-text">
            {text}<span className="ai-cursor" aria-hidden="true" />
          </p>
        ) : (
          <span className="ai-typing" aria-label="AI is thinking">
            <span /><span /><span />
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */
function EmptyState({ parentName }) {
  return (
    <div className="ai-empty-state">
      <div className="ai-empty-avatar" aria-hidden="true">
        <SparkIcon />
      </div>
      <h3>Hi{parentName ? `, ${parentName.split(' ')[0]}` : ''}!</h3>
      <p>Ask me anything about your family, quests, rewards, or gaming settings.</p>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
/**
 * Props:
 *   token      - auth token (required)
 *   parentName - display name for greeting
 *   autoGreet  - when true + no prior history, calls POST /ai/greet to start onboarding
 */
export default function AiAssistant({ token, parentName, autoGreet }) {
  const [messages,         setMessages]         = useState([]);
  const [streamingText,    setStreamingText]     = useState('');
  const [streamingTools,   setStreamingTools]    = useState([]);
  const [input,            setInput]             = useState('');
  const [isStreaming,      setIsStreaming]        = useState(false);
  const [historyLoaded,    setHistoryLoaded]      = useState(false);
  const [showClearConfirm, setShowClearConfirm]  = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const abortRef   = useRef(null);

  /* ── Keep a stable ref to sendMessage so effects don't go stale ── */
  const sendMsgRef = useRef(null);

  /* ── Load history on mount ── */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/ai/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch {
        // silently fail - user starts fresh
      } finally {
        setHistoryLoaded(true);
      }
    }
    load();
  }, [token]);

  /* ── Auto-scroll whenever content changes ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, streamingTools]);

  /* ── Send message ── */
  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;

    setInput('');
    setIsStreaming(true);
    setStreamingText('');
    setStreamingTools([]);

    // Optimistically add the user message
    const userMsg = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    let currentText  = '';
    let currentTools = [];
    let doneReceived = false; // track whether the backend sent a 'done' event
    let wasAborted   = false; // track whether the user aborted

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`
        },
        body:   JSON.stringify({ message: msg, history: messages }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // hold back incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === 'text') {
            currentText += event.delta;
            setStreamingText(currentText);

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

          } else if (event.type === 'done') {
            doneReceived = true;
            const finalContent = event.assistantMessage || currentText;
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
          errMsg.includes('ANTHROPIC_API_KEY') || errMsg.includes('api_key') || errMsg.includes('API key')
            ? 'AI API key not configured. Add ANTHROPIC_API_KEY to backend/.env and restart the backend server.'
            : (err.name === 'TypeError' || errMsg.includes('fetch') || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError'))
            ? 'Cannot reach the backend server. Make sure it is running: cd backend && npm run dev'
            : errMsg.includes('authentication_error') || errMsg.includes('invalid x-api-key') || errMsg.includes('invalid_api_key')
            ? 'Invalid API key. Check your ANTHROPIC_API_KEY in backend/.env and restart the server.'
            : errMsg.includes('model') || errMsg.includes('not found')
            ? `AI model error: ${errMsg}`
            : errMsg
            ? `AI error: ${errMsg}`
            : 'Something went wrong. Please try again.';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorContent, isError: true }
        ]);
      }
    } finally {
      // Safety net: if the stream closed before the 'done' event arrived
      // (e.g. network cut, timeout) but we have streamed text, preserve it.
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

  /* Keep ref in sync with latest sendMessage */
  useEffect(() => { sendMsgRef.current = sendMessage; });

  /* ── Auto-greet: new parent onboarding ───────────────────────────
   * When autoGreet=true + history is empty, call POST /ai/greet.
   * The backend generates the first message via Claude (not saved as a user turn)
   * so the chat opens with the AI speaking first.
   */
  useEffect(() => {
    if (!autoGreet || !historyLoaded || messages.length > 0 || isStreaming) return;

    let cancelled = false;
    async function doGreet() {
      setIsStreaming(true);
      try {
        // Pull signup context if the parent just came through the AI signup flow
        let signupContext = null;
        const raw = localStorage.getItem('gametime_signup_context');
        if (raw) {
          try { signupContext = JSON.parse(raw); } catch { /* ignore */ }
          localStorage.removeItem('gametime_signup_context');
        }

        const res = await fetch(`${API_BASE}/ai/greet`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ signupContext })
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.greeting) {
            setMessages([{ role: 'assistant', content: data.greeting }]);
          }
        }
      } catch {
        // silent fail - parent can chat manually
      } finally {
        if (!cancelled) setIsStreaming(false);
      }
    }

    // Short delay so the section transition looks smooth
    const timer = setTimeout(doGreet, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGreet, historyLoaded]); // intentionally omit messages.length/isStreaming to avoid re-running

  /* ── Keyboard handler ── */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  /* ── Clear history ── */
  async function clearHistory() {
    try {
      await fetch(`${API_BASE}/ai/history`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
    } catch {
      // ignore
    } finally {
      setShowClearConfirm(false);
    }
  }

  /* ── Render ── */
  if (!historyLoaded) {
    return (
      <div className="ai-assistant">
        <div className="ai-loading">
          <span className="ai-typing" aria-label="Loading"><span /><span /><span /></span>
        </div>
      </div>
    );
  }

  const isActive = isStreaming || streamingText || streamingTools.length > 0;

  return (
    <div className="ai-assistant">
      {/* ── Header bar ──────────────────────────────────────────── */}
      <div className="ai-header">
        <div className="ai-header-brand">
          <span className="ai-header-dot" aria-hidden="true" />
          <span className="ai-header-title">Gametime AI</span>
          <span className="ai-header-badge">Beta</span>
        </div>
        <div className="ai-header-actions">
          {messages.length > 0 && !isStreaming && (
            showClearConfirm ? (
              <>
                <span className="ai-confirm-text">Clear all history?</span>
                <button type="button" className="ai-icon-btn danger" onClick={clearHistory}>Yes, clear</button>
                <button type="button" className="ai-icon-btn" onClick={() => setShowClearConfirm(false)}>Cancel</button>
              </>
            ) : (
              <button
                type="button"
                className="ai-icon-btn"
                aria-label="Clear conversation"
                title="Clear conversation"
                onClick={() => setShowClearConfirm(true)}
              >
                <TrashIcon />
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────── */}
      <div className="ai-messages" role="log" aria-live="polite" aria-atomic="false">
        {messages.length === 0 && !isActive && (
          <EmptyState parentName={parentName} />
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {isActive && (
          <StreamingBubble text={streamingText} toolEvents={streamingTools} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────────── */}
      <div className="ai-input-bar">
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about Gametime…"
          disabled={isStreaming}
          rows={1}
          aria-label="Message input"
        />
        <button
          type="button"
          className="ai-send-btn"
          onClick={() => sendMessage()}
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
