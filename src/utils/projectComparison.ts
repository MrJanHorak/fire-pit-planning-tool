import type { MasonryInput, MasonryOutput } from '../types';

export interface ProjectComparisonMetric {
  key: string;
  label: string;
  leftValue: string;
  rightValue: string;
  delta?: string;
}

function fmtSigned(value: number, decimals = 1, unit = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
}

export function buildProjectComparisonMetrics(
  leftInput: MasonryInput,
  leftOutput: MasonryOutput,
  rightInput: MasonryInput,
  rightOutput: MasonryOutput,
): ProjectComparisonMetric[] {
  const leftWeight =
    leftOutput.logistics.estimatedBrickWeightLb +
    leftOutput.logistics.estimatedCapWeightLb +
    leftOutput.logistics.estimatedStoneWeightLb;
  const rightWeight =
    rightOutput.logistics.estimatedBrickWeightLb +
    rightOutput.logistics.estimatedCapWeightLb +
    rightOutput.logistics.estimatedStoneWeightLb;

  return [
    {
      key: 'shape',
      label: 'Plan Shape',
      leftValue: leftOutput.planShape,
      rightValue: rightOutput.planShape,
    },
    {
      key: 'inner-span',
      label: 'Inner Opening',
      leftValue: `${leftOutput.innerSpanWidthIn.toFixed(1)} x ${leftOutput.innerSpanDepthIn.toFixed(1)} in`,
      rightValue: `${rightOutput.innerSpanWidthIn.toFixed(1)} x ${rightOutput.innerSpanDepthIn.toFixed(1)} in`,
    },
    {
      key: 'wall-height',
      label: 'Wall Height',
      leftValue: `${leftInput.wallHeightIn.toFixed(1)} in`,
      rightValue: `${rightInput.wallHeightIn.toFixed(1)} in`,
      delta: fmtSigned(rightInput.wallHeightIn - leftInput.wallHeightIn, 1, 'in'),
    },
    {
      key: 'total-units',
      label: 'Total Wall Units',
      leftValue: `${leftOutput.totalUnits}`,
      rightValue: `${rightOutput.totalUnits}`,
      delta: fmtSigned(rightOutput.totalUnits - leftOutput.totalUnits, 0, 'units'),
    },
    {
      key: 'cap-units',
      label: 'Cap Units / Course',
      leftValue: `${leftOutput.capstone.capUnitsPerCourseRounded}`,
      rightValue: `${rightOutput.capstone.capUnitsPerCourseRounded}`,
      delta: fmtSigned(
        rightOutput.capstone.capUnitsPerCourseRounded -
          leftOutput.capstone.capUnitsPerCourseRounded,
        0,
        'units',
      ),
    },
    {
      key: 'vent-area',
      label: 'Total Vent Area',
      leftValue: `${leftOutput.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in`,
      rightValue: `${rightOutput.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in`,
      delta: fmtSigned(
        rightOutput.ventSpec.totalOpenAreaSqIn -
          leftOutput.ventSpec.totalOpenAreaSqIn,
        1,
        'sq in',
      ),
    },
    {
      key: 'foundation',
      label: 'Foundation Gravel',
      leftValue: `${leftOutput.foundation.stoneVolumeCubicYards.toFixed(2)} yd3`,
      rightValue: `${rightOutput.foundation.stoneVolumeCubicYards.toFixed(2)} yd3`,
      delta: fmtSigned(
        rightOutput.foundation.stoneVolumeCubicYards -
          leftOutput.foundation.stoneVolumeCubicYards,
        2,
        'yd3',
      ),
    },
    {
      key: 'mortar',
      label: 'Mortar Volume',
      leftValue: `${leftOutput.logistics.estimatedMortarVolumeCubicFeet.toFixed(1)} ft3`,
      rightValue: `${rightOutput.logistics.estimatedMortarVolumeCubicFeet.toFixed(1)} ft3`,
      delta: fmtSigned(
        rightOutput.logistics.estimatedMortarVolumeCubicFeet -
          leftOutput.logistics.estimatedMortarVolumeCubicFeet,
        1,
        'ft3',
      ),
    },
    {
      key: 'weight',
      label: 'Estimated Material Weight',
      leftValue: `${Math.round(leftWeight).toLocaleString()} lb`,
      rightValue: `${Math.round(rightWeight).toLocaleString()} lb`,
      delta: fmtSigned(rightWeight - leftWeight, 0, 'lb'),
    },
    {
      key: 'warnings',
      label: 'Safety Warnings',
      leftValue: `${leftOutput.warnings.length}`,
      rightValue: `${rightOutput.warnings.length}`,
      delta: fmtSigned(
        rightOutput.warnings.length - leftOutput.warnings.length,
        0,
        '',
      ),
    },
  ];
}
