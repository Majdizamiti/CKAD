import Icon from './Icons';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div
        className="modal modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <span className={`modal__icon modal__icon--${tone}`}>
            <Icon name={tone === 'danger' ? 'stop' : 'play'} size={18} />
          </span>
          <div>
            <h2 id="confirm-title">{title}</h2>
            <p id="confirm-description">{description}</p>
          </div>
        </div>
        <div className="modal__actions">
          <button type="button" className="button" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`button ${tone === 'danger' ? 'button--danger' : 'button--primary'}`}
            onClick={onConfirm}
          >
            <Icon name={tone === 'danger' ? 'stop' : 'play'} size={14} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
