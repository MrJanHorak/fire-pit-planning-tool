import type { SeatingDensity, SeatingFurnitureStyle } from '../types';

const SEATING_CHAIR_WIDTH_FT = 2.25;
const SEATING_CHAIR_DEPTH_FT = 2.5;
const SEATING_BENCH_WIDTH_FT = 5.25;
const SEATING_BENCH_DEPTH_FT = 1.85;

export function getSeatingGuideInsetFt(
  furnitureStyle: SeatingFurnitureStyle = 'adirondack',
  density: SeatingDensity = 'standard',
): number {
  const depthFt =
    furnitureStyle === 'bench'
      ? SEATING_BENCH_DEPTH_FT
      : SEATING_CHAIR_DEPTH_FT;

  const baseAdditionalOffsetFt = furnitureStyle === 'bench' ? 0.85 : 1.15;

  const densityOffsetFt =
    density === 'cozy' ? 0.8 : density === 'spacious' ? -0.8 : 0;

  return Math.max(0.35, depthFt / 2 + baseAdditionalOffsetFt + densityOffsetFt);
}

function getSeatBodyWidthFt(
  furnitureStyle: SeatingFurnitureStyle = 'adirondack',
): number {
  return furnitureStyle === 'bench'
    ? SEATING_BENCH_WIDTH_FT
    : SEATING_CHAIR_WIDTH_FT;
}

function getSeatSpacingBufferFt(
  furnitureStyle: SeatingFurnitureStyle = 'adirondack',
  density: SeatingDensity = 'standard',
): number {
  if (furnitureStyle === 'bench') {
    if (density === 'cozy') {
      return 0.4;
    }
    if (density === 'spacious') {
      return 1.4;
    }
    return 0.9;
  }

  if (density === 'cozy') {
    return 0.35;
  }
  if (density === 'spacious') {
    return 1.2;
  }
  return 0.75;
}

export function getMaxCircularSeatingCount(
  seatingRadiusFt: number,
  furnitureStyle: SeatingFurnitureStyle = 'adirondack',
  density: SeatingDensity = 'standard',
): number {
  const placementRadiusFt = Math.max(
    0.6,
    seatingRadiusFt - getSeatingGuideInsetFt(furnitureStyle, density),
  );
  const circumferenceFt = Math.max(0, 2 * Math.PI * placementRadiusFt);
  const seatPitchFt =
    getSeatBodyWidthFt(furnitureStyle) +
    getSeatSpacingBufferFt(furnitureStyle, density);

  return Math.max(1, Math.floor(circumferenceFt / Math.max(0.1, seatPitchFt)));
}

export function clampSeatingFurnitureCount(
  requestedCount: number | undefined,
  maxCount: number,
  fallbackCount = 4,
): number {
  const normalizedCount = Number.isFinite(requestedCount)
    ? Math.round(requestedCount as number)
    : fallbackCount;
  const boundedMax = Math.max(1, Math.floor(maxCount));

  return Math.min(boundedMax, Math.max(1, normalizedCount));
}
