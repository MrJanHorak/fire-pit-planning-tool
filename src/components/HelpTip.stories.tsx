import type { Meta, StoryObj } from '@storybook/react';
import HelpTip from './HelpTip';

const meta: Meta<typeof HelpTip> = {
  title: 'Components/HelpTip',
  component: HelpTip,
  tags: ['autodocs'],
  args: {
    label: 'About wall height',
    children:
      'Wall height is measured from the finished grade to the top of the cap course.',
  },
};

export default meta;
type Story = StoryObj<typeof HelpTip>;

export const Default: Story = {};

export const LongContent: Story = {
  args: {
    label: 'About vent strategy',
    children:
      'Propane vents should be near the base, while natural gas vents should be near upper courses. Keep vent area within the recommended range to maintain airflow and safe fuel behavior.',
  },
};
