import { useRef } from 'react';
import { useModalFocus } from './useModalFocus';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  useModalFocus(open, dialogRef, cancelButtonRef, onCancel);

  if (!open) {
    return null;
  }

  const confirmButtonClass =
    tone === 'danger'
      ? 'bg-red-700 text-red-50 hover:bg-red-800'
      : 'bg-amber-900 text-amber-50 hover:bg-amber-950';

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='confirm-dialog-title'
        tabIndex={-1}
        className='w-full max-w-md rounded-2xl border border-amber-900/20 bg-amber-50 p-5 shadow-2xl'
      >
        <h2
          id='confirm-dialog-title'
          className='text-lg font-semibold text-amber-950'
        >
          {title}
        </h2>
        <p className='mt-2 text-sm leading-6 text-amber-950/80'>{message}</p>
        <div className='mt-4 flex justify-end gap-2'>
          <button
            ref={cancelButtonRef}
            type='button'
            className='rounded-full border border-amber-900/20 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-50'
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type='button'
            className={`rounded-full px-4 py-2 text-sm font-semibold ${confirmButtonClass}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
