import type { MasonryInput, SafetyWarning, VentSpec } from '../types';

const BREEO_SOURCE = 'https://breeo.com/products/x-series-insert-ring';
const AFG_SOURCE = 'https://americanfireglass.com/media/manual/Match%20Light%20Kits.pdf';

export const BREEO_INSERT_RINGS = {
  'breeo-x19': { label: 'Breeo X19 + X Series Insert Ring', minOpeningIn: 22, maxOpeningIn: 26 },
  'breeo-x24': { label: 'Breeo X24 + X Series Insert Ring', minOpeningIn: 27, maxOpeningIn: 33 },
  'breeo-x30': { label: 'Breeo X30 + X Series Insert Ring', minOpeningIn: 34, maxOpeningIn: 39 },
} as const;

export const AFG_MATCH_LIGHT = {
  label: 'American Fire Glass Match Light Kit (gas)',
  sourceUrl: AFG_SOURCE,
  sourceRevision: 'AFG-INST-012_REVB_08/18',
  minOpposingVentAreaSqInEach: 18,
} as const;

export interface ManufacturerReview {
  label: string;
  sourceUrl: string;
  sourceRevision: string;
  reviewedOn: string;
  requirements: string[];
  findings: string[];
  warnings: SafetyWarning[];
}

/** Only checks quantities the planner actually knows. Free vent area and bearing remain field checks. */
export function buildManufacturerReview(
  input: MasonryInput,
  ventSpec: VentSpec,
): ManufacturerReview | null {
  const reviewedOn = '2026-09-28';

  if (input.fuelType === 'wood' && input.smokelessMode) {
    const key = input.smokelessInsertPreset;
    if (key && key in BREEO_INSERT_RINGS) {
      const profile = BREEO_INSERT_RINGS[key as keyof typeof BREEO_INSERT_RINGS];
      const openingIn = input.innerDiameterIn;
      const circular = input.planShape === 'circular';
      const openingInRange =
        circular && openingIn >= profile.minOpeningIn && openingIn <= profile.maxOpeningIn;
      const findings = [
        circular
          ? `Entered circular opening: ${openingIn.toFixed(2)} in — ${openingInRange ? 'within' : 'outside'} the published ${profile.minOpeningIn}–${profile.maxOpeningIn} in range.`
          : 'The published opening range is for a circular surround; this shape has no verified fit.',
        'Surround depth is not independently measured by the planner. Wall height alone does not establish the published minimum depth.',
      ];
      const warnings: SafetyWarning[] = [{
        code: 'manufacturer-product-review-required',
        message: `${profile.label}: verify a ${profile.minOpeningIn}–${profile.maxOpeningIn} in circular opening and at least 15 in surround depth against the current manufacturer instructions. Fit and structural support are not approved by this planner. Source: ${BREEO_SOURCE}`,
      }];
      if (!openingInRange) {
        warnings.push({
          code: 'manufacturer-surround-opening-out-of-range',
          message: circular
            ? `${profile.label}: entered ${openingIn.toFixed(2)} in opening is outside the published ${profile.minOpeningIn}–${profile.maxOpeningIn} in range.`
            : `${profile.label}: the published opening range is circular; the selected ${input.planShape} shape has no verified fit.`,
        });
      }
      return {
        label: profile.label,
        sourceUrl: BREEO_SOURCE,
        sourceRevision: 'X Series Insert Ring product specifications',
        reviewedOn,
        requirements: [
          `Circular surround opening ${profile.minOpeningIn}–${profile.maxOpeningIn} in.`,
          'Surround depth at least 15 in; follow the insert-ring instructions for installation and airflow.',
        ],
        findings,
        warnings,
      };
    }
  }

  if (input.fuelType !== 'wood' && input.gasHardwareTemplate === 'afg-match-light') {
    const geometricTotal = ventSpec.totalOpenAreaSqIn;
    const findings = [
      `Modeled total geometric opening: ${geometricTotal.toFixed(1)} sq in. Free area on each opposing side is not measured.`,
      'The planner does not record whether an overhang exists or verify the gas kit SKU and fuel configuration.',
    ];
    const warnings: SafetyWarning[] = [{
      code: 'manufacturer-product-review-required',
      message: `${AFG_MATCH_LIGHT.label}: the manual calls for two opposing enclosure vents of at least 18 sq in each and prohibits operation under an overhang. Verify free area per side, the exact kit, and installation with a qualified gas professional. Source: ${AFG_SOURCE}`,
    }];
    if (ventSpec.openingAreaSqIn < AFG_MATCH_LIGHT.minOpposingVentAreaSqInEach) {
      warnings.push({
        code: 'manufacturer-vent-geometric-deficit',
        message: `${AFG_MATCH_LIGHT.label}: each modeled vent opening is ${ventSpec.openingAreaSqIn.toFixed(1)} sq in geometrically, below the manual's 18 sq in minimum for each of two opposing vents. Free area will be no greater than geometric area.`,
      });
    } else if (geometricTotal < 36) {
      warnings.push({
        code: 'manufacturer-vent-geometric-deficit',
        message: `${AFG_MATCH_LIGHT.label}: ${geometricTotal.toFixed(1)} sq in total geometric opening is below the manual's combined 36 sq in minimum across two opposing vents. Free area will be no greater than geometric area.`,
      });
    }
    return {
      label: AFG_MATCH_LIGHT.label,
      sourceUrl: AFG_SOURCE,
      sourceRevision: AFG_MATCH_LIGHT.sourceRevision,
      reviewedOn,
      requirements: [
        'At least two opposing enclosure vents, each with at least 18 sq in of ventilation.',
        'Do not operate an open flame fire feature under any overhang; use a qualified installer and current manual.',
      ],
      findings,
      warnings,
    };
  }

  return null;
}
