import type { MasonryInput, MasonryOutput } from '../types';

export type RegionalCheckStatus = 'pass' | 'review' | 'fail';

export interface RegionalCodeCheck {
  key: string;
  title: string;
  status: RegionalCheckStatus;
  detail: string;
}

export interface RegionalCodeReview {
  overallStatus: RegionalCheckStatus;
  checks: RegionalCodeCheck[];
}

function worstStatus(statuses: RegionalCheckStatus[]): RegionalCheckStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('review')) return 'review';
  return 'pass';
}

export function buildRegionalCodeReview(
  input: MasonryInput,
  output: MasonryOutput,
): RegionalCodeReview {
  const checks: RegionalCodeCheck[] = [];

  checks.push({
    key: 'ibc-clearance',
    title: 'IBC setback to combustibles',
    status: input.proximityToStructuresFt >= 10 ? 'pass' : 'fail',
    detail:
      input.proximityToStructuresFt >= 10
        ? `Configured at ${input.proximityToStructuresFt.toFixed(1)} ft (minimum target: 10 ft).`
        : `Configured at ${input.proximityToStructuresFt.toFixed(1)} ft. Increase to at least 10 ft.`,
  });

  if (input.fuelType !== 'wood') {
    const min = output.ventSpec.recommendedAreaMinSqIn;
    const max = output.ventSpec.recommendedAreaMaxSqIn;
    const ventArea = output.ventSpec.totalOpenAreaSqIn;
    checks.push({
      key: 'ibc-gas-venting',
      title: 'Fuel-gas vent area check',
      status:
        ventArea < min ? 'fail' : max !== undefined && ventArea > max ? 'review' : 'pass',
      detail:
        ventArea < min
          ? `Current vent area is ${ventArea.toFixed(1)} sq in, below the ${min.toFixed(1)} sq in minimum.`
          : max !== undefined && ventArea > max
            ? `Current vent area is ${ventArea.toFixed(1)} sq in, above ${max.toFixed(1)} sq in. Verify local gas appliance requirements.`
            : `Current vent area is ${ventArea.toFixed(1)} sq in and within recommended range.`,
    });
  }

  const frostLineDepthIn = Math.max(0, input.frostLineDepthIn ?? 0);
  const hasFreezeContext = Boolean(input.frostClimate) || frostLineDepthIn > 0;
  checks.push({
    key: 'frost-line',
    title: 'Frost-line compatibility',
    status: !hasFreezeContext
      ? 'review'
      : frostLineDepthIn <= 0
        ? 'review'
        : frostLineDepthIn > output.foundation.stoneDepthIn
          ? 'review'
          : 'pass',
    detail: !hasFreezeContext
      ? 'Freeze-thaw was not enabled and local frost-line depth is not set. Add local value for a complete cold-climate review.'
      : frostLineDepthIn <= 0
        ? 'Freeze-thaw climate is enabled but frost-line depth is missing.'
        : frostLineDepthIn > output.foundation.stoneDepthIn
          ? `Local frost line (${frostLineDepthIn.toFixed(0)} in) exceeds modeled stone depth (${output.foundation.stoneDepthIn.toFixed(0)} in). Local footing detailing review is recommended.`
          : `Local frost line (${frostLineDepthIn.toFixed(0)} in) is within current baseline depth assumptions.`,
  });

  const hoaLevel = input.hoaConstraintLevel ?? 'unknown';
  const profile = input.regionalCodeProfile ?? 'ibc-general';
  checks.push({
    key: 'hoa-rules',
    title: 'HOA / neighborhood constraints',
    status:
      hoaLevel === 'strict'
        ? 'review'
        : hoaLevel === 'typical'
          ? 'review'
          : hoaLevel === 'none'
            ? 'pass'
            : 'review',
    detail:
      hoaLevel === 'strict'
        ? `Strict HOA mode selected. Submit this design for pre-approval (fuel type: ${input.fuelType}, footprint: ${(output.foundation.footprintWidthIn / 12).toFixed(1)} ft × ${(output.foundation.footprintDepthIn / 12).toFixed(1)} ft).`
        : hoaLevel === 'typical'
          ? 'Typical HOA mode selected. Confirm setback, smoke, and material/finish limits before ordering.'
          : hoaLevel === 'none'
            ? 'No HOA constraints selected.'
            : `HOA level is unknown. Confirm local neighborhood restrictions for profile: ${profile}.`,
  });

  if (profile === 'wui-high-risk' && input.fuelType === 'wood') {
    checks.push({
      key: 'wui-fuel',
      title: 'WUI high-risk fuel restriction',
      status: 'review',
      detail:
        'Wood fuel in a high wildfire-risk profile may trigger seasonal burn restrictions. Confirm local fire district rules and consider gas fuel if required.',
    });
  }

  return {
    overallStatus: worstStatus(checks.map((c) => c.status)),
    checks,
  };
}
