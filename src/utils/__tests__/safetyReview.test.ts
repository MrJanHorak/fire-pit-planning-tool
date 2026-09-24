import { describe, expect, it } from 'vitest';
import type { SafetyWarning } from '../../types';
import { summarizeSafetyWarnings } from '../safetyReview';

const warning = (code: SafetyWarning['code']): SafetyWarning => ({ code, message: code });

describe('safety review summary', () => {
  it('surfaces unresolved insert and heat risks as action items', () => {
    const summary = summarizeSafetyWarnings([
      warning('smokeless-flange-unsafe'),
      warning('smokeless-depth-insufficient'),
      warning('outer-wall-heat-risk'),
      warning('seating-combustible-surface'),
      warning('mortar-curing-required'),
    ]);

    expect(summary.priority).toBe('action');
    expect(summary.action).toHaveLength(4);
    expect(summary.information).toHaveLength(1);
  });

  it('keeps a design with only advisory warnings in review', () => {
    const summary = summarizeSafetyWarnings([warning('double-wall-cavity-tight')]);
    expect(summary.priority).toBe('review');
    expect(summary.review).toHaveLength(1);
  });

  it('never claims a design is build-ready when no modeled warnings exist', () => {
    const summary = summarizeSafetyWarnings([]);
    expect(summary.action).toHaveLength(0);
    expect(summary.review).toHaveLength(0);
    expect(summary.priority).toBe('information');
  });
});
