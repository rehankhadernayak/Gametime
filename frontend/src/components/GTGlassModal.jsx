/**
 * Base glass-styled modal overlay + panel. Used by AssignQuestModal and GTConfirmDialog.
 */
export default function GTGlassModal({
  children,
  className = '',
  panelClassName = '',
  onBackdropClick,
  ariaLabel = 'Dialog',
  ariaLabelledBy,
  ariaDescribedBy
}) {
  return (
    <div
      className={`gt-glass-modal-overlay${className ? ` ${className}` : ''}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.();
      }}
    >
      <div
        className={`gt-glass-modal-panel ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
