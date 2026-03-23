import type { MasonryInput, MasonryOutput } from '../types';

export type FoundationRisk = 'low' | 'moderate' | 'high';

export interface FoundationAdvisory {
  risk: FoundationRisk;
  heading: string;
  checks: string[];
}

export function buildFoundationAdvisory(
  input: MasonryInput,
  output: MasonryOutput,
): FoundationAdvisory {
  const soilType = input.soilType ?? 'unknown';
  const drainageCondition = input.drainageCondition ?? 'unknown';
  const frostClimate = input.frostClimate ?? false;
  const footprintDiameterIn = output.foundation.footprintDiameterIn;
  const largeFootprint = footprintDiameterIn >= 72;
  const veryLargeFootprint = footprintDiameterIn >= 96;
  const poorSoil =
    soilType === 'clay-expansive' || soilType === 'organic-or-fill';
  const cautionSoil =
    soilType === 'silty' || soilType === 'sandy' || soilType === 'unknown';
  const poorDrainage =
    drainageCondition === 'poor-drainage' ||
    drainageCondition === 'slow-draining';
  const unknownDrainage = drainageCondition === 'unknown';
  const frostSensitive = frostClimate && soilType !== 'dense-granular';

  if (poorSoil || poorDrainage || veryLargeFootprint || frostSensitive) {
    return {
      risk: 'high',
      heading: 'High foundation review priority',
      checks: [
        'Keep the engineering baseline at 8 in compacted angular stone in the app output, but treat this site as requiring a footing review before construction.',
        'Expansive clay, organic fill, slow drainage, or freeze-thaw exposure can move the base seasonally. Consider over-excavation, stabilization, drainage improvement, or a concrete footing detail approved for the site.',
        'Verify runoff control, finished grade, and frost exposure before finalizing the build packet or ordering full materials.',
      ],
    };
  }

  if (largeFootprint || cautionSoil || unknownDrainage || frostClimate) {
    return {
      risk: 'moderate',
      heading: 'Moderate foundation review priority',
      checks: [
        'Use the baseline 8 in compacted angular stone plus the 6 in-per-side footprint extension as the default starting point.',
        'For larger pits, variable soils, or cold climates, validate compaction and check whether local practice calls for a deeper excavation band or additional drainage control.',
        'If the subgrade is uncertain, add a pre-build site review before final material ordering.',
      ],
    };
  }

  return {
    risk: 'low',
    heading: 'Baseline foundation profile',
    checks: [
      'Current inputs are compatible with the baseline foundation model: 8 in compacted angular stone and footprint +12 in overall width/depth.',
      'Maintain even compaction across the full footprint and protect base elevation during layout and first-course setting.',
      'If drainage performance changes on site, escalate this layout to moderate review priority before building.',
    ],
  };
}
