import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SafetyWarning } from '../../types';
import SafetyReviewDialog from '../SafetyReviewDialog';

afterEach(cleanup);

const warning = (code: SafetyWarning['code'], message: string): SafetyWarning => ({
  code,
  message,
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>Open safety review</button>
      <SafetyReviewDialog
        open={open}
        action={[warning('overhead-clearance-unverified', 'Verify overhead clearance.')]}
        review={[]}
        information={[warning('mortar-curing-required', 'Follow mortar instructions.')]}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

describe('SafetyReviewDialog', () => {
  it('groups warnings by priority and restores trigger focus after closing', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open safety review' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Design safety review' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Safety items to resolve (1)')).toBeInTheDocument();
    expect(screen.getByText('Planning reminders (1)')).toBeInTheDocument();
    expect(screen.getByText('Verify overhead clearance.')).toBeInTheDocument();
    expect(screen.getByText('Follow mortar instructions.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes with Escape and backdrop click', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open safety review' });
    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps Tab focus inside the dialog', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open safety review' }));
    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });
});
