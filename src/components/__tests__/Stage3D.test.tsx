import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import {
  buildSeatingReferencePlacements,
  buildCircularCapBrickQuad,
  buildCircularCapJointQuad,
  buildOuterFaceMarkerPlacement,
  buildRegularPolygonRingPiecePoints,
  buildRectangularRingPiecePoints,
  computeStage3DGeometry,
  distributeRectangularRingUnits,
  getMaxCircularSeatingCount,
  getRectangularRingPieceIndex,
  getSeatingGuideInsetFt,
  getSeatingSurfaceVisual,
  getStageGroundRadiusForShapeFt,
  getStageGroundRadiusFt,
  isHalfRoundCapUnit,
} from '../Stage3D';

const baseInput: MasonryInput = {
  planShape: 'circular',
  innerDiameterIn: 36,
  innerWidthIn: 36,
  innerDepthIn: 30,
  wallHeightIn: 18,
  proximityToStructuresFt: 12,
  fuelType: 'propane',
  linerType: 'steel-ring',
  expansionGapIn: 0.5,
  mortarJointIn: 0.375,
  orientation: 'stretcher',
  bondPattern: 'running-bond',
  ventCount: 4,
  ventOpeningAreaSqIn: 5,
  gasLineEntryAngleDeg: 225,
  capstoneOverhangIn: 2,
  capPlacementMode: 'outward-only',
  capstonePresetKey: 'matching',
};

