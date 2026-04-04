import { describe, expect, it } from 'vitest';
import { calculateSeatingMaterials } from '../seatingMaterials';

describe('seatingMaterials', () => {
  it('calculates circular seating area metadata', () => {
    const result = calculateSeatingMaterials(
      'gravel',
      'circular',
      'adirondack',
      'standard',
      10,
    );

    expect(result.shape).toBe('circular');
    expect(result.furnitureStyle).toBe('adirondack');
    expect(result.density).toBe('standard');
    expect(result.overallWidthFt).toBeCloseTo(20);
    expect(result.areaSquareFeet).toBeCloseTo(Math.PI * 100);
    expect(result.notes[0]).toContain('Circular seating zone');
  });

  it('calculates square seating area metadata and perimeter-driven edging', () => {
    const result = calculateSeatingMaterials(
      'mulch',
      'square',
      'bench',
      'cozy',
      10,
    );

    expect(result.shape).toBe('square');
    expect(result.furnitureStyle).toBe('bench');
    expect(result.density).toBe('cozy');
    expect(result.overallWidthFt).toBeCloseTo(20);
    expect(result.overallDepthFt).toBeCloseTo(20);
    expect(result.areaSquareFeet).toBeCloseTo(400);
    expect(result.materials[2].quantity).toBeCloseTo(80);
    expect(result.notes[0]).toContain('Square seating zone');
  });
});
