import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '../ConfirmDialog';

afterEach(() => {
  cleanup();
});

describe('ConfirmDialog', () => {
  it('renders confirm dialog content and triggers callbacks', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title='Delete Snapshot'
        message='Delete the selected snapshot?'
        confirmLabel='Delete'
        tone='danger'
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Snapshot')).toBeInTheDocument();
    expect(
      screen.getByText('Delete the selected snapshot?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('focuses cancel by default and dismisses on Escape or backdrop click', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { container } = render(
      <ConfirmDialog
        open
        title='Overwrite Snapshot'
        message='Replace the selected snapshot?'
        confirmLabel='Overwrite'
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title='Hidden'
        message='Hidden'
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