describe('Stage3D geometry', () => {
  it('uses capstone centerline diameter for cap ring radius', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);

    const geometry = computeStage3DGeometry(output);
    const expectedCapRadiusFt =
      output.capstone.capCenterlineDiameterIn / 2 / 12;

    expect(geometry.capRadiusFt).toBeCloseTo(expectedCapRadiusFt);
    expect(geometry.capRadiusFt).toBeGreaterThan(geometry.wallRadiusFt);
  });

  it('shows larger cap radius when overhang increases', () => {
    const engine = new MasonryEngine();
    const compact = computeStage3DGeometry(
      engine.calculateDesign({ ...baseInput, capstoneOverhangIn: 0.5 }),
    );
    const wide = computeStage3DGeometry(
      engine.calculateDesign({ ...baseInput, capstoneOverhangIn: 3 }),
    );

    expect(wide.capRadiusFt).toBeGreaterThan(compact.capRadiusFt);
  });

  it('builds circular cap mortar wedges that widen toward the outside face', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);
    const geometry = computeStage3DGeometry(output);
    const jointQuad = buildCircularCapJointQuad({
      centerlineRadiusFt: geometry.capRadiusFt,
      innerRadiusFt: output.capstone.capInnerDiameterIn / 2 / 12,
      outerRadiusFt: output.capstone.capOuterDiameterIn / 2 / 12,
      actualJointIn: output.capstone.joint.actualJointIn,
    });
    const innerSpanFt = Math.hypot(
      jointQuad.rightInner.x - jointQuad.leftInner.x,
      jointQuad.rightInner.z - jointQuad.leftInner.z,
    );
    const outerSpanFt = Math.hypot(
      jointQuad.rightOuter.x - jointQuad.leftOuter.x,
      jointQuad.rightOuter.z - jointQuad.leftOuter.z,
    );

    expect(jointQuad.polygonPoints).toHaveLength(4);
    expect(outerSpanFt).toBeGreaterThan(innerSpanFt);
    expect(jointQuad.leftOuter.z).toBeGreaterThan(jointQuad.leftInner.z);
  });

  it('builds circular cap units as wedges with longer outer face', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign(baseInput);
    const geometry = computeStage3DGeometry(output);
    const brickQuad = buildCircularCapBrickQuad({
      centerlineRadiusFt: geometry.capRadiusFt,
      innerRadiusFt: output.capstone.capInnerDiameterIn / 2 / 12,
      outerRadiusFt: output.capstone.capOuterDiameterIn / 2 / 12,
      brickLengthIn: output.resolvedCapUnit.lengthIn,
    });
    const innerSpanFt = Math.hypot(
      brickQuad.rightInner.x - brickQuad.leftInner.x,
      brickQuad.rightInner.z - brickQuad.leftInner.z,
    );
    const outerSpanFt = Math.hypot(
      brickQuad.rightOuter.x - brickQuad.leftOuter.x,
      brickQuad.rightOuter.z - brickQuad.leftOuter.z,
    );

    expect(brickQuad.polygonPoints).toHaveLength(4);
    expect(outerSpanFt).toBeGreaterThan(innerSpanFt);
    expect(brickQuad.leftOuter.z).toBeGreaterThan(brickQuad.leftInner.z);
  });

  it('uses resolved unit height and liner dimensions in stage geometry', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      brickPresetKey: 'queen',
      linerType: 'fire-brick',
      expansionGapIn: 0.75,
    });

    const geometry = computeStage3DGeometry(output);

    expect(geometry.courseRiseFt).toBeCloseTo((2.75 + 0.375) / 12);
    expect(geometry.linerOuterRadiusFt).toBeCloseTo(34.5 / 2 / 12);
    expect(geometry.linerInnerRadiusFt).toBeGreaterThan(0);
  });

  it('returns span geometry for rectangular plans', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      planShape: 'rectangular',
      innerWidthIn: 48,
      innerDepthIn: 30,
    });

    const geometry = computeStage3DGeometry(output);

    expect(geometry.planShape).toBe('rectangular');
    expect(geometry.wallSpanWidthFt).toBeCloseTo(
      output.centerlineSpanWidthIn / 12,
    );
    expect(geometry.wallSpanDepthFt).toBeCloseTo(
      output.centerlineSpanDepthIn / 12,
    );
  });

  it('builds clipped rectangular wall footprints inside the outer corner bounds', () => {
    const engine = new MasonryEngine();
    const output = engine.calculateDesign({
      ...baseInput,
      planShape: 'rectangular',
      innerWidthIn: 48,
      innerDepthIn: 30,
    });
    const geometry = computeStage3DGeometry(output);
    const wallWidthFt = output.resolvedUnit.widthIn / 12;
    const sideCounts = distributeRectangularRingUnits(
      output.unitsPerCourseRounded,
      geometry.wallSpanWidthFt,
      geometry.wallSpanDepthFt,
    );
    const totalSideUnits = sideCounts.reduce((sum, count) => sum + count, 0);
    const outerHalfW = geometry.wallSpanWidthFt / 2 + wallWidthFt / 2;
    const outerHalfD = geometry.wallSpanDepthFt / 2 + wallWidthFt / 2;

    expect(output.unitsPerCourseRounded % 2).toBe(0);
    expect(totalSideUnits).toBe(output.unitsPerCourseRounded);

    Array.from({ length: output.unitsPerCourseRounded }, (_, unitIndex) => {
      const { sideIndex, pieceIndex, piecesOnSide } =
        getRectangularRingPieceIndex(unitIndex, sideCounts);
      const points = buildRectangularRingPiecePoints({
        spanWidthFt: geometry.wallSpanWidthFt,
        spanDepthFt: geometry.wallSpanDepthFt,
        ringWidthFt: wallWidthFt,
        sideIndex,
        pieceIndex,
        piecesOnSide,
        jointFt: output.mortarJointIn / 12,
      });

      points.forEach((point) => {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(outerHalfW);
        expect(Math.abs(point.z)).toBeLessThanOrEqual(outerHalfD);
      });
    });
  });

  it('anchors vent markers directly outside clipped polygon wall faces', () => {
    const markerDepthFt = 0.03;
    const footprint = buildRegularPolygonRingPiecePoints({
      apothemFt: 3,
      sideCount: 8,
      ringWidthFt: 0.3,
      faceIndex: 0,
      pieceIndex: 1,
      piecesOnFace: 3,
      jointFt: 0.03,
    });
    const marker = buildOuterFaceMarkerPlacement(footprint, markerDepthFt);
    const outerMidpoint = {
      x: (footprint[2].x + footprint[3].x) / 2,
      z: (footprint[2].z + footprint[3].z) / 2,
    };
    const markerOffset = Math.hypot(
      marker.x - outerMidpoint.x,
      marker.z - outerMidpoint.z,
    );

    expect(markerOffset).toBeCloseTo(markerDepthFt / 2 + 0.004);
    expect(
      marker.x * marker.outwardNormal.x + marker.z * marker.outwardNormal.z,
    ).toBeGreaterThan(
      outerMidpoint.x * marker.outwardNormal.x +
        outerMidpoint.z * marker.outwardNormal.z,
    );
  });

  it('detects half-round coping cap units by name', () => {
    expect(isHalfRoundCapUnit('Half-Round Coping')).toBe(true);
    expect(isHalfRoundCapUnit('Cap Block')).toBe(false);
  });

  it('maps seating ground types to distinct 3D surface visuals', () => {
    const gravel = getSeatingSurfaceVisual('gravel');
    const hardscape = getSeatingSurfaceVisual('hardscape');

    expect(gravel.label).toBe('Compacted Gravel');
    expect(gravel.pattern).toBe('speckle');
    expect(hardscape.label).toBe('Hardscape');
    expect(hardscape.pattern).toBe('slab');
    expect(hardscape.baseColor).not.toBe(gravel.baseColor);
  });

  it('expands the rendered ground radius when seating area is present', () => {
    expect(getStageGroundRadiusFt()).toBeCloseTo(3.4);
    expect(getStageGroundRadiusFt(8)).toBeCloseTo(9.75);
    expect(getStageGroundRadiusFt(12)).toBeCloseTo(13.75);
    expect(getStageGroundRadiusForShapeFt(10, 'square')).toBeCloseTo(15.89, 2);
  });

  it('limits seating count to what fits around the seating circle', () => {
    expect(getMaxCircularSeatingCount(10, 'adirondack', 'standard')).toBe(15);
    expect(getMaxCircularSeatingCount(10, 'adirondack', 'cozy')).toBe(16);
    expect(getMaxCircularSeatingCount(10, 'adirondack', 'spacious')).toBe(15);
    expect(getMaxCircularSeatingCount(10, 'bench', 'standard')).toBe(8);
    expect(getMaxCircularSeatingCount(10, 'bench', 'cozy')).toBe(8);
    expect(getMaxCircularSeatingCount(10, 'bench', 'spacious')).toBe(8);
  });

  it('uses a scale-aware inset based on chair depth', () => {
    expect(getSeatingGuideInsetFt()).toBeCloseTo(2.4);
    expect(getSeatingGuideInsetFt('adirondack', 'cozy')).toBeCloseTo(3.2);
    expect(getSeatingGuideInsetFt('adirondack', 'spacious')).toBeCloseTo(1.6);
    expect(getSeatingGuideInsetFt('bench')).toBeCloseTo(1.775);
  });

  it('builds evenly spaced seating reference placements facing the firepit', () => {
    const placements = buildSeatingReferencePlacements('circular', 10, 4);

    expect(placements).toHaveLength(4);
    expect(placements[0].x).toBeCloseTo(7.6);
    expect(placements[0].z).toBeCloseTo(0);
    expect(placements[1].x).toBeCloseTo(0, 6);
    expect(placements[1].z).toBeCloseTo(7.6);
    expect(placements[0].rotationY).toBeCloseTo(-Math.PI / 2);
  });

  it('builds square seating placements on sides and corners', () => {
    const placements = buildSeatingReferencePlacements(
      'square',
      10,
      8,
      1.6,
      'standard',
    );

    expect(placements).toHaveLength(8);
    expect(placements[0]).toMatchObject({ x: 0, z: -8.4 });
    expect(placements[1]).toMatchObject({ x: 8.4, z: 0 });
    expect(placements[4].x).toBeCloseTo(6.552, 3);
    expect(placements[4].z).toBeCloseTo(-6.552, 3);
    expect(placements[0].rotationY).toBeCloseTo(0);
    expect(placements[2].rotationY).toBeCloseTo(Math.PI);
  });

  it('biases square cozy seating toward corners to keep side lanes clearer', () => {
    const placements = buildSeatingReferencePlacements(
      'square',
      10,
      8,
      3.2,
      'cozy',
    );

    const side = placements[0];
    const corner = placements[4];
    expect(Math.abs(side.z)).toBeLessThan(Math.abs(corner.z));
    expect(Math.abs(side.z)).toBeLessThan(Math.abs(corner.x));
  });

  it('removes corner benches for square cozy bench seating, keeping only 4 inner side benches', () => {
    const placementsWithBench = buildSeatingReferencePlacements(
      'square',
      10,
      6,
      3.2,
      'cozy',
      'bench',
    );

    // Square cozy bench should always return exactly 4 side placements
    expect(placementsWithBench).toHaveLength(4);

    // Verify they are positioned on the four sides
    placementsWithBench.forEach((placement) => {
      const onXAxis = Math.abs(placement.x) > Math.abs(placement.z) * 0.9;
      const onZAxis = Math.abs(placement.z) > Math.abs(placement.x) * 0.9;
      expect(onXAxis || onZAxis).toBe(true);
    });
  });
});
