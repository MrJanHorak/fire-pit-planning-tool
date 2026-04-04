import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import ConstructionMode from '../ConstructionMode';

const baseInput: MasonryInput = {
  planShape: 'circular',
  innerDiameterIn: 36,
  innerWidthIn: 36,
  innerDepthIn: 30,
  wallHeightIn: 18,
  proximityToStructuresFt: 12,
  fuelType: 'propane',
  linerType: 'steel-ring',
  expansionGapIn: 0.5,
  mortarJointIn: 0.375,
  orientation: 'stretcher',
  bondPattern: 'running-bond',
  ventCount: 4,
  ventOpeningAreaSqIn: 5,
  gasLineEntryAngleDeg: 225,
  capstoneOverhangIn: 2,
  capPlacementMode: 'outward-only',
  soilType: 'clay-expansive',
  drainageCondition: 'slow-draining',
  frostClimate: true,
  capstonePresetKey: 'matching',
};

describe('ConstructionMode', () => {
  beforeEach(() => {
    // Reset persisted tab state so each test starts on the default 'layout' tab.
    window.localStorage.removeItem(
      'firepit-parametric-masonry-designer-construction-tab',
    );
  });

  it('renders site guidance with foundation review state and liner venting note', () => {
    const output = new MasonryEngine().calculateDesign(baseInput);

    render(<ConstructionMode input={baseInput} output={output} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Site Guidance' }));

    expect(
      screen.getByRole('heading', { name: 'Site Guidance' }),
    ).toBeInTheDocument();
    expect(screen.getByText('high foundation review')).toBeInTheDocument();
    expect(screen.getByText('Review scale')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Why this foundation review level was assigned'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Liner venting note:/)).toBeInTheDocument();
    expect(screen.getByText(/clay-expansive soil/i)).toBeInTheDocument();
    expect(screen.getByText(/slow-draining drainage/i)).toBeInTheDocument();
    expect(screen.getByText(/freeze-thaw climate/i)).toBeInTheDocument();
  });

  it('shows strategy summary when vented accent courses are enabled', () => {
    const accentInput: MasonryInput = {
      ...baseInput,
      wallCourseStrategy: 'vented-accent',
      accentCycleLength: 3,
      accentCoursePosition: 2,
    };
    const output = new MasonryEngine().calculateDesign(accentInput);

    render(<ConstructionMode input={accentInput} output={output} />);

    expect(
      screen.getByText(/Vented accent strategy is active/i),
    ).toBeInTheDocument();
  });
});
