import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  it('renders site guidance with foundation review state and liner venting note', () => {
    const output = new MasonryEngine().calculateDesign(baseInput);

    render(<ConstructionMode input={baseInput} output={output} />);

    expect(screen.getByText('Site Guidance')).toBeInTheDocument();
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
});
