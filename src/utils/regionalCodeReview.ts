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
    key: 'general-clearance',
    title: 'General clearance screening',
    status: input.proximityToStructuresFt >= 10 ? 'pass' : 'fail',
    detail:
      input.proximityToStructuresFt >= 10
        ? `Configured at ${input.proximityToStructuresFt.toFixed(1)} ft. Meets the U.S. Fire Administration's general 10 ft advice for fire pits. Local rules and product instructions may require more.`
        : `Configured at ${input.proximityToStructuresFt.toFixed(1)} ft. Below the U.S. Fire Administration's general 10 ft advice for fire pits. Check local rules and product instructions.`,
  });

  const overheadClearanceFt = input.overheadClearanceFt ?? 20;
  const recommendedOverheadClearanceFt = input.fuelType === 'wood' ? 21 : 15;
  checks.push({
    key: 'vertical-clearance',
    title: 'Overhead clearance to combustibles',
    status: overheadClearanceFt >= recommendedOverheadClearanceFt ? 'pass' : 'review',
    detail:
      overheadClearanceFt >= recommendedOverheadClearanceFt
        ? `Configured at ${overheadClearanceFt.toFixed(1)} ft, above the model's ${recommendedOverheadClearanceFt} ft review marker. Verify overhead combustibles, local rules, and product instructions.`
        : `Configured at ${overheadClearanceFt.toFixed(1)} ft, below the model's ${recommendedOverheadClearanceFt} ft review marker. Verify overhead combustibles, local rules, and product instructions.`,
  });

  if (input.fuelType !== 'wood') {
    const min = output.ventSpec.recommendedAreaMinSqIn;
    const max = output.ventSpec.recommendedAreaMaxSqIn;
    const ventArea = output.ventSpec.totalOpenAreaSqIn;
    checks.push({
      key: 'gas-venting-screen',
      title: 'Fuel-gas vent area check',
      status:
        ventArea < min ? 'fail' : max !== undefined && ventArea > max ? 'review' : 'pass',
      detail:
        ventArea < min
          ? `Current vent area is ${ventArea.toFixed(1)} sq in, below the selected equipment template's ${min.toFixed(1)} sq in planning minimum. Verify manufacturer instructions.`
          : max !== undefined && ventArea > max
            ? `Current vent area is ${ventArea.toFixed(1)} sq in, above ${max.toFixed(1)} sq in. Verify local gas appliance requirements.`
            : `Current vent area is ${ventArea.toFixed(1)} sq in and within the selected equipment template's planning range. Verify manufacturer instructions.`,
    });
  }

  const frostLineDepthIn = Math.max(0, input.frostLineDepthIn ?? 0);
  const hasFreezeContext = Boolean(input.frostClimate) || frostLineDepthIn > 0;
  checks.push({
    key: 'frost-line',
    title: 'Frost-line compatibility',
    status: 'review',
    detail: !hasFreezeContext
      ? 'Local frost conditions are not confirmed. Enter site information and verify whether frost-protected footing design is needed.'
      : frostLineDepthIn <= 0
        ? 'Freeze-thaw climate is enabled but local frost-line depth is missing. Obtain site-specific footing guidance.'
        : `Entered frost line: ${frostLineDepthIn.toFixed(0)} in. The modeled ${output.foundation.stoneDepthIn.toFixed(0)} in stone layer is a quantity estimate, not a frost footing depth; obtain site-specific footing guidance.`,
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
