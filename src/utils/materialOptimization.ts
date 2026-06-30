import type { MasonryInput, MasonryOutput } from '../types';

export type OptimizationImpact = 'high' | 'medium' | 'low';

export interface MaterialOptimizationSuggestion {
  key: string;
  impact: OptimizationImpact;
  title: string;
  detail: string;
}

export function buildMaterialOptimizationSuggestions(
  input: MasonryInput,
  output: MasonryOutput,
): MaterialOptimizationSuggestion[] {
  const suggestions: MaterialOptimizationSuggestion[] = [];

  if (output.cutPlan.requiresCutting) {
    const minNoCutIn = output.cutPlan.minimumRecommendedInnerDiameterIn;
    suggestions.push({
      key: 'wall-no-cut-diameter',
      impact: 'high',
      title: 'Reduce cutting labor by moving toward a no-cut diameter',
      detail:
        input.planShape === 'circular'
          ? `Current geometry requires taper cuts. Moving inner diameter toward ~${minNoCutIn.toFixed(1)} in can reduce saw time and cut waste.`
          : 'Current geometry requires taper cuts. A slight increase in inside span can reduce cut frequency and material waste.',
    });
  }

  if (output.capstone.requiresTaperCutting && input.capstoneOverhangIn > 1.5) {
    suggestions.push({
      key: 'cap-overhang',
      impact: 'medium',
      title: 'Trim capstone overhang to reduce cap waste',
      detail: `Capstone overhang is ${input.capstoneOverhangIn.toFixed(2)} in. Dropping toward 1.5–2.0 in can reduce tapering and simplify cap layout.`,
    });
  }

  if (
    input.fuelType !== 'wood' &&
    input.linerType === 'fire-brick'
  ) {
    suggestions.push({
      key: 'liner-fuel-match',
      impact: 'medium',
      title: 'Match liner type to fuel strategy',
      detail:
        'Fire-brick liners are durable but often costlier for gas-only pits. A steel ring may reduce cost while preserving thermal protection.',
    });
  }

  if (
    input.fuelType !== 'wood' &&
    output.ventSpec.recommendedAreaMaxSqIn !== undefined &&
    output.ventSpec.totalOpenAreaSqIn > output.ventSpec.recommendedAreaMinSqIn + 8
  ) {
    suggestions.push({
      key: 'vent-area-right-size',
      impact: 'low',
      title: 'Right-size vent area',
      detail: `Current vent area is ${output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in. Tightening closer to the minimum recommended range can reduce extra cutting.`,
    });
  }

  if ((input.seatingAreaRadiusFt ?? 0) > 10) {
    suggestions.push({
      key: 'seating-footprint',
      impact: 'low',
      title: 'Shrink seating radius to reduce surface material',
      detail:
        'Seating radius is above 10 ft. Reducing by 1 ft can materially lower gravel/paver surface quantities while keeping the same layout concept.',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      key: 'already-efficient',
      impact: 'low',
      title: 'Layout is already near a material-efficient baseline',
      detail:
        'No major optimization flags were detected. Focus on supplier pricing and delivery bundling for additional savings.',
    });
  }

  return suggestions;
}
