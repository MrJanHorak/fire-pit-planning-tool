import type { Meta, StoryObj } from '@storybook/react';
import ConfirmDialog from './ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    title: 'Discard snapshot?',
    message:
      'This will remove the selected snapshot from your saved project history.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    tone: 'danger',
    onConfirm: () => undefined,
    onCancel: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Danger: Story = {};

export const DefaultTone: Story = {
  args: {
    title: 'Overwrite project?',
    message:
      'This will replace the current project data with values from the selected snapshot.',
    confirmLabel: 'Overwrite',
    tone: 'default',
  },
};
