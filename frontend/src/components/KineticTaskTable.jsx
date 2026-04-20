/**
 * Kinetic Task Table Component
 * Compact task list with expand animations
 * Expandable rows show evidence grid, description, approval buttons
 */

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * KineticTaskTable - Main table component
 *
 * @param {Array} tasks - Task array: [{ id, title, description, status, evidence, RPValue, childName }]
 * @param {Function} onApprove - Callback(taskId)
 * @param {Function} onReject - Callback(taskId)
 * @param {Function} onViewEvidence - Callback(evidenceUrl)
 */
export function KineticTaskTable({
  tasks = [],
  onApprove = () => {},
  onReject = () => {},
  onViewEvidence = () => {},
}) {
  const [expandedId, setExpandedId] = useState(null);

  const getStatusBadgeClass = (status) => {
    if (status === 'approved') return 'approved';
    if (status === 'pending') return 'pending';
    return 'resubmit';
  };

  return (
    <div className="kinetic-task-table">
      {/* Header */}
      <div className="task-table-header">
        <div>Task</div>
        <div>Status</div>
        <div>RP</div>
        <div />
      </div>

      {/* Rows */}
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          isExpanded={expandedId === task.id}
          onToggle={() =>
            setExpandedId(expandedId === task.id ? null : task.id)
          }
          onApprove={() => onApprove(task.id)}
          onReject={() => onReject(task.id)}
          onViewEvidence={onViewEvidence}
          getStatusBadgeClass={getStatusBadgeClass}
        />
      ))}

      {tasks.length === 0 && (
        <div
          style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          No tasks pending review
        </div>
      )}
    </div>
  );
}

/**
 * TaskRow - Individual expandable task row
 */
function TaskRow({
  task,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  onViewEvidence,
  getStatusBadgeClass,
}) {
  const rowRef = useRef(null);
  const detailsRef = useRef(null);

  // Expand/collapse animation
  useEffect(() => {
    if (!rowRef.current) return;

    if (isExpanded) {
      gsap.to(rowRef.current, {
        minHeight: 'auto',
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
      });

      if (detailsRef.current) {
        gsap.from(detailsRef.current, {
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: 'power2.out',
          delay: 0.1,
        });
      }
    } else {
      gsap.to(rowRef.current, {
        minHeight: '60px',
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  }, [isExpanded]);

  return (
    <div
      ref={rowRef}
      className={`task-row ${isExpanded ? 'expanded' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle();
      }}
      aria-expanded={isExpanded}
    >
      {/* Title & Child */}
      <div>
        <div className="task-title">{task.title}</div>
        {task.childName && (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.4)',
              marginTop: '0.25rem',
            }}
          >
            {task.childName}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div>
        <span className={`task-status-badge ${getStatusBadgeClass(task.status)}`}>
          {task.status === 'approved' ? '✓ ' : ''}
          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
        </span>
      </div>

      {/* RP Value */}
      <div className="task-rp-value">+{task.RPValue || 0}</div>

      {/* Expand Arrow */}
      <div className="task-expand-arrow">▼</div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div
          ref={detailsRef}
          className="task-details"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Description */}
          <div className="task-description">
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              Description
            </div>
            <p style={{ margin: 0 }}>{task.description}</p>
          </div>

          {/* Evidence Grid */}
          <div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              Evidence ({task.evidence?.length || 0})
            </div>
            <div className="task-evidence-preview">
              {task.evidence && task.evidence.length > 0 ? (
                task.evidence.map((url, idx) => (
                  <div
                    key={idx}
                    className="evidence-thumb"
                    onClick={() => onViewEvidence(url)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onViewEvidence(url);
                    }}
                  >
                    {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={url} alt={`Evidence ${idx + 1}`} />
                    ) : (
                      <video src={url} />
                    )}
                  </div>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.85rem',
                    padding: '1rem',
                    textAlign: 'center',
                  }}
                >
                  No evidence uploaded
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {task.status !== 'approved' && (
            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                gap: '0.75rem',
                marginTop: '0.75rem',
              }}
            >
              <button
                onClick={onApprove}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #00ff41, #00cc33)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.9rem',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow =
                    '0 10px 30px rgba(0, 255, 65, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'none';
                  e.target.style.boxShadow = 'none';
                }}
              >
                ✓ Approve
              </button>
              <button
                onClick={onReject}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'transparent',
                  color: 'var(--neon-blue)',
                  border: '2px solid var(--neon-blue)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.9rem',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0, 217, 255, 0.1)';
                  e.target.style.boxShadow =
                    '0 10px 30px rgba(0, 217, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Resubmit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KineticTaskTable;
