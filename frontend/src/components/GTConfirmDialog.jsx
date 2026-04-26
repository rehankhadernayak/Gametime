import GTGlassModal from './GTGlassModal.jsx';

/**
 * Compact glass confirmation for destructive parent actions.
 */
export default function GTConfirmDialog({
  open,
  title,
  description = 'This action cannot be undone. All associated progress will be lost.',
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm Delete',
  confirmBusy = false,
  onCancel,
  onConfirm,
  /** Optional id of element that labels the dialog (for aria-labelledby) */
  titleId = 'gt-confirm-title'
}) {
  if (!open) return null;

  return (
    <GTGlassModal
      panelClassName="gt-confirm-dialog"
      onBackdropClick={onCancel}
      ariaLabelledBy={titleId}
    >
      <div className="gt-confirm-inner">
        <h2 id={titleId} className="gt-confirm-title">
          {title}
        </h2>
        <p className="gt-confirm-desc">{description}</p>
        <div className="gt-confirm-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={confirmBusy}>
            {cancelLabel}
          </button>
          <button type="button" className="gt-confirm-danger-btn" onClick={onConfirm} disabled={confirmBusy}>
            {confirmBusy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </GTGlassModal>
  );
}
