import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { SafetyWarning } from '../types';
import { useModalFocus } from './useModalFocus';

interface SafetyReviewDialogProps {
  open: boolean;
  action: SafetyWarning[];
  review: SafetyWarning[];
  information: SafetyWarning[];
  onClose: () => void;
}

export default function SafetyReviewDialog({
  open,
  action,
  review,
  information,
  onClose,
}: SafetyReviewDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalFocus(open, dialogRef, closeRef, onClose);

  if (!open) return null;

  const groups = [
    { label: 'Safety items to resolve', items: action },
    { label: 'Design advisories to review', items: review },
    { label: 'Planning reminders', items: information },
  ];

  return createPortal(
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 sm:p-6'
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby='safety-dialog-title'
        aria-describedby='safety-dialog-description'
        tabIndex={-1}
        className='w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-amber-900/25 bg-amber-50 p-5 text-amber-950 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6'
      >
        <div className='flex items-start justify-between gap-4'>
          <h2 id='safety-dialog-title' className='text-xl font-bold'>
            Design safety review
          </h2>
          <button
            ref={closeRef}
            type='button'
            className='shrink-0 rounded-full border border-amber-900/30 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950'
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p id='safety-dialog-description' className='mt-3 text-sm leading-6'>
          This is a planning screen, not a code approval or engineering sign-off.
          Confirm local rules, manufacturer instructions, and site conditions before building.
        </p>
        {groups.map(({ label, items }) => items.length > 0 && (
          <section key={label} className='mt-5'>
            <h3 className='text-base font-bold'>{label} ({items.length})</h3>
            <ul className='mt-2 list-disc space-y-2 pl-5 text-sm leading-6'>
              {items.map((warning) => <li key={warning.code}>{warning.message}</li>)}
            </ul>
          </section>
        ))}
        {groups.every(({ items }) => items.length === 0) && (
          <p className='mt-5 text-sm'>No modeled warnings for this configuration.</p>
        )}
      </section>
    </div>,
    document.body,
  );
}
