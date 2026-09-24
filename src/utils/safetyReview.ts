import type { SafetyWarning } from '../types';

export type SafetyPriority = 'action' | 'review' | 'information';

// Every engine warning must be classified before the UI can summarize it.
const WARNING_PRIORITY: Record<SafetyWarning['code'], SafetyPriority> = {
  'clearance-too-low': 'action',
  'wood-liner-recommended': 'review',
  'natural-stone-geology-check-required': 'review',
  'natural-stone-heat-shield-recommended': 'action',
  'natural-stone-unsafe-type': 'action',
  'natural-stone-mortared-drainage-review': 'review',
  'tight-radius-cut-required': 'review',
  'tight-radius-half-bat-recommended': 'review',
  'mortar-curing-required': 'information',
  'gas-manufacturer-requirements-unverified': 'action',
  'gas-vent-layout-invalid': 'action',
  'gas-line-near-vent': 'action',
  'course-bearing-risk': 'action',
  'overhead-clearance-unverified': 'action',
  'double-wall-cavity-tight': 'review',
  'double-wall-thermal-review': 'review',
  'inner-wall-product-unverified': 'action',
  'mortar-zone-mismatch': 'action',
  'smokeless-vent-ratio-low': 'review',
  'smokeless-vent-ratio-high': 'review',
  'smokeless-flange-unsafe': 'action',
  'smokeless-depth-insufficient': 'action',
  'smokeless-fabrication-review-required': 'action',
  'commercial-insert-fit-unverified': 'action',
  'seating-combustible-surface': 'action',
};

export function getSafetyPriority(warning: SafetyWarning): SafetyPriority {
  return WARNING_PRIORITY[warning.code];
}

export function summarizeSafetyWarnings(warnings: SafetyWarning[]) {
  const action = warnings.filter((warning) => getSafetyPriority(warning) === 'action');
  const review = warnings.filter((warning) => getSafetyPriority(warning) === 'review');
  const information = warnings.filter(
    (warning) => getSafetyPriority(warning) === 'information',
  );

  return {
    action,
    review,
    information,
    priority: action.length > 0 ? 'action' as const : review.length > 0 ? 'review' as const : 'information' as const,
  };
}
