import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import { DEFAULT_MASONRY_INPUT } from '../defaultInput';
import { buildManufacturerReview } from '../manufacturerProfiles';
import { buildConstructionPacketHtml } from '../constructionPacket';
import { buildCompactShareParams, decodeCompactSharedProjectFromParams } from '../shareLink';

describe('manufacturer profile reviews', () => {
  it('checks only the Breeo circular opening and leaves depth for field review', () => {
    const input = {
      ...DEFAULT_MASONRY_INPUT,
      fuelType: 'wood' as const,
      smokelessMode: true,
      smokelessInsertPreset: 'breeo-x24' as const,
      innerDiameterIn: 30,
    };
    const output = new MasonryEngine().calculateDesign(input);
    const review = buildManufacturerReview(input, output.ventSpec);

    expect(review?.sourceUrl).toBe('https://breeo.com/products/x-series-insert-ring');
    expect(review?.findings[0]).toContain('within the published 27–33 in range');
    expect(review?.findings[1]).toContain('not independently measured');
    expect(output.smokelessSpec).toBeUndefined();
    expect(output.ventSpec.ventCount).toBe(0);
    expect(output.linerSpec.enabled).toBe(false);
    expect(output.warnings.some((warning) => warning.code === 'manufacturer-surround-opening-out-of-range')).toBe(false);
    const packet = buildConstructionPacketHtml(input, output);
    expect(packet).toContain('No masonry vent openings are modeled for the selected Breeo insert-ring system');
    expect(packet).toContain('breeo.com/products/x-series-insert-ring');

    const outOfRange = new MasonryEngine().calculateDesign({ ...input, innerDiameterIn: 40 });
    expect(outOfRange.warnings.some((warning) => warning.code === 'manufacturer-surround-opening-out-of-range')).toBe(true);
  });

  it('never treats total geometric vent area as verified free area for AFG', () => {
    const input = {
      ...DEFAULT_MASONRY_INPUT,
      fuelType: 'propane' as const,
      gasHardwareTemplate: 'afg-match-light' as const,
      ventCount: 2,
      ventOpeningAreaSqIn: 15,
    };
    const output = new MasonryEngine().calculateDesign(input);
    const review = buildManufacturerReview(input, output.ventSpec);

    expect(review?.sourceRevision).toBe('AFG-INST-012_REVB_08/18');
    expect(review?.warnings.map((warning) => warning.code)).toContain('manufacturer-vent-geometric-deficit');
    expect(review?.findings.join(' ')).toContain('Free area on each opposing side is not measured');

    const larger = new MasonryEngine().calculateDesign({ ...input, ventOpeningAreaSqIn: 20 });
    expect(larger.warnings.some((warning) => warning.code === 'manufacturer-vent-geometric-deficit')).toBe(false);
    expect(larger.warnings.some((warning) => warning.code === 'manufacturer-product-review-required')).toBe(true);

    const fourSmall = new MasonryEngine().calculateDesign({ ...input, ventCount: 4, ventOpeningAreaSqIn: 10 });
    expect(fourSmall.ventSpec.totalOpenAreaSqIn).toBe(40);
    expect(fourSmall.warnings.some((warning) => warning.code === 'manufacturer-vent-geometric-deficit')).toBe(true);
  });

  it('keeps generic designs free of manufacturer-specific requirements', () => {
    const input = { ...DEFAULT_MASONRY_INPUT, gasHardwareTemplate: 'generic-firepit' as const };
    const output = new MasonryEngine().calculateDesign(input);
    expect(buildManufacturerReview(input, output.ventSpec)).toBeNull();
  });

  it('preserves the selected gas profile in a compact share link', () => {
    const input = { ...DEFAULT_MASONRY_INPUT, gasHardwareTemplate: 'afg-match-light' as const };
    const params = buildCompactShareParams(input, 'AFG review', DEFAULT_MASONRY_INPUT);
    expect(params.get('gh')).toBe('afg-match-light');
    expect(decodeCompactSharedProjectFromParams(params, DEFAULT_MASONRY_INPUT)?.input.gasHardwareTemplate).toBe('afg-match-light');
  });
});
