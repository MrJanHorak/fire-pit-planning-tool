import type { KeyboardEvent } from 'react';

/** Move focus within a horizontal tab list; Enter or Space activates the focused button. */
export function handleTabListKeyDown(event: KeyboardEvent<HTMLElement>): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const current = tabs.indexOf(event.target as HTMLButtonElement);
  if (current < 0 || tabs.length === 0) return;

  event.preventDefault();
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next]?.focus();
}
