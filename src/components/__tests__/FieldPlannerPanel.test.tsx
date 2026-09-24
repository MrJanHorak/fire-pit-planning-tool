import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import { DEFAULT_MASONRY_INPUT } from '../../utils/defaultInput';
import FieldPlannerPanel from '../FieldPlannerPanel';

describe('Field Planner share code', () => {
  beforeEach(() => localStorage.clear());

  it('renders the share QR locally without an external image request', () => {
    const output = new MasonryEngine().calculateDesign(DEFAULT_MASONRY_INPUT);
    const { container } = render(
      <FieldPlannerPanel
        input={DEFAULT_MASONRY_INPUT}
        output={output}
        projectName='Test pit'
      />,
    );

    expect(screen.getByTitle('QR code for current project share link')).toBeInTheDocument();
    expect(container.querySelector('img[src*="qrserver.com"]')).toBeNull();
  });
});
