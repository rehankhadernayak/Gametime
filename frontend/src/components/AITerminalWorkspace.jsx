/**
 * AI Terminal Workspace Component
 * Terminal-style chat interface for parent insights
 * Green monospace text, command input, streaming responses
 */

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { createTextScramble } from '../utils/gsapConfig.js';

/**
 * AITerminalWorkspace
 *
 * @param {string} parentId - Parent ID for context
 * @param {Function} onCommand - Callback(command) - process terminal command
 * @param {boolean} defaultMinimized - Start minimized (default: false)
 */
export function AITerminalWorkspace({
  parentId,
  onCommand = () => {},
  defaultMinimized = false,
}) {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [messages, setMessages] = useState([
    {
      type: 'system',
      text: 'Gametime AI Terminal v1.0',
      timestamp: new Date(),
    },
    {
      type: 'system',
      text: 'Type !help for available commands',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const outputRef = useRef(null);
  const lastMessageRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (outputRef.current) {
      gsap.to(outputRef.current, {
        scrollTo: { y: 'max' },
        duration: 0.3,
        ease: 'power1.inOut',
      });
    }
  }, [messages]);

  // Text scramble animation on new system message
  useEffect(() => {
    if (lastMessageRef.current && messages.length > 2) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.type === 'system' && !lastMsg.animated) {
        try {
          createTextScramble(lastMessageRef.current, lastMsg.text, 1.5);
        } catch (e) {
          // Graceful fallback if GSAP fails
        }
      }
    }
  }, [messages]);

  const handleCommand = (command) => {
    if (!command.trim()) return;

    // Add user message
    const userMsg = {
      type: 'user',
      text: command,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    // Simulate command processing
    setTimeout(() => {
      let response = '';

      if (command.startsWith('!help')) {
        response =
          'Available commands: !insights, !child [name], !recommend, !clear, !suggest-tasks';
      } else if (command.startsWith('!insights')) {
        response =
          'Weekly Insights: 78% task completion rate, 5 hour average daily screen time, streaks are strongest Mon-Wed.';
      } else if (command.startsWith('!child')) {
        response =
          'Child Dashboard up. Ready to view specific child details. Use !child [name] for filtering.';
      } else if (command.startsWith('!recommend')) {
        response =
          'Top recommendation: Increase weekend tasks to balance screen time. Current RP pool: 2,450.';
      } else if (command.startsWith('!clear')) {
        setMessages([
          {
            type: 'system',
            text: 'Terminal cleared',
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
        return;
      } else if (command.startsWith('!suggest-tasks')) {
        response =
          'Suggested tasks: Practice piano (30min), Organize backpack (15min), Read chapter (20min). Estimated RP: 90.';
      } else {
        response =
          'Command not recognized. Type !help for available commands.';
      }

      const sysMsg = {
        type: 'system',
        text: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, sysMsg]);
      setIsProcessing(false);
      onCommand(command);
    }, 600);
  };

  if (isMinimized) {
    return (
      <div className="ai-terminal-workspace" style={{ minHeight: 'auto' }}>
        <button
          className="terminal-minimize-btn"
          onClick={() => setIsMinimized(false)}
          aria-label="Expand terminal"
          style={{
            width: '100%',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '12px',
          }}
        >
          ⬆ AI Terminal
        </button>
      </div>
    );
  }

  return (
    <div className="ai-terminal-workspace">
      {/* Header */}
      <div className="terminal-header">
        <div className="terminal-title">AI Terminal</div>
        <button
          className="terminal-minimize-btn"
          onClick={() => setIsMinimized(true)}
          aria-label="Minimize terminal"
          title="Minimize"
        >
          −
        </button>
      </div>

      {/* Output */}
      <div className="terminal-output" ref={outputRef} role="log" aria-live="polite">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            ref={idx === messages.length - 1 ? lastMessageRef : null}
            className={`terminal-message ${msg.type}`}
            style={{
              animation:
                idx === messages.length - 1
                  ? 'text-appear 0.5s ease'
                  : 'none',
            }}
          >
            {msg.text}
          </div>
        ))}

        {isProcessing && (
          <div className="terminal-message system">
            <span className="terminal-cursor" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="terminal-input-line">
        <span className="terminal-prompt">$</span>
        <input
          className="terminal-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommand(inputValue);
          }}
          placeholder="Enter command..."
          disabled={isProcessing}
          aria-label="Terminal input"
        />
      </div>
    </div>
  );
}

export default AITerminalWorkspace;
