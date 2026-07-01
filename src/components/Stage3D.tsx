import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Edges, Html, Line, OrbitControls } from '@react-three/drei';
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  TextureLoader,
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Group, Mesh, Scene } from 'three';
import type {
  MasonryOutput,
  SeatingAreaShape,
  SeatingDensity,
  SeatingFurnitureStyle,
  SeatingGroundType,
} from '../types';
import {
  clampSeatingFurnitureCount,
  getMaxCircularSeatingCount,
  getSeatingGuideInsetFt,
} from '../utils/seatingLayout';
import { Stage3DEffects, getCameraPresets, PHOTOREAL_LIGHTING, STYLIZED_LIGHTING, getActiveHemisphereLightArgs } from './Stage3DEffects';
import { useCameraAnimation } from './useCameraAnimation';

interface Stage3DProps {
  output: MasonryOutput;
  seatingFurnitureCount?: number;
  captureSignal?: number | null;
  glbExportSignal?: number | null;
  onStakeholderRenderComplete?: (result: {
    ok: boolean;
    message: string;
  }) => void;
  onModelExportComplete?: (result: { ok: boolean; message: string }) => void;
}

interface BrickSelectionInfo {
  id: string;
  courseIndex: number;
  brickIndex: number;
  kind: 'wall-brick' | 'vent-opening';
  isSpacer: boolean;
  requiresTaperCut: boolean;
  isVent: boolean;
}

type StageLodLevel = 'high' | 'medium' | 'low';

type MortarMode = 'solid' | 'ghost' | 'off';
type MaterialStyle = 'classic-red' | 'charcoal' | 'limestone';
type CutawayMode = 'off' | 'quarter' | 'half';

const STYLE_PALETTES: Record<
  MaterialStyle,
  {
    label: string;
    swatch: string;
    wallEvenColor: string;
    wallOddColor: string;
    capColor: string;
    capCrownColor: string;
    mortarColor: string;
    proceduralBrickFill: string;
    proceduralCapFill: string;
    proceduralMortarFill: string;
  }
> = {
  'classic-red': {
    label: 'Classic Red',
    swatch: '#924018',
    wallEvenColor: '#924018',
    wallOddColor: '#7d3512',
    capColor: '#ccb085',
    capCrownColor: '#d5bb93',
    mortarColor: '#c6b39a',
    proceduralBrickFill: '#8c4622',
    proceduralCapFill: '#c6a478',
    proceduralMortarFill: '#b9afa2',
  },
  charcoal: {
    label: 'Charcoal',
    swatch: '#3e3b38',
    wallEvenColor: '#3e3b38',
    wallOddColor: '#2e2b28',
    capColor: '#4d4a46',
    capCrownColor: '#5c5854',
    mortarColor: '#8c8580',
    proceduralBrickFill: '#403d3a',
    proceduralCapFill: '#525050',
    proceduralMortarFill: '#908a84',
  },
  limestone: {
    label: 'Limestone',
    swatch: '#c8b898',
    wallEvenColor: '#c8b898',
    wallOddColor: '#b8a888',
    capColor: '#e0d0b6',
    capCrownColor: '#e8d8c4',
    mortarColor: '#e0d8cc',
    proceduralBrickFill: '#c4b494',
    proceduralCapFill: '#dcd0b8',
    proceduralMortarFill: '#ddd8d0',
  },
};

interface SeatingSurfaceVisual {
  label: string;
  baseColor: string;
  accentColor: string;
  roughness: number;
  metalness: number;
  pattern: 'speckle' | 'fibers' | 'grid' | 'slab';
}

interface SeatingChairDimensions {
  widthFt: number;
  depthFt: number;
  seatHeightFt: number;
  backHeightFt: number;
  armHeightFt: number;
}

const SEATING_CHAIR_DIMENSIONS_FT: SeatingChairDimensions = {
  widthFt: 2.25,
  depthFt: 2.5,
  seatHeightFt: 1.35,
  backHeightFt: 3.1,
  armHeightFt: 1.85,
};

const SEATING_BENCH_DIMENSIONS_FT = {
  widthFt: 5.25,
  depthFt: 1.85,
  seatHeightFt: 1.45,
  backHeightFt: 2.85,
};

const SEATING_FURNITURE_LABELS: Record<SeatingFurnitureStyle, string> = {
  adirondack: 'Adirondack Seating',
  bench: 'Bench Seating',
};

const SEATING_DENSITY_LABELS: Record<SeatingDensity, string> = {
  cozy: 'Cozy',
  standard: 'Standard',
  spacious: 'Spacious',
};

const SEATING_SURFACE_VISUALS: Record<SeatingGroundType, SeatingSurfaceVisual> =
  {
    gravel: {
      label: 'Compacted Gravel',
      baseColor: '#c8b79a',
      accentColor: '#9f8b72',
      roughness: 0.96,
      metalness: 0.01,
      pattern: 'speckle',
    },
    mulch: {
      label: 'Mulch / Chips',
      baseColor: '#80502f',
      accentColor: '#5f3820',
      roughness: 0.98,
      metalness: 0,
      pattern: 'fibers',
    },
    'decomposed-granite': {
      label: 'Decomposed Granite',
      baseColor: '#d7c3a2',
      accentColor: '#bda37f',
      roughness: 0.92,
      metalness: 0.01,
      pattern: 'speckle',
    },
    'permeable-paver': {
      label: 'Permeable Paver + Grass',
      baseColor: '#758460',
      accentColor: '#c2b6a2',
      roughness: 0.94,
      metalness: 0.02,
      pattern: 'grid',
    },
    hardscape: {
      label: 'Hardscape',
      baseColor: '#b7b4ae',
      accentColor: '#8f8b85',
      roughness: 0.76,
      metalness: 0.04,
      pattern: 'slab',
    },
  };

export function getSeatingSurfaceVisual(
  groundType: SeatingGroundType,
): SeatingSurfaceVisual {
  return SEATING_SURFACE_VISUALS[groundType];
}

export function getStageGroundRadiusFt(seatingRadiusFt?: number): number {
  if (!seatingRadiusFt || seatingRadiusFt <= 0) {
    return 3.4;
  }

  return Math.max(3.4, seatingRadiusFt + 1.75);
}

export function getStageGroundRadiusForShapeFt(
  seatingExtentFt?: number,
  shape: SeatingAreaShape = 'circular',
): number {
  if (!seatingExtentFt || seatingExtentFt <= 0) {
    return 3.4;
  }

  if (shape === 'square') {
    return Math.max(3.4, Math.sqrt(seatingExtentFt ** 2 * 2) + 1.75);
  }

  return getStageGroundRadiusFt(seatingExtentFt);
}

export { getMaxCircularSeatingCount, getSeatingGuideInsetFt };

export function buildSeatingReferencePlacements(
  shape: SeatingAreaShape,
  seatingRadiusFt: number,
  count: number,
  insetFt = getSeatingGuideInsetFt(),
  density: SeatingDensity = 'standard',
  furnitureStyle: SeatingFurnitureStyle = 'adirondack',
): Placement[] {
  if (shape === 'square') {
    const placementRadiusFt = Math.max(0.6, seatingRadiusFt - insetFt);
    const sideRadiusFt =
      density === 'cozy' ? placementRadiusFt * 0.64 : placementRadiusFt;
    const cornerRadiusFt =
      density === 'cozy'
        ? placementRadiusFt * 0.9
        : density === 'spacious'
          ? placementRadiusFt * 0.72
          : placementRadiusFt * 0.78;
    const sidePlacements: Placement[] = [
      { x: 0, z: -sideRadiusFt, rotationY: 0 },
      { x: sideRadiusFt, z: 0, rotationY: -Math.PI / 2 },
      { x: 0, z: sideRadiusFt, rotationY: Math.PI },
      { x: -sideRadiusFt, z: 0, rotationY: Math.PI / 2 },
    ];

    // For square cozy bench, always use only the 4 inner side benches
    if (
      count <= 4 ||
      (shape === 'square' && density === 'cozy' && furnitureStyle === 'bench')
    ) {
      return sidePlacements;
    }

    const cornerPlacements = [
      { x: cornerRadiusFt, z: -cornerRadiusFt },
      { x: cornerRadiusFt, z: cornerRadiusFt },
      { x: -cornerRadiusFt, z: cornerRadiusFt },
      { x: -cornerRadiusFt, z: -cornerRadiusFt },
    ].map((point) => {
      const angle = Math.atan2(point.z, point.x);
      return {
        x: point.x,
        z: point.z,
        rotationY: -angle - Math.PI / 2,
      };
    });

    return [...sidePlacements, ...cornerPlacements];
  }

  const placementRadiusFt = Math.max(0.6, seatingRadiusFt - insetFt);

  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return {
      x: Math.cos(angle) * placementRadiusFt,
      z: Math.sin(angle) * placementRadiusFt,
      rotationY: -angle - Math.PI / 2,
    };
  });
}

function createProceduralTexture(
  painter: (ctx: CanvasRenderingContext2D, size: number) => void,
): CanvasTexture | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return undefined;
  }

  painter(ctx, size);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  return texture;
}

function paintNoise(
  ctx: CanvasRenderingContext2D,
  size: number,
  alpha: number,
  count: number,
) {
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 0.5 + Math.random() * 2;
    const shade = Math.floor(95 + Math.random() * 70);
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintSeatingPattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  visual: SeatingSurfaceVisual,
) {
  ctx.fillStyle = visual.baseColor;
  ctx.fillRect(0, 0, size, size);

  if (visual.pattern === 'speckle') {
    paintNoise(ctx, size, 0.26, 2600);
    ctx.fillStyle = `${visual.accentColor}44`;
    for (let i = 0; i < 180; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 1 + Math.random() * 2.6;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (visual.pattern === 'fibers') {
    for (let i = 0; i < 340; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 8 + Math.random() * 20;
      const angle = Math.random() * Math.PI;
      ctx.strokeStyle = `${visual.accentColor}${Math.random() > 0.4 ? '66' : '33'}`;
      ctx.lineWidth = 1 + Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
    return;
  }

  if (visual.pattern === 'grid') {
    const cell = size / 8;
    for (let x = 0; x <= size; x += cell) {
      ctx.fillStyle = `${visual.accentColor}88`;
      ctx.fillRect(x, 0, 2, size);
    }
    for (let y = 0; y <= size; y += cell) {
      ctx.fillStyle = `${visual.accentColor}88`;
      ctx.fillRect(0, y, size, 2);
    }
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if ((row + col) % 3 === 0) {
          ctx.fillStyle = '#7f925f55';
          ctx.fillRect(col * cell + 4, row * cell + 4, cell - 8, cell - 8);
        }
      }
    }
    return;
  }

  const slabSize = size / 4;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle =
        (row + col) % 2 === 0 ? visual.baseColor : `${visual.accentColor}dd`;
      ctx.fillRect(col * slabSize, row * slabSize, slabSize - 2, slabSize - 2);
    }
  }
}

export interface Stage3DGeometry {
  planShape: MasonryOutput['planShape'];
  wallRadiusFt: number;
  wallSpanWidthFt: number;
  wallSpanDepthFt: number;
  capRadiusFt: number;
  capSpanWidthFt: number;
  capSpanDepthFt: number;
  capRiseFt: number;
  courseRiseFt: number;
  linerOuterRadiusFt: number;
  linerInnerRadiusFt: number;
  linerOuterWidthFt: number;
  linerOuterDepthFt: number;
  linerInnerWidthFt: number;
  linerInnerDepthFt: number;
}

interface Placement {
  x: number;
  z: number;
  rotationY: number;
}

interface Point2D {
  x: number;
  z: number;
}

interface CircularCapJointQuad {
  leftInner: Point2D;
  leftOuter: Point2D;
  rightInner: Point2D;
  rightOuter: Point2D;
  polygonPoints: Point2D[];
}

interface CircularCapJointGeometryInput {
  centerlineRadiusFt: number;
  innerRadiusFt: number;
  outerRadiusFt: number;
  actualJointIn: number;
}

interface CircularCapBrickGeometryInput {
  centerlineRadiusFt: number;
  innerRadiusFt: number;
  outerRadiusFt: number;
  brickLengthIn: number;
}

/**
 * Probe WebGL availability without consuming a permanent context slot.
 * The test context is released immediately via WEBGL_lose_context.
 */
function canCreateWebGLContext(): boolean {
  if (typeof document === 'undefined') return false;
  const attrs: WebGLContextAttributes = {
    antialias: false,
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: false,
  };
  const probe = document.createElement('canvas');
  const ctx =
    (probe.getContext('webgl2', attrs) as WebGLRenderingContext | null) ??
    (probe.getContext('webgl', attrs) as WebGLRenderingContext | null) ??
    (probe.getContext('experimental-webgl', attrs) as WebGLRenderingContext | null);
  if (!ctx) return false;
  // Release immediately — Chrome allows ~16 simultaneous contexts.
  ctx.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

class Stage3DCanvasErrorBoundary extends Component<
  { children: ReactNode; onError: (reason: string) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message ?? 'Unknown WebGL render error');
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export function isHalfRoundCapUnit(unitName: string): boolean {
  return /half-round coping/i.test(unitName);
}

function arcToChordLengthFt(arcLengthFt: number, radiusFt: number): number {
  const safeRadiusFt = Math.max(0.001, radiusFt);
  const clampedArcFt = Math.max(0, arcLengthFt);
  const angleRad = clampedArcFt / safeRadiusFt;

  return 2 * safeRadiusFt * Math.sin(angleRad / 2);
}

export function computeStage3DGeometry(output: MasonryOutput): Stage3DGeometry {
  const brickHeightFt = output.resolvedUnit.heightIn / 12;
  const mortarJointFt = output.mortarJointIn / 12;

  return {
    planShape: output.planShape,
    wallRadiusFt: output.centerlineDiameterIn / 2 / 12,
    wallSpanWidthFt: output.centerlineSpanWidthIn / 12,
    wallSpanDepthFt: output.centerlineSpanDepthIn / 12,
    capRadiusFt: output.capstone.capCenterlineDiameterIn / 2 / 12,
    capSpanWidthFt: output.capstone.capCenterlineWidthIn / 12,
    capSpanDepthFt: output.capstone.capCenterlineDepthIn / 12,
    courseRiseFt: brickHeightFt + mortarJointFt,
    capRiseFt: output.courses.length * (brickHeightFt + mortarJointFt),
    linerOuterRadiusFt: output.linerSpec.linerOuterDiameterIn / 2 / 12,
    linerInnerRadiusFt: output.linerSpec.linerInnerDiameterIn / 2 / 12,
    linerOuterWidthFt: output.linerSpec.linerOuterWidthIn / 12,
    linerOuterDepthFt: output.linerSpec.linerOuterDepthIn / 12,
    linerInnerWidthFt: output.linerSpec.linerInnerWidthIn / 12,
    linerInnerDepthFt: output.linerSpec.linerInnerDepthIn / 12,
  };
}

type OrbitHandle = {
  object: { position: { set: (x: number, y: number, z: number) => void } };
  target: { set: (x: number, y: number, z: number) => void };
  update: () => void;
};

function CircularCapJointFiller({
  polygonPoints,
  heightFt,
  color,
  opacity,
  wireframe,
  showEdges,
}: {
  polygonPoints: Point2D[];
  heightFt: number;
  color: string;
  opacity?: number;
  wireframe: boolean;
  showEdges: boolean;
}) {
  const shape = useMemo(() => {
    const nextShape = new Shape();

    // Shape points are authored in local X/Z, but extrusion is built in X/Y.
    // Invert Z here so after the -90deg X rotation the radial direction stays correct.
    nextShape.moveTo(polygonPoints[0].x, -polygonPoints[0].z);
    polygonPoints.slice(1).forEach((point) => {
      nextShape.lineTo(point.x, -point.z);
    });
    nextShape.closePath();

    return nextShape;
  }, [polygonPoints]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -heightFt / 2, 0]}>
      <extrudeGeometry
        args={[
          shape,
          {
            depth: heightFt,
            bevelEnabled: false,
            steps: 1,
          },
        ]}
      />
      <meshStandardMaterial
        color={color}
        roughness={0.93}
        transparent={opacity !== undefined && opacity < 1}
        opacity={opacity ?? 1}
        wireframe={wireframe}
      />
      {showEdges && <Edges color='#4a3a28' lineWidth={1} scale={1.003} />}
    </mesh>
  );
}

function rotateLocalOffset(x: number, z: number, rotationY: number): Point2D {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);

  return {
    x: x * cosY + z * sinY,
    z: -x * sinY + z * cosY,
  };
}

export function buildCircularCapJointQuad(
  input: CircularCapJointGeometryInput,
): CircularCapJointQuad {
  const centerlineRadiusFt = Math.max(0.001, input.centerlineRadiusFt);
  const jointAngleRad = input.actualJointIn / 12 / centerlineRadiusFt;
  const buildChordWidthFt = (radiusFt: number) =>
    radiusFt <= 0 ? 0 : 2 * radiusFt * Math.sin(jointAngleRad / 2);
  const innerSpanFt = buildChordWidthFt(input.innerRadiusFt);
  const outerSpanFt = buildChordWidthFt(input.outerRadiusFt);
  const innerOffsetFt = input.innerRadiusFt - centerlineRadiusFt;
  const outerOffsetFt = input.outerRadiusFt - centerlineRadiusFt;

  const leftInner = {
    x: -innerSpanFt / 2,
    z: innerOffsetFt,
  };
  const leftOuter = {
    x: -outerSpanFt / 2,
    z: outerOffsetFt,
  };
  const rightOuter = {
    x: outerSpanFt / 2,
    z: outerOffsetFt,
  };
  const rightInner = {
    x: innerSpanFt / 2,
    z: innerOffsetFt,
  };

  return {
    leftInner,
    leftOuter,
    rightInner,
    rightOuter,
    polygonPoints: [leftInner, leftOuter, rightOuter, rightInner],
  };
}

export function buildCircularCapBrickQuad(
  input: CircularCapBrickGeometryInput,
): CircularCapJointQuad {
  const centerlineRadiusFt = Math.max(0.001, input.centerlineRadiusFt);
  const brickAngleRad = input.brickLengthIn / 12 / centerlineRadiusFt;
  const buildChordWidthFt = (radiusFt: number) =>
    radiusFt <= 0 ? 0 : 2 * radiusFt * Math.sin(brickAngleRad / 2);
  const innerSpanFt = buildChordWidthFt(input.innerRadiusFt);
  const outerSpanFt = buildChordWidthFt(input.outerRadiusFt);
  const innerOffsetFt = input.innerRadiusFt - centerlineRadiusFt;
  const outerOffsetFt = input.outerRadiusFt - centerlineRadiusFt;

  const leftInner = {
    x: -innerSpanFt / 2,
    z: innerOffsetFt,
  };
  const leftOuter = {
    x: -outerSpanFt / 2,
    z: outerOffsetFt,
  };
  const rightOuter = {
    x: outerSpanFt / 2,
    z: outerOffsetFt,
  };
  const rightInner = {
    x: innerSpanFt / 2,
    z: innerOffsetFt,
  };

  return {
    leftInner,
    leftOuter,
    rightInner,
    rightOuter,
    polygonPoints: [leftInner, leftOuter, rightOuter, rightInner],
  };
}

function toLocalJointPoint(point: Point2D, jointPlacement: Placement): Point2D {
  const dx = point.x - jointPlacement.x;
  const dz = point.z - jointPlacement.z;
  const cosY = Math.cos(jointPlacement.rotationY);
  const sinY = Math.sin(jointPlacement.rotationY);

  return {
    x: dx * cosY - dz * sinY,
    z: dx * sinY + dz * cosY,
  };
}

function buildRectangularJointQuad(
  leftPlacement: Placement,
  rightPlacement: Placement,
  jointPlacement: Placement,
  lengthFt: number,
  widthFt: number,
): CircularCapJointQuad {
  const faceCenterCandidates = [-1, 1].map((direction) => {
    const offset = rotateLocalOffset(
      (direction * lengthFt) / 2,
      0,
      leftPlacement.rotationY,
    );
    return {
      direction,
      x: leftPlacement.x + offset.x,
      z: leftPlacement.z + offset.z,
    };
  });
  const leftTargetFace = faceCenterCandidates.reduce((best, candidate) => {
    const candidateDistance = Math.hypot(
      rightPlacement.x - candidate.x,
      rightPlacement.z - candidate.z,
    );
    const bestDistance = Math.hypot(
      rightPlacement.x - best.x,
      rightPlacement.z - best.z,
    );

    return candidateDistance < bestDistance ? candidate : best;
  });
  const rightFaceCenterCandidates = [-1, 1].map((direction) => {
    const offset = rotateLocalOffset(
      (direction * lengthFt) / 2,
      0,
      rightPlacement.rotationY,
    );
    return {
      direction,
      x: rightPlacement.x + offset.x,
      z: rightPlacement.z + offset.z,
    };
  });
  const rightTargetFace = rightFaceCenterCandidates.reduce(
    (best, candidate) => {
      const candidateDistance = Math.hypot(
        leftPlacement.x - candidate.x,
        leftPlacement.z - candidate.z,
      );
      const bestDistance = Math.hypot(
        leftPlacement.x - best.x,
        leftPlacement.z - best.z,
      );

      return candidateDistance < bestDistance ? candidate : best;
    },
  );
  const buildFaceCorners = (
    placement: Placement,
    faceDirection: number,
  ): { inner: Point2D; outer: Point2D } => {
    const points = [-1, 1].map((direction) => {
      const offset = rotateLocalOffset(
        (faceDirection * lengthFt) / 2,
        (direction * widthFt) / 2,
        placement.rotationY,
      );

      return {
        x: placement.x + offset.x,
        z: placement.z + offset.z,
      };
    });
    const [pointA, pointB] = points;
    const pointARadius = Math.hypot(pointA.x, pointA.z);
    const pointBRadius = Math.hypot(pointB.x, pointB.z);

    return pointARadius <= pointBRadius
      ? { inner: pointA, outer: pointB }
      : { inner: pointB, outer: pointA };
  };
  const leftFace = buildFaceCorners(leftPlacement, leftTargetFace.direction);
  const rightFace = buildFaceCorners(rightPlacement, rightTargetFace.direction);
  const leftInner = toLocalJointPoint(leftFace.inner, jointPlacement);
  const leftOuter = toLocalJointPoint(leftFace.outer, jointPlacement);
  const rightInner = toLocalJointPoint(rightFace.inner, jointPlacement);
  const rightOuter = toLocalJointPoint(rightFace.outer, jointPlacement);

  return {
    leftInner,
    leftOuter,
    rightInner,
    rightOuter,
    polygonPoints: [leftInner, leftOuter, rightOuter, rightInner],
  };
}

function FlameCore({
  innerRadiusFt,
  wallHeightFt,
}: {
  innerRadiusFt: number;
  wallHeightFt: number;
}) {
  const groupRef = useRef<Group>(null);
  const outerRef = useRef<Mesh>(null);
  const midRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const tipRef = useRef<Mesh>(null);

  const coneHeightFt = Math.min(wallHeightFt * 0.95, innerRadiusFt * 2.6);
  const baseRadiusFt = innerRadiusFt * 0.58;
  const tipBaseY = coneHeightFt * 0.75;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 1.1) * 0.07;
    }

    if (outerRef.current) {
      outerRef.current.scale.x = 1 + Math.sin(t * 2.3) * 0.14;
      outerRef.current.scale.z = 1 + Math.cos(t * 1.9) * 0.12;
      outerRef.current.scale.y = 1 + Math.sin(t * 1.6) * 0.07;
    }

    if (midRef.current) {
      midRef.current.scale.x = 1 + Math.cos(t * 3.7) * 0.16;
      midRef.current.scale.z = 1 + Math.sin(t * 4.1) * 0.15;
      midRef.current.scale.y = 1 + Math.cos(t * 2.8) * 0.1;
    }

    if (innerRef.current) {
      innerRef.current.scale.x = 1 + Math.sin(t * 5.5) * 0.13;
      innerRef.current.scale.z = 1 + Math.cos(t * 6.1) * 0.13;
    }

    if (tipRef.current) {
      tipRef.current.scale.y = 0.8 + Math.abs(Math.sin(t * 7.2)) * 0.45;
      tipRef.current.position.y =
        tipBaseY + Math.sin(t * 5.5) * coneHeightFt * 0.03;
    }
  });

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <group ref={groupRef as any}>
      {/* Ember glow base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[baseRadiusFt * 0.95, 32]} />
        <meshStandardMaterial
          color='#ff5500'
          emissive='#ff2200'
          emissiveIntensity={5.0}
          blending={AdditiveBlending}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>

      {/* Outer flame shell — wide diffuse orange */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <mesh ref={outerRef as any} position={[0, coneHeightFt * 0.38, 0]}>
        <coneGeometry args={[baseRadiusFt, coneHeightFt, 16, 1, true]} />
        <meshStandardMaterial
          color='#ff3300'
          emissive='#cc1100'
          emissiveIntensity={2.4}
          blending={AdditiveBlending}
          transparent
          opacity={0.48}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      {/* Mid orange flame */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <mesh ref={midRef as any} position={[0, coneHeightFt * 0.34, 0]}>
        <coneGeometry
          args={[baseRadiusFt * 0.68, coneHeightFt * 0.88, 12, 1, true]}
        />
        <meshStandardMaterial
          color='#ff6600'
          emissive='#ff4400'
          emissiveIntensity={3.2}
          blending={AdditiveBlending}
          transparent
          opacity={0.62}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      {/* Inner bright yellow-orange core */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <mesh ref={innerRef as any} position={[0, coneHeightFt * 0.28, 0]}>
        <coneGeometry
          args={[baseRadiusFt * 0.36, coneHeightFt * 0.72, 10, 1, true]}
        />
        <meshStandardMaterial
          color='#ffcc00'
          emissive='#ffcc00'
          emissiveIntensity={5.0}
          blending={AdditiveBlending}
          transparent
          opacity={0.72}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      {/* White-hot dancing tip */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <mesh ref={tipRef as any} position={[0, tipBaseY, 0]}>
        <coneGeometry
          args={[baseRadiusFt * 0.12, coneHeightFt * 0.34, 8, 1, true]}
        />
        <meshStandardMaterial
          color='#ffffff'
          emissive='#ffee88'
          emissiveIntensity={6.0}
          blending={AdditiveBlending}
          transparent
          opacity={0.55}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      <pointLight
        position={[0, coneHeightFt * 0.28, 0]}
        color='#ff6600'
        intensity={2.2}
        distance={4.8}
        decay={2}
      />
      <pointLight
        position={[0, coneHeightFt * 0.08, 0]}
        color='#ff3300'
        intensity={1.4}
        distance={2.8}
        decay={2}
      />
    </group>
  );
}

export function getCircularPlacement(
  brickIndex: number,
  unitCount: number,
  offsetIn: number,
  radiusFt: number,
  radiusIn: number,
): Placement {
  const baseAngle = (brickIndex / unitCount) * Math.PI * 2;
  const offsetRad = radiusIn > 0 ? offsetIn / radiusIn : 0;
  const angle = baseAngle + offsetRad;

  return {
    x: Math.cos(angle) * radiusFt,
    z: Math.sin(angle) * radiusFt,
    rotationY: -angle + Math.PI / 2,
  };
}

function getRectangularPlacement(
  brickIndex: number,
  unitCount: number,
  offsetIn: number,
  spanWidthFt: number,
  spanDepthFt: number,
): Placement {
  const perimeterFt = 2 * (spanWidthFt + spanDepthFt);
  const rawDistanceFt = (brickIndex * perimeterFt) / unitCount + offsetIn / 12;
  // Normalize to [0, perimeterFt) so negative offsets wrap correctly.
  const distanceFt =
    ((rawDistanceFt % perimeterFt) + perimeterFt) % perimeterFt;
  const halfWidthFt = spanWidthFt / 2;
  const halfDepthFt = spanDepthFt / 2;

  if (distanceFt < spanWidthFt) {
    return {
      x: -halfWidthFt + distanceFt,
      z: -halfDepthFt,
      rotationY: 0,
    };
  }

  if (distanceFt < spanWidthFt + spanDepthFt) {
    return {
      x: halfWidthFt,
      z: -halfDepthFt + (distanceFt - spanWidthFt),
      rotationY: Math.PI / 2,
    };
  }

  if (distanceFt < spanWidthFt * 2 + spanDepthFt) {
    return {
      x: halfWidthFt - (distanceFt - spanWidthFt - spanDepthFt),
      z: halfDepthFt,
      rotationY: 0,
    };
  }

  return {
    x: -halfWidthFt,
    z: halfDepthFt - (distanceFt - spanWidthFt * 2 - spanDepthFt),
    rotationY: Math.PI / 2,
  };
}

function getPlacement(
  output: MasonryOutput,
  brickIndex: number,
  unitCount: number,
  offsetIn: number,
  spanWidthFt: number,
  spanDepthFt: number,
  radiusFt: number,
): Placement {
  if (output.planShape === 'circular') {
    return getCircularPlacement(
      brickIndex,
      unitCount,
      offsetIn,
      radiusFt,
      Math.max(0.001, output.centerlineDiameterIn / 2),
    );
  }

  return getRectangularPlacement(
    brickIndex,
    unitCount,
    offsetIn,
    spanWidthFt,
    spanDepthFt,
  );
}

function RectangularRing({
  widthFt,
  depthFt,
  thicknessFt,
  heightFt,
  y,
  color,
  wireframe,
  opacity,
}: {
  widthFt: number;
  depthFt: number;
  thicknessFt: number;
  heightFt: number;
  y: number;
  color: string;
  wireframe: boolean;
  opacity?: number;
}) {
  const halfWidthFt = widthFt / 2;
  const halfDepthFt = depthFt / 2;

  return (
    <group>
      <mesh position={[0, y, -halfDepthFt]}>
        <boxGeometry args={[widthFt + thicknessFt, heightFt, thicknessFt]} />
        <meshStandardMaterial
          color={color}
          wireframe={wireframe}
          transparent={opacity !== undefined}
          opacity={opacity ?? 1}
        />
      </mesh>
      <mesh position={[0, y, halfDepthFt]}>
        <boxGeometry args={[widthFt + thicknessFt, heightFt, thicknessFt]} />
        <meshStandardMaterial
          color={color}
          wireframe={wireframe}
          transparent={opacity !== undefined}
          opacity={opacity ?? 1}
        />
      </mesh>
      <mesh position={[-halfWidthFt, y, 0]}>
        <boxGeometry args={[thicknessFt, heightFt, depthFt + thicknessFt]} />
        <meshStandardMaterial
          color={color}
          wireframe={wireframe}
          transparent={opacity !== undefined}
          opacity={opacity ?? 1}
        />
      </mesh>
      <mesh position={[halfWidthFt, y, 0]}>
        <boxGeometry args={[thicknessFt, heightFt, depthFt + thicknessFt]} />
        <meshStandardMaterial
          color={color}
          wireframe={wireframe}
          transparent={opacity !== undefined}
          opacity={opacity ?? 1}
        />
      </mesh>
    </group>
  );
}

function SeatingChairMarker({
  x,
  z,
  rotationY,
  wireframe,
}: {
  x: number;
  z: number;
  rotationY: number;
  wireframe: boolean;
}) {
  const dims = SEATING_CHAIR_DIMENSIONS_FT;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, dims.seatHeightFt - 0.09, -0.08]}>
        <boxGeometry args={[dims.widthFt, 0.12, dims.depthFt * 0.62]} />
        <meshStandardMaterial
          color='#7b5b41'
          roughness={0.88}
          metalness={0.02}
          wireframe={wireframe}
        />
      </mesh>
      <mesh
        position={[0, dims.backHeightFt * 0.52, -dims.depthFt * 0.48]}
        rotation={[-0.32, 0, 0]}
      >
        <boxGeometry args={[dims.widthFt, dims.backHeightFt * 0.72, 0.1]} />
        <meshStandardMaterial
          color='#6d513b'
          roughness={0.9}
          metalness={0.02}
          wireframe={wireframe}
        />
      </mesh>
      {[
        [-dims.widthFt * 0.42, dims.armHeightFt * 0.5, -0.06],
        [dims.widthFt * 0.42, dims.armHeightFt * 0.5, -0.06],
      ].map(([armX, armY, armZ], index) => (
        <mesh key={`arm-${index}`} position={[armX, armY, armZ]}>
          <boxGeometry args={[0.12, 0.12, dims.depthFt * 0.72]} />
          <meshStandardMaterial
            color='#6f533c'
            roughness={0.9}
            metalness={0.02}
            wireframe={wireframe}
          />
        </mesh>
      ))}
      {[
        [-dims.widthFt * 0.42, dims.armHeightFt * 0.18, dims.depthFt * 0.1],
        [dims.widthFt * 0.42, dims.armHeightFt * 0.18, dims.depthFt * 0.1],
      ].map(([postX, postY, postZ], index) => (
        <mesh key={`post-${index}`} position={[postX, postY, postZ]}>
          <boxGeometry args={[0.1, dims.armHeightFt * 0.72, 0.1]} />
          <meshStandardMaterial
            color='#4e3928'
            roughness={0.92}
            metalness={0.02}
            wireframe={wireframe}
          />
        </mesh>
      ))}
      {[
        [-dims.widthFt * 0.42, dims.seatHeightFt * 0.36, -dims.depthFt * 0.36],
        [dims.widthFt * 0.42, dims.seatHeightFt * 0.36, -dims.depthFt * 0.36],
        [-dims.widthFt * 0.34, dims.seatHeightFt * 0.36, dims.depthFt * 0.16],
        [dims.widthFt * 0.34, dims.seatHeightFt * 0.36, dims.depthFt * 0.16],
      ].map(([legX, legY, legZ], index) => (
        <mesh key={index} position={[legX, legY, legZ]}>
          <boxGeometry args={[0.09, dims.seatHeightFt * 0.78, 0.09]} />
          <meshStandardMaterial
            color='#4e3928'
            roughness={0.92}
            metalness={0.02}
            wireframe={wireframe}
          />
        </mesh>
      ))}
    </group>
  );
}

function SeatingBenchMarker({
  x,
  z,
  rotationY,
  wireframe,
}: {
  x: number;
  z: number;
  rotationY: number;
  wireframe: boolean;
}) {
  const dims = SEATING_BENCH_DIMENSIONS_FT;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, dims.seatHeightFt - 0.08, 0]}>
        <boxGeometry args={[dims.widthFt, 0.14, dims.depthFt * 0.78]} />
        <meshStandardMaterial
          color='#7a5b3e'
          roughness={0.88}
          metalness={0.02}
          wireframe={wireframe}
        />
      </mesh>
      <mesh position={[0, dims.backHeightFt * 0.52, -dims.depthFt * 0.38]}>
        <boxGeometry args={[dims.widthFt, dims.backHeightFt * 0.64, 0.12]} />
        <meshStandardMaterial
          color='#6a4e36'
          roughness={0.9}
          metalness={0.02}
          wireframe={wireframe}
        />
      </mesh>
      {[
        [-dims.widthFt * 0.44, dims.seatHeightFt * 0.36, -dims.depthFt * 0.22],
        [dims.widthFt * 0.44, dims.seatHeightFt * 0.36, -dims.depthFt * 0.22],
        [-dims.widthFt * 0.44, dims.seatHeightFt * 0.36, dims.depthFt * 0.22],
        [dims.widthFt * 0.44, dims.seatHeightFt * 0.36, dims.depthFt * 0.22],
      ].map(([legX, legY, legZ], index) => (
        <mesh key={index} position={[legX, legY, legZ]}>
          <boxGeometry args={[0.12, dims.seatHeightFt * 0.8, 0.12]} />
          <meshStandardMaterial
            color='#4e3928'
            roughness={0.92}
            metalness={0.02}
            wireframe={wireframe}
          />
        </mesh>
      ))}
    </group>
  );
}

function getRectangularSideLabel(
  x: number,
  z: number,
  halfWidthFt: number,
  halfDepthFt: number,
): 'N' | 'E' | 'S' | 'W' {
  const northDistance = Math.abs(halfDepthFt - z);
  const southDistance = Math.abs(-halfDepthFt - z);
  const eastDistance = Math.abs(halfWidthFt - x);
  const westDistance = Math.abs(-halfWidthFt - x);
  const minDistance = Math.min(
    northDistance,
    southDistance,
    eastDistance,
    westDistance,
  );

  if (minDistance === northDistance) {
    return 'N';
  }
  if (minDistance === southDistance) {
    return 'S';
  }
  if (minDistance === eastDistance) {
    return 'E';
  }
  return 'W';
}

function seededUnitVariation(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

type RockVisualStyle = 'ledgestone' | 'fieldstone' | 'mosaic';

function getRockArchetypeIndex(
  style: RockVisualStyle,
  courseIndex: number,
  unitIndex: number,
  patternLength: number,
): number {
  const styleOffset =
    style === 'ledgestone' ? 17 : style === 'mosaic' ? 43 : 29;
  const hash =
    (courseIndex * 31 + unitIndex * 17 + styleOffset) % patternLength;
  return Math.abs(hash);
}

/** Format a feet value as feet-and-inches string, e.g. 3.5 → "3' 6\"" */
function fmtFt(ft: number): string {
  const totalIn = Math.round(ft * 12);
  const f = Math.floor(totalIn / 12);
  const i = totalIn % 12;
  if (f === 0) return `${i}"`;
  if (i === 0) return `${f}'`;
  return `${f}' ${i}"`;
}

/** Single annotated dimension line with a label pill rendered via Html. */
function DimensionLine({
  start,
  end,
  label,
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  return (
    <>
      <Line points={[start, end]} color='#1d4ed8' lineWidth={1.2} />
      {/* tick marks */}
      <Line
        points={[
          [start[0], start[1] - 0.06, start[2]],
          [start[0], start[1] + 0.06, start[2]],
        ]}
        color='#1d4ed8'
        lineWidth={1.2}
      />
      <Line
        points={[
          [end[0], end[1] - 0.06, end[2]],
          [end[0], end[1] + 0.06, end[2]],
        ]}
        color='#1d4ed8'
        lineWidth={1.2}
      />
      <Html position={mid} center style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.93)',
            color: '#1e3a8a',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            border: '1px solid #93c5fd',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          }}
        >
          {label}
        </div>
      </Html>
    </>
  );
}

/** All dimension annotation lines rendered inside the 3-D scene. */
function DimensionAnnotationsScene({
  innerRadius,
  capOuterRadius,
  wallHeight,
  totalHeight,
  planShape,
  spanWidthFt,
  spanDepthFt,
}: {
  innerRadius: number;
  capOuterRadius: number;
  wallHeight: number;
  totalHeight: number;
  planShape: string;
  spanWidthFt: number;
  spanDepthFt: number;
}) {
  if (planShape === 'circular') {
    const sideX = capOuterRadius + 0.55;
    return (
      <>
        {/* Inner diameter at floor level */}
        <DimensionLine
          start={[-innerRadius, 0.04, 0]}
          end={[innerRadius, 0.04, 0]}
          label={`ID: ${fmtFt(innerRadius * 2)}`}
        />
        {/* Outer (cap) diameter above cap */}
        <DimensionLine
          start={[-capOuterRadius, totalHeight + 0.18, 0]}
          end={[capOuterRadius, totalHeight + 0.18, 0]}
          label={`OD: ${fmtFt(capOuterRadius * 2)}`}
        />
        {/* Wall height — vertical on right side */}
        <DimensionLine
          start={[sideX, 0, 0]}
          end={[sideX, wallHeight, 0]}
          label={`Wall: ${fmtFt(wallHeight)}`}
        />
        {/* Total height — slightly further out */}
        <DimensionLine
          start={[sideX + 0.55, 0, 0]}
          end={[sideX + 0.55, totalHeight, 0]}
          label={`Total: ${fmtFt(totalHeight)}`}
        />
      </>
    );
  }

  // Rectangular / square
  const halfW = spanWidthFt / 2;
  const halfD = spanDepthFt / 2;
  const sideX = halfW + 0.55;
  return (
    <>
      {/* Width — above cap along X */}
      <DimensionLine
        start={[-halfW, totalHeight + 0.18, 0]}
        end={[halfW, totalHeight + 0.18, 0]}
        label={`W: ${fmtFt(spanWidthFt)}`}
      />
      {/* Depth — above cap along Z */}
      <DimensionLine
        start={[0, totalHeight + 0.18, -halfD]}
        end={[0, totalHeight + 0.18, halfD]}
        label={`D: ${fmtFt(spanDepthFt)}`}
      />
      {/* Wall height */}
      <DimensionLine
        start={[sideX, 0, 0]}
        end={[sideX, wallHeight, 0]}
        label={`Wall: ${fmtFt(wallHeight)}`}
      />
      {/* Total height */}
      <DimensionLine
        start={[sideX + 0.55, 0, 0]}
        end={[sideX + 0.55, totalHeight, 0]}
        label={`Total: ${fmtFt(totalHeight)}`}
      />
    </>
  );
}

export default function Stage3D({
  output,
  seatingFurnitureCount,
  captureSignal,
  glbExportSignal,
  onStakeholderRenderComplete,
  onModelExportComplete,
}: Stage3DProps) {
  const [wireframe, setWireframe] = useState(false);
  const [showBrickOutlines, setShowBrickOutlines] = useState(true);
  const [showFlame, setShowFlame] = useState(false);
  const [showSeatingGuides, setShowSeatingGuides] = useState(true);
  const [mortarMode, setMortarMode] = useState<MortarMode>('solid');
  const [materialStyle, setMaterialStyle] =
    useState<MaterialStyle>('classic-red');
  const [stoneTightness, setStoneTightness] = useState(68);
  const [archetypePatternLength, setArchetypePatternLength] = useState(5);
  const [webglBlocked, setWebglBlocked] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [enableAdvancedEffects, setEnableAdvancedEffects] = useState(true);
  const [activeCameraPreset, setActiveCameraPreset] = useState<string | null>(null);
  const [cutawayMode, setCutawayMode] = useState<CutawayMode>('off');
  const [stageLodLevel, setStageLodLevel] = useState<StageLodLevel>('high');
  const [webglBlockReason, setWebglBlockReason] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [hoveredBrickId, setHoveredBrickId] = useState<string | null>(null);
  const [selectedBrick, setSelectedBrick] = useState<BrickSelectionInfo | null>(
    null,
  );
  const [showDimensions, setShowDimensions] = useState(false);
  const orbitRef = useRef<OrbitHandle>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const lastCaptureSignalRef = useRef<number | null | undefined>(undefined);
  const lastGlbExportSignalRef = useRef<number | null | undefined>(undefined);

  // No proactive WebGL check on mount — the Canvas onCreated/onError callbacks
  // handle detection. Probing here would burn a WebGL context slot unnecessarily.

  useEffect(() => {
    if (captureSignal == null) {
      return;
    }

    if (lastCaptureSignalRef.current === captureSignal) {
      return;
    }

    lastCaptureSignalRef.current = captureSignal;

    if (webglBlocked) {
      onStakeholderRenderComplete?.({
        ok: false,
        message: 'Stakeholder render unavailable while WebGL is blocked.',
      });
      return;
    }

    // Move to a premium hero angle before capturing
    if (orbitRef.current) {
      orbitRef.current.target.set(0, 0.85, 0);
      orbitRef.current.object.position.set(3.4, 3.8, 4.6);
      orbitRef.current.update();
    }

    // Wait several frames so shadows and textures fully settle at the new angle
    let framesLeft = 6;
    const waitAndCapture = () => {
      framesLeft -= 1;
      if (framesLeft > 0) {
        requestAnimationFrame(waitAndCapture);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        onStakeholderRenderComplete?.({
          ok: false,
          message: 'Stakeholder render failed: 3D canvas not ready.',
        });
        return;
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `firepit-stakeholder-render-${stamp}.png`;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onStakeholderRenderComplete?.({
        ok: true,
        message: `Downloaded stakeholder render: ${fileName}`,
      });
    };
    requestAnimationFrame(waitAndCapture);
  }, [captureSignal, onStakeholderRenderComplete, webglBlocked]);

  useEffect(() => {
    if (glbExportSignal == null) {
      return;
    }

    if (lastGlbExportSignalRef.current === glbExportSignal) {
      return;
    }
    lastGlbExportSignalRef.current = glbExportSignal;

    if (webglBlocked) {
      onModelExportComplete?.({
        ok: false,
        message: 'GLB export unavailable while WebGL is blocked.',
      });
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const triggerDownload = (blob: Blob, fileName: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    let cancelled = false;
    let rafId: number | null = null;
    const maxSceneWaitFrames = 45;

    const exportWhenReady = async (waitFrame = 0) => {
      if (cancelled) {
        return;
      }

      const scene = sceneRef.current;
      if (!scene) {
        if (waitFrame < maxSceneWaitFrames) {
          rafId = requestAnimationFrame(() => exportWhenReady(waitFrame + 1));
          return;
        }
        onModelExportComplete?.({
          ok: false,
          message:
            'GLB export failed: 3D scene was not ready. Try again after the preview fully loads.',
        });
        return;
      }

      try {
        const exportScene = scene.clone(true);
        exportScene.traverse((node) => {
          const meshNode = node as Mesh & {
            material?: unknown;
          };
          if (!meshNode.material) {
            return;
          }

          const materialList = Array.isArray(meshNode.material)
            ? meshNode.material
            : [meshNode.material];

          for (const material of materialList) {
            const mat = material as unknown as {
              map?: unknown;
              alphaMap?: unknown;
              aoMap?: unknown;
              bumpMap?: unknown;
              displacementMap?: unknown;
              emissiveMap?: unknown;
              envMap?: unknown;
              lightMap?: unknown;
              metalnessMap?: unknown;
              normalMap?: unknown;
              roughnessMap?: unknown;
              specularMap?: unknown;
            };
            // CAD-safe export path: remove texture maps that can include runtime
            // image sources unsupported by GLTFExporter (e.g. procedural maps).
            mat.map = null;
            mat.alphaMap = null;
            mat.aoMap = null;
            mat.bumpMap = null;
            mat.displacementMap = null;
            mat.emissiveMap = null;
            mat.envMap = null;
            mat.lightMap = null;
            mat.metalnessMap = null;
            mat.normalMap = null;
            mat.roughnessMap = null;
            mat.specularMap = null;
          }
        });

        const exporter = new GLTFExporter();
        const result = await exporter.parseAsync(exportScene, {
          binary: true,
          onlyVisible: true,
          trs: false,
        });

        if (result instanceof ArrayBuffer) {
          const fileName = `firepit-model-${stamp}.glb`;
          triggerDownload(new Blob([result], { type: 'model/gltf-binary' }), fileName);
          onModelExportComplete?.({
            ok: true,
            message: `Downloaded 3D model: ${fileName}`,
          });
          return;
        }

        const fallbackName = `firepit-model-${stamp}.gltf`;
        triggerDownload(
          new Blob([JSON.stringify(result, null, 2)], {
            type: 'model/gltf+json',
          }),
          fallbackName,
        );
        onModelExportComplete?.({
          ok: true,
          message: `Downloaded 3D model as ${fallbackName} (JSON glTF fallback).`,
        });
      } catch (error) {
        onModelExportComplete?.({
          ok: false,
          message: `GLB export failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    };

    exportWhenReady();
    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [glbExportSignal, onModelExportComplete, webglBlocked]);

  // Proactive check: detect GPU-disabled / hardware acceleration off BEFORE
  // mounting the Canvas. The probe releases its context immediately so it
  // doesn't consume a slot. This also catches the R3F v9 edge case where
  // WebGLRenderer failures throw as unhandled Promise rejections that bypass
  // React Error Boundaries.
  useEffect(() => {
    if (!canCreateWebGLContext()) {
      setWebglBlocked(true);
      setWebglBlockReason(
        'Hardware acceleration appears to be disabled. ' +
        'In Chrome: open chrome://settings/system and enable "Use graphics acceleration when available", then restart.',
      );
    }
  }, []);

  // Belt-and-suspenders: catch R3F WebGL errors that propagate as unhandled
  // Promise rejections (they bypass React Error Boundaries in R3F v9).
  useEffect(() => {
    const handler = (evt: PromiseRejectionEvent) => {
      const msg = String(evt.reason?.message ?? evt.reason ?? '');
      if (/webgl context/i.test(msg)) {
        setWebglBlocked(true);
        setWebglBlockReason(
          'WebGL failed to initialize (' + msg + '). ' +
          'Enable hardware acceleration in your browser settings.',
        );
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  const geometry = useMemo(() => computeStage3DGeometry(output), [output]);
  const cameraPresets = useMemo(() => getCameraPresets(geometry), [geometry]);
  const { animateToPreset } = useCameraAnimation(orbitRef as any);

  const brickLengthFt = output.resolvedUnit.lengthIn / 12;
  const brickHeightFt = output.resolvedUnit.heightIn / 12;
  const brickWidthFt = output.resolvedUnit.widthIn / 12;
  const shimUnit = output.courseStrategy.shimUnit;
  const shimLengthFt = (shimUnit?.lengthIn ?? 1.25) / 12;
  const shimHeightFt =
    (shimUnit?.heightIn ?? output.resolvedUnit.heightIn) / 12;
  const shimWidthFt = (shimUnit?.widthIn ?? 1.125) / 12;
  const capBrickLengthFt = output.resolvedCapUnit.lengthIn / 12;
  const capBrickHeightFt = output.resolvedCapUnit.heightIn / 12;
  const mortarJointFt = output.mortarJointIn / 12;
  const wallHeightFt = geometry.capRiseFt;
  const linerHeightFt = Math.max(0.12, wallHeightFt - mortarJointFt);
  const linerMidY = linerHeightFt / 2;
  const visBrickLengthFt = brickLengthFt - mortarJointFt * 0.55;
  const visBrickHeightFt = brickHeightFt - mortarJointFt * 0.6;
  const visCapBrickLengthFt = capBrickLengthFt - mortarJointFt * 0.55;
  const visCapBrickHeightFt = capBrickHeightFt - mortarJointFt * 0.6;
  const overlapSafetyFt = Math.max(0.003, mortarJointFt * 0.1);
  const maxWallBrickLengthFt =
    output.cutPlan.centerlineModuleSpacingIn / 12 -
    mortarJointFt * 0.18 -
    overlapSafetyFt;
  const safeWallBrickLengthFt = Math.max(
    0.08,
    Math.min(visBrickLengthFt, maxWallBrickLengthFt),
  );
  const capModuleSpacingFt =
    output.capstone.capUnitsPerCourseRounded > 0
      ? (output.planShape === 'circular'
          ? (Math.PI * output.capstone.capCenterlineDiameterIn) /
            output.capstone.capUnitsPerCourseRounded
          : (2 *
              (output.capstone.capCenterlineWidthIn +
                output.capstone.capCenterlineDepthIn)) /
            output.capstone.capUnitsPerCourseRounded) / 12
      : visCapBrickLengthFt;
  const capJointLengthFt = Math.max(
    0,
    output.capstone.joint.actualJointIn / 12,
  );
  const safeCapBrickLengthFt = Math.max(
    0.08,
    Math.min(
      capBrickLengthFt,
      capModuleSpacingFt - capJointLengthFt - overlapSafetyFt,
    ),
  );
  const visBrickWidthFt = brickWidthFt - mortarJointFt * 0.8;
  const ventAreaScale = Math.sqrt(
    Math.max(1, output.ventSpec.openingAreaSqIn) / 5,
  );
  const ventOpeningLengthFt = Math.min(
    safeWallBrickLengthFt * 0.96,
    Math.max(
      safeWallBrickLengthFt * 0.32,
      safeWallBrickLengthFt * 0.56 * ventAreaScale,
    ),
  );
  const ventOpeningHeightFt = Math.min(
    visBrickHeightFt * 0.96,
    Math.max(visBrickHeightFt * 0.3, visBrickHeightFt * 0.56 * ventAreaScale),
  );
  const capUnitWidthFt = output.resolvedCapUnit.widthIn / 12;
  const capBrickWidthFt = Math.max(0.05, capUnitWidthFt - mortarJointFt * 0.4);
  const isHalfRoundCap = isHalfRoundCapUnit(output.resolvedCapUnit.name);
  const wallRequiresTaperCut =
    output.planShape === 'circular' && output.cutPlan.requiresCutting;
  const renderedCapInnerRadiusFt = Math.max(
    0.01,
    geometry.capRadiusFt - capBrickWidthFt / 2,
  );
  const renderedCapOuterRadiusFt = geometry.capRadiusFt + capBrickWidthFt / 2;
  const renderedWallInnerRadiusFt = Math.max(
    0.01,
    geometry.wallRadiusFt - visBrickWidthFt / 2,
  );
  const renderedWallOuterRadiusFt = geometry.wallRadiusFt + visBrickWidthFt / 2;
  const capRequiresTaperCut =
    output.planShape === 'circular' && output.capstone.requiresTaperCutting;
  const renderedWallBrickLengthFt =
    output.planShape === 'circular' && !wallRequiresTaperCut
      ? Math.max(
          0.08,
          Math.min(
            safeWallBrickLengthFt,
            arcToChordLengthFt(safeWallBrickLengthFt, geometry.wallRadiusFt),
          ),
        )
      : safeWallBrickLengthFt;
  const renderedCapBrickLengthFt =
    output.planShape === 'circular' && !capRequiresTaperCut
      ? Math.max(
          0.08,
          Math.min(
            safeCapBrickLengthFt,
            arcToChordLengthFt(safeCapBrickLengthFt, geometry.capRadiusFt),
          ),
        )
      : safeCapBrickLengthFt;
  const renderedCapJointLengthFt =
    output.planShape === 'circular' && !capRequiresTaperCut
      ? Math.max(
          0,
          Math.min(
            capJointLengthFt,
            arcToChordLengthFt(capJointLengthFt, geometry.capRadiusFt),
          ),
        )
      : capJointLengthFt;
  const capMortarBedHeightFt = Math.max(0.02, mortarJointFt * 0.55);
  const capMortarBedY = geometry.capRiseFt + capMortarBedHeightFt / 2;
  const capJointWidthFt = Math.max(0.03, capBrickWidthFt * 0.86);
  const capJointHeightFt = Math.max(0.03, visCapBrickHeightFt * 0.94);
  const capCornerJointSizeFt = Math.max(
    0.04,
    Math.min(
      capBrickWidthFt * 0.42,
      Math.max(capJointLengthFt, mortarJointFt * 0.7),
    ),
  );
  const halfRoundCrownRadiusFt = Math.min(
    capBrickWidthFt * 0.42,
    Math.max(0.04, visCapBrickHeightFt * 0.42),
  );
  const halfRoundBaseHeightFt = Math.max(
    0.04,
    visCapBrickHeightFt - halfRoundCrownRadiusFt,
  );
  const capCutStatusTone = capRequiresTaperCut
    ? 'border-red-800/30 bg-red-50 text-red-900'
    : 'border-emerald-700/30 bg-emerald-50 text-emerald-900';
  const wallCutStatusTone = wallRequiresTaperCut
    ? 'border-red-800/30 bg-red-50 text-red-900'
    : 'border-emerald-700/30 bg-emerald-50 text-emerald-900';
  const wallCutStatusText = wallRequiresTaperCut
    ? 'Wall taper cuts required'
    : 'Wall taper cuts not required';
  const capCutStatusText = capRequiresTaperCut
    ? 'Capstone taper cuts required'
    : 'Capstone taper cuts not required';
  const isRockWallVisual = /natural stone/i.test(output.resolvedUnit.name);
  const rockVisualStyle: RockVisualStyle = output.resolvedUnit.name
    .toLowerCase()
    .includes('ledgestone')
    ? 'ledgestone'
    : output.resolvedUnit.name.toLowerCase().includes('mosaic')
      ? 'mosaic'
      : 'fieldstone';
  const wallLegendLabel = isRockWallVisual ? 'Wall Rock' : 'Wall Brick';
  const capLegendLabel = isHalfRoundCap ? 'Cap Unit (Half-Round)' : 'Cap Unit';
  const rockPalette =
    materialStyle === 'charcoal'
      ? ['#6b6460', '#5f5956', '#7a726c', '#8b8177']
      : materialStyle === 'limestone'
        ? ['#d1c4ad', '#c7b99f', '#ded2bf', '#bcae94']
        : ['#9d7a5a', '#8f6a4a', '#aa8665', '#7d5e45'];
  const tightness = Math.min(100, Math.max(0, stoneTightness)) / 100;
  const rockSolidMortarOpacityByStyle: Record<typeof rockVisualStyle, number> =
    {
      ledgestone: 0.5,
      fieldstone: 0.58,
      mosaic: 0.64,
    };
  const showMortar = mortarMode !== 'off';
  const mortarOpacity =
    mortarMode === 'ghost'
      ? 0.25
      : isRockWallVisual
        ? Math.max(
            0.38,
            rockSolidMortarOpacityByStyle[rockVisualStyle] - tightness * 0.08,
          )
        : 0.96;
  const mortarDepthWrite = mortarMode !== 'ghost' && !isRockWallVisual;

  // For rock walls, reduce mortar radial extent so stones poke out naturally
  const mortarOuterRadiusOffset = isRockWallVisual
    ? visBrickWidthFt * 0.35 // ~35% of stone width, leaving 65% to poke out
    : brickWidthFt / 2;
  const mortarInnerRadiusOffset = isRockWallVisual
    ? visBrickWidthFt * 0.35
    : brickWidthFt / 2;
  // Bed joints taller in rock mode to fill vertical gaps better
  const bedJointHeightFt = isRockWallVisual
    ? mortarJointFt * 1.8
    : mortarJointFt;

  const palette = STYLE_PALETTES[materialStyle];
  const isPhotoreal = true;
  const lightingConfig = isPhotoreal ? PHOTOREAL_LIGHTING : STYLIZED_LIGHTING;
  const effectiveWireframe = wireframe;
  const effectiveShowBrickOutlines = showBrickOutlines;
  const seatingArea = output.logistics.seatingAreaMaterials;
  const seatingShape = seatingArea?.shape ?? 'circular';
  const seatingFurnitureStyle = seatingArea?.furnitureStyle ?? 'adirondack';
  const seatingDensity = seatingArea?.density ?? 'standard';
  const seatingSurfaceVisual = seatingArea
    ? getSeatingSurfaceVisual(seatingArea.groundType)
    : undefined;
  const maxSeatingReferenceCount = seatingArea
    ? getMaxCircularSeatingCount(
        seatingArea.radiusFt,
        seatingFurnitureStyle,
        seatingDensity,
      )
    : 0;
  const resolvedSeatingReferenceCount = seatingArea
    ? clampSeatingFurnitureCount(
        seatingFurnitureCount,
        maxSeatingReferenceCount,
      )
    : 0;
  const seatingReferencePlacements = seatingArea
    ? buildSeatingReferencePlacements(
        seatingShape,
        seatingArea.radiusFt,
        resolvedSeatingReferenceCount,
        getSeatingGuideInsetFt(seatingFurnitureStyle, seatingDensity),
        seatingDensity,
        seatingFurnitureStyle,
      )
    : [];
  const stageGroundRadiusFt = getStageGroundRadiusForShapeFt(
    seatingArea?.radiusFt,
    seatingShape,
  );
  const cameraDistanceFt = Math.max(5.2, stageGroundRadiusFt * 1.35);
  const topCameraHeightFt = Math.max(6, stageGroundRadiusFt * 1.55);
  const orbitMaxDistanceFt = Math.max(9, stageGroundRadiusFt * 2.6);
  const cutawayThetaStartRad =
    cutawayMode === 'half' ? Math.PI / 2 : cutawayMode === 'quarter' ? Math.PI / 2 : 0;
  const cutawayThetaLengthRad =
    cutawayMode === 'half'
      ? Math.PI
      : cutawayMode === 'quarter'
        ? Math.PI * 1.5
        : Math.PI * 2;
  const shouldRenderInCutaway = (x: number, z: number) => {
    if (cutawayMode === 'off') {
      return true;
    }
    if (cutawayMode === 'half') {
      return x <= 0;
    }
    return !(x > 0 && z > 0);
  };
  const getLodLevelForDistance = (distanceFt: number): StageLodLevel => {
    if (distanceFt <= stageGroundRadiusFt * 1.55) {
      return 'high';
    }
    if (distanceFt <= stageGroundRadiusFt * 2.15) {
      return 'medium';
    }
    return 'low';
  };
  const isLodHigh = stageLodLevel === 'high';
  const isLodMedium = stageLodLevel === 'medium';
  const textureMaps = useMemo(() => {
    const loader = new TextureLoader();
    const brickDiffuseMap = loader.load('/textures/brick_diffuse.jpg');
    const brickBumpMap = loader.load('/textures/brick_bump.jpg');
    const brickRoughnessMap = loader.load('/textures/brick_roughness.jpg');
    const groundDiffuseMap = loader.load('/textures/ground_dirt.jpg');

    const colorMaps = [brickDiffuseMap, groundDiffuseMap];
    colorMaps.forEach((texture) => {
      if (!texture) {
        return;
      }
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.colorSpace = SRGBColorSpace;
    });

    if (brickDiffuseMap) {
      brickDiffuseMap.repeat.set(1.4, 0.95);
    }

    [brickBumpMap, brickRoughnessMap].forEach((texture) => {
      if (!texture) {
        return;
      }
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(1.4, 0.95);
    });

    if (groundDiffuseMap) {
      groundDiffuseMap.repeat.set(2.2, 2.2);
    }

    return {
      brickDiffuseMap,
      brickBumpMap,
      brickRoughnessMap,
      groundDiffuseMap,
    };
  }, []);
  const { brickDiffuseMap, brickBumpMap, brickRoughnessMap, groundDiffuseMap } =
    textureMaps;

  const brickAlbedoTexture = useMemo(() => {
    const texture = createProceduralTexture((ctx, size) => {
      ctx.fillStyle = palette.proceduralBrickFill;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(45, 18, 8, 0.24)';
      for (let y = 18; y < size; y += 26) {
        ctx.fillRect(0, y, size, 2);
      }
      paintNoise(ctx, size, 0.24, 2400);
    });
    if (texture) {
      texture.colorSpace = SRGBColorSpace;
      texture.repeat.set(1.6, 1.1);
    }
    return texture;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialStyle]);
  const capAlbedoTexture = useMemo(() => {
    const texture = createProceduralTexture((ctx, size) => {
      ctx.fillStyle = palette.proceduralCapFill;
      ctx.fillRect(0, 0, size, size);
      paintNoise(ctx, size, 0.2, 1800);
    });
    if (texture) {
      texture.colorSpace = SRGBColorSpace;
      texture.repeat.set(1.4, 1.1);
    }
    return texture;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialStyle]);
  const mortarTexture = useMemo(() => {
    const texture = createProceduralTexture((ctx, size) => {
      ctx.fillStyle = palette.proceduralMortarFill;
      ctx.fillRect(0, 0, size, size);
      paintNoise(ctx, size, 0.15, 2200);
    });
    if (texture) {
      texture.colorSpace = SRGBColorSpace;
      texture.repeat.set(1.2, 1.2);
    }
    return texture;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialStyle]);
  const seatingTexture = useMemo(() => {
    if (!seatingSurfaceVisual) {
      return undefined;
    }

    const texture = createProceduralTexture((ctx, size) => {
      paintSeatingPattern(ctx, size, seatingSurfaceVisual);
    });
    if (texture) {
      texture.colorSpace = SRGBColorSpace;
      texture.repeat.set(2.6, 2.6);
    }
    return texture;
  }, [seatingSurfaceVisual]);
  const innerVoidRadiusFt =
    output.linerSpec.enabled && geometry.linerInnerRadiusFt > 0
      ? geometry.linerInnerRadiusFt
      : Math.min(geometry.wallSpanWidthFt, geometry.wallSpanDepthFt) / 2 -
        brickWidthFt / 2;
  const gasPlacement =
    output.ventSpec.gasLineEntryBrickIndex === undefined
      ? undefined
      : getPlacement(
          output,
          output.ventSpec.gasLineEntryBrickIndex,
          output.courses[0].unitCount,
          0,
          geometry.wallSpanWidthFt,
          geometry.wallSpanDepthFt,
          geometry.wallRadiusFt,
        );

  const getWallCourseColor = (course: MasonryOutput['courses'][number]) => {
    if (course.specialCourse === 'vented-accent') {
      return '#8a5a13';
    }

    if (course.specialCourse === 'shim-spacer') {
      return '#5f4f96';
    }

    return course.courseIndex % 2 === 0
      ? palette.wallEvenColor
      : palette.wallOddColor;
  };

  const getWallBrickColor = (
    course: MasonryOutput['courses'][number],
    isSpacer: boolean,
  ) => {
    if (isSpacer) {
      return '#6f58b5';
    }

    return getWallCourseColor(course);
  };

  const isBrickSelected = (brickId: string) => selectedBrick?.id === brickId;
  const isBrickHovered = (brickId: string) => hoveredBrickId === brickId;
  const getBrickEdgeColor = (brickId: string, defaultColor: string) => {
    if (isBrickSelected(brickId)) {
      return '#0c4a6e';
    }
    if (isBrickHovered(brickId)) {
      return '#1d4ed8';
    }
    return defaultColor;
  };
  const getBrickEmissiveIntensity = (brickId: string) =>
    isBrickSelected(brickId) ? 0.18 : isBrickHovered(brickId) ? 0.1 : 0;

  const handleBrickPointerOver =
    (brickId: string) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHoveredBrickId(brickId);
    };

  const handleBrickPointerOut =
    (brickId: string) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHoveredBrickId((current) => (current === brickId ? null : current));
    };

  const handleBrickSelect =
    (info: BrickSelectionInfo) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setSelectedBrick((current) => (current?.id === info.id ? null : info));
    };

  const topDown = () => {
    if (!orbitRef.current) {
      return;
    }

    orbitRef.current.target.set(0, wallHeightFt / 2, 0);
    orbitRef.current.object.position.set(0, topCameraHeightFt, 0.001);
    orbitRef.current.update();
  };

  const sideView = () => {
    if (!orbitRef.current) {
      return;
    }

    orbitRef.current.target.set(0, wallHeightFt / 3, 0);
    orbitRef.current.object.position.set(
      0,
      Math.max(2.4, stageGroundRadiusFt * 0.72),
      cameraDistanceFt,
    );
    orbitRef.current.update();
  };

  const handleOrbitChange = () => {
    const controls = orbitRef.current as unknown as {
      object?: { position?: { distanceTo?: (target: unknown) => number } };
      target?: unknown;
    } | null;
    const position = controls?.object?.position;
    if (!position?.distanceTo || !controls?.target) {
      return;
    }

    const distanceFt = position.distanceTo(controls.target);
    const nextLodLevel = getLodLevelForDistance(distanceFt);
    setStageLodLevel((current) => (current === nextLodLevel ? current : nextLodLevel));
  };

  const retryWebglStage = () => {
    if (!canCreateWebGLContext()) {
      // Still broken — give an actionable message rather than silently failing
      setWebglBlockReason(
        'Hardware acceleration is still unavailable. ' +
        'In Chrome: go to chrome://settings/system → enable "Use graphics acceleration when available" → restart Chrome. ' +
        'In Edge: edge://settings/system → same toggle.',
      );
      return;
    }
    // GPU is usable again — force a fresh Canvas mount via key change
    setWebglBlockReason(null);
    setWebglBlocked(false);
    setCanvasKey((k) => k + 1);
  };
  useEffect(() => {
    setStageLodLevel(getLodLevelForDistance(cameraDistanceFt));
    setHoveredBrickId(null);
    setSelectedBrick(null);
  }, [cameraDistanceFt]);

  useEffect(() => {
    if (!isLodHigh) {
      setHoveredBrickId(null);
      setSelectedBrick(null);
    }
  }, [isLodHigh]);

  useEffect(() => {
    setHoveredBrickId(null);
    setSelectedBrick(null);
  }, [cutawayMode]);

  return (
    <div className='card-rise relative h-[620px] rounded-2xl border border-amber-900/20 bg-amber-100/70 p-2 shadow-lg sm:h-[680px]'>
      <div className='absolute right-2 top-2 z-10 flex flex-col items-end gap-2 sm:right-4 sm:top-4'>
        {/* Hoverable wrapper - always has presence for hover detection */}
        <div
          className='flex flex-col items-end gap-2'
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Main controls panel - expands on hover */}
          <div
            className='overflow-y-auto overflow-x-hidden transition-all duration-300 ease-out'
            style={{
              maxWidth: showControls ? '300px' : '0px',
              maxHeight: showControls ? '640px' : '0px',
              opacity: showControls ? 1 : 0,
            }}
          >
            <div className='rounded-xl bg-amber-50/95 px-3 py-2 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <p className='mb-1 text-[10px] uppercase tracking-wide text-amber-900/70'>
                Mortar
              </p>
              <div className='flex gap-1'>
                {(['solid', 'ghost', 'off'] as MortarMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`rounded-full px-2 py-1 ${mortarMode === mode ? 'bg-amber-900 text-amber-50' : 'bg-amber-200/80 text-amber-950'}`}
                    onClick={() => setMortarMode(mode)}
                    aria-label={`Set mortar mode to ${mode}`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className='mt-2 rounded-xl bg-amber-50/95 px-3 py-2 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <p className='mb-1 text-[10px] uppercase tracking-wide text-amber-900/70'>
                Style
              </p>
              <div className='flex gap-1.5'>
                {(
                  ['classic-red', 'charcoal', 'limestone'] as MaterialStyle[]
                ).map((s) => (
                  <button
                    key={s}
                    style={{ backgroundColor: STYLE_PALETTES[s].swatch }}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${
                      materialStyle === s
                        ? 'scale-110 border-amber-900'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    onClick={() => setMaterialStyle(s)}
                    aria-label={`Set style to ${STYLE_PALETTES[s].label}`}
                    title={STYLE_PALETTES[s].label}
                  />
                ))}
              </div>
            </div>

            {isRockWallVisual && (
              <>
                <div className='mt-2 rounded-xl bg-amber-50/95 px-3 py-2 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
                  <div className='mb-1 flex items-center justify-between'>
                    <p className='text-[10px] uppercase tracking-wide text-amber-900/70'>
                      Stone Tightness
                    </p>
                    <span className='text-[10px] text-amber-900/80'>
                      {Math.round(stoneTightness)}%
                    </span>
                  </div>
                  <input
                    type='range'
                    min={0}
                    max={100}
                    step={1}
                    value={stoneTightness}
                    onChange={(event) =>
                      setStoneTightness(Number(event.target.value))
                    }
                    className='w-full accent-amber-900'
                    aria-label='Stone tightness'
                    title='Stone tightness'
                  />
                </div>
                <div className='mt-2 rounded-xl bg-amber-50/95 px-3 py-2 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
                  <div className='mb-2 flex items-center justify-between'>
                    <p className='text-[10px] uppercase tracking-wide text-amber-900/70'>
                      Arch Pattern Length
                    </p>
                    <span className='text-[10px] text-amber-900/80'>
                      {archetypePatternLength}
                    </span>
                  </div>
                  <div className='flex gap-1'>
                    {[3, 5, 7].map((length) => (
                      <button
                        key={length}
                        onClick={() => setArchetypePatternLength(length)}
                        className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${archetypePatternLength === length ? 'bg-amber-900 text-amber-50' : 'bg-amber-200/60 text-amber-900 hover:bg-amber-300/60'}`}
                        title={`Use ${length} repeating shape variants`}
                      >
                        {length}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className='mt-2 flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <span>Wireframe</span>
              <button
                className={`h-5 w-10 rounded-full transition-colors ${wireframe ? 'bg-amber-900' : 'bg-amber-300'}`}
                onClick={() => setWireframe((value) => !value)}
                aria-label='Toggle wireframe'
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${wireframe ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            <div className='mt-2 flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <span>Outlines</span>
              <button
                className={`h-5 w-10 rounded-full transition-colors ${showBrickOutlines ? 'bg-amber-900' : 'bg-amber-300'}`}
                onClick={() => setShowBrickOutlines((value) => !value)}
                aria-label='Toggle brick outlines'
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${showBrickOutlines ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            <div className='mt-2 flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <span>Flame</span>
              <button
                className={`h-5 w-10 rounded-full transition-colors ${showFlame ? 'bg-orange-500' : 'bg-amber-300'}`}
                onClick={() => setShowFlame((value) => !value)}
                aria-label='Toggle flame'
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${showFlame ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            <div className='mt-2 flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <span>FX</span>
              <button
                className={`h-5 w-10 rounded-full transition-colors ${enableAdvancedEffects ? 'bg-blue-500' : 'bg-amber-300'}`}
                onClick={() => setEnableAdvancedEffects((value) => !value)}
                aria-label='Toggle advanced lighting effects'
                title='Toggle bloom and ambient occlusion'
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${enableAdvancedEffects ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            <div className='mt-2 flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <span>Dims</span>
              <button
                className={`h-5 w-10 rounded-full transition-colors ${showDimensions ? 'bg-blue-600' : 'bg-amber-300'}`}
                onClick={() => setShowDimensions((v) => !v)}
                aria-label='Toggle dimension annotations'
                title='Toggle dimension annotations'
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${showDimensions ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {seatingArea && (
              <div className='mt-2 flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
                <span>Seating</span>
                <button
                  className={`h-5 w-10 rounded-full transition-colors ${showSeatingGuides ? 'bg-amber-900' : 'bg-amber-300'}`}
                  onClick={() => setShowSeatingGuides((value) => !value)}
                  aria-label='Toggle seating reference guides'
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${showSeatingGuides ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            )}

            <div className='mt-2 rounded-xl bg-amber-50/95 px-3 py-2 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
              <p className='mb-1 text-[10px] uppercase tracking-wide text-amber-900/70'>
                Cutaway
              </p>
              <div className='flex gap-1'>
                {(['off', 'quarter', 'half'] as CutawayMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCutawayMode(mode)}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                      cutawayMode === mode
                        ? 'bg-amber-900 text-amber-50'
                        : 'bg-amber-200/60 text-amber-900 hover:bg-amber-300/60'
                    }`}
                  >
                    {mode === 'off'
                      ? 'Off'
                      : mode === 'quarter'
                        ? 'Quarter'
                        : 'Half'}
                  </button>
                ))}
              </div>
            </div>

            <div className='mt-2 flex gap-1.5'>
              <button
                className='rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'
                onClick={topDown}
              >
                Top
              </button>
              <button
                className='rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'
                onClick={sideView}
              >
                Side
              </button>
            </div>

            <div className='mt-2 flex flex-col gap-1'>
              <p className='text-[10px] uppercase tracking-wide text-amber-900/70'>Camera Presets</p>
              <div className='flex flex-wrap gap-1'>
                {Object.entries(cameraPresets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => {
                      animateToPreset(preset);
                      setActiveCameraPreset(key);
                    }}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                      activeCameraPreset === key
                        ? 'bg-amber-900 text-amber-50'
                        : 'bg-amber-200/60 text-amber-950 hover:bg-amber-300/60'
                    }`}
                    title={`Switch to ${preset.label}`}
                  >
                    {preset.label.split(' ')[0]}
                  </button>
                ))}
              </div>
              <p className='text-[10px] font-semibold text-amber-900/80'>
                LOD: {stageLodLevel.toUpperCase()}
              </p>
            </div>

            {isLodHigh && selectedBrick && (
              <div className='mt-2 rounded-xl border border-sky-900/25 bg-sky-50/95 px-3 py-2 text-[11px] text-sky-950 shadow sm:text-xs'>
                <p className='text-[10px] font-bold uppercase tracking-wide text-sky-900/80'>
                  Selected Brick
                </p>
                <p className='mt-1 font-semibold'>
                  Course {selectedBrick.courseIndex + 1} · Brick{' '}
                  {selectedBrick.brickIndex + 1}
                </p>
                <p className='mt-1'>
                  Type:{' '}
                  {selectedBrick.kind === 'vent-opening'
                    ? 'Vent opening'
                    : selectedBrick.isSpacer
                      ? 'Shim spacer brick'
                      : 'Wall brick'}
                </p>
                <p>
                  Taper cut:{' '}
                  {selectedBrick.requiresTaperCut ? 'Required' : 'Not required'}
                </p>
              </div>
            )}
          </div>

          {/* Visual queue hint when controls are hidden - gear icon */}
          {!showControls && (
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-amber-50/90 shadow transition-colors hover:bg-amber-100'>
              <svg
                className='h-5 w-5 text-amber-900'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Hoverable legend trigger and panel */}
      <div
        className='absolute left-2 top-2 z-10 sm:left-4 sm:top-4'
        onMouseEnter={() => setShowLegend(true)}
        onMouseLeave={() => setShowLegend(false)}
      >
        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-amber-50/90 shadow transition-colors hover:bg-amber-100'>
          <svg
            className='h-5 w-5 text-amber-900'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        </div>

        <div
          className='mt-2 overflow-hidden transition-all duration-300 ease-out'
          style={{
            maxWidth: showLegend ? '360px' : '0px',
            maxHeight: showLegend ? '520px' : '0px',
            opacity: showLegend ? 1 : 0,
          }}
        >
          <div className='max-w-sm rounded-xl border border-amber-900/15 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-950 shadow sm:text-xs'>
            <p className='mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-900/80 sm:text-xs'>
              3D Legend
            </p>
            <p className='leading-5'>
              <span
                className='mr-1 inline-block h-2 w-2 rounded-full'
                style={{ backgroundColor: palette.wallOddColor }}
              />
              {wallLegendLabel}
            </p>
            {output.courseStrategy.strategy === 'shim-spacer' && (
              <p className='leading-5'>
                <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#5f4f96]' />
                Shim Spacer Course
              </p>
            )}
            {output.courseStrategy.strategy === 'vented-accent' && (
              <p className='leading-5'>
                <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#8a5a13]' />
                Vented Accent Course
              </p>
            )}
            <p className='leading-5'>
              <span
                className='mr-1 inline-block h-2 w-2 rounded-full'
                style={{ backgroundColor: palette.capColor }}
              />
              {capLegendLabel}
            </p>
            <p className='leading-5'>
              <span
                className='mr-1 inline-block h-2 w-2 rounded-full'
                style={{ backgroundColor: palette.mortarColor }}
              />
              Mortar ({mortarMode === 'off' ? 'hidden' : mortarMode})
            </p>
            <p className='leading-5'>
              <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#241a12]' />
              Vent Opening
            </p>
            {output.planShape !== 'circular' && (
              <p className='leading-5'>
                <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#f2f2f2]' />
                Side Labels (N/E/S/W)
              </p>
            )}
            {output.linerSpec.enabled && (
              <p className='leading-5'>
                <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#8e3b2f]' />
                Thermal Liner
              </p>
            )}
            {seatingSurfaceVisual && (
              <p className='leading-5'>
                <span
                  className='mr-1 inline-block h-2 w-2 rounded-full'
                  style={{ backgroundColor: seatingSurfaceVisual.baseColor }}
                />
                Seating Surface ({seatingShape}, {seatingSurfaceVisual.label})
              </p>
            )}
            {seatingArea && showSeatingGuides && (
              <p className='leading-5'>
                <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#f3ece0]' />
                {SEATING_FURNITURE_LABELS[seatingFurnitureStyle]} Guides (
                {SEATING_DENSITY_LABELS[seatingDensity]})
              </p>
            )}
            <p
              className={`mt-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${wallCutStatusTone}`}
            >
              {wallCutStatusText}
            </p>
            <p
              className={`mt-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${capCutStatusTone}`}
            >
              {capCutStatusText}
            </p>
          </div>
        </div>
      </div>

      {webglBlocked ? (
        <div className='absolute inset-2 z-20 flex items-center justify-center rounded-xl border border-red-800/20 bg-red-50/95 p-5'>
          <div className='max-w-md space-y-3 text-center text-red-950'>
            <p className='text-sm font-semibold'>3D stage is temporarily unavailable.</p>
            <p className='text-xs leading-5'>
              WebGL failed to initialize. You can continue planning with the rest of
              the app while 3D is paused.
            </p>
            {webglBlockReason && (
              <p className='rounded-md border border-red-900/20 bg-white/70 px-2 py-1 text-[11px] leading-5 text-red-900'>
                {webglBlockReason}
              </p>
            )}
            <div className='flex items-center justify-center gap-2'>
              <button
                className='rounded-full bg-red-900 px-3 py-1.5 text-xs font-semibold text-red-50'
                onClick={retryWebglStage}
              >
                Retry 3D
              </button>
              <button
                className='rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-900'
                onClick={() => {
                  setEnableAdvancedEffects(false);
                  retryWebglStage();
                }}
              >
                Retry in light mode
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Stage3DCanvasErrorBoundary
          key={canvasKey}
          onError={(reason: string) => {
            setWebglBlocked(true);
            setWebglBlockReason(
              reason
                ? `Render error: ${reason}`
                : 'WebGL context creation failed. Try enabling hardware acceleration in your browser settings.',
            );
          }}
        >
          <Canvas
            key={canvasKey}
            camera={{
              position: [
                0,
                Math.max(2.4, stageGroundRadiusFt * 0.72),
                cameraDistanceFt,
              ],
              fov: 48,
            }}
            dpr={[1, 1.5]}
            frameloop='demand'
            gl={{
              antialias: false,
              powerPreference: 'low-power',
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: true,
            }}
            onCreated={({ gl, scene }) => {
              canvasRef.current = gl.domElement;
              sceneRef.current = scene;
              setWebglBlockReason(null);
            }}
            onPointerMissed={() => {
              setSelectedBrick(null);
              setHoveredBrickId(null);
            }}
            shadows={isPhotoreal}
          >
           <ambientLight intensity={lightingConfig.ambientIntensity} />
           <hemisphereLight args={getActiveHemisphereLightArgs(lightingConfig)} />
           <directionalLight
             position={lightingConfig.directionalPosition}
             intensity={lightingConfig.directionalIntensity}
             castShadow={lightingConfig.castShadows}
             shadow-mapSize-width={lightingConfig.shadowMapSize}
             shadow-mapSize-height={lightingConfig.shadowMapSize}
             shadow-camera-far={50}
             shadow-camera-left={-20}
             shadow-camera-right={20}
             shadow-camera-top={20}
             shadow-camera-bottom={-20}
           />
           {lightingConfig.fillLightIntensity && (
             <directionalLight 
               position={[-4, 3, -3]} 
               intensity={lightingConfig.fillLightIntensity}
             />
           )}
           <Stage3DEffects enabled={enableAdvancedEffects} geometry={geometry} />
           {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
           <OrbitControls
              ref={orbitRef as any}
              enablePan={false}
              maxPolarAngle={Math.PI * 0.49}
              minDistance={2.2}
              maxDistance={orbitMaxDistanceFt}
             onChange={handleOrbitChange}
           />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
              <circleGeometry args={[stageGroundRadiusFt, 96]} />
              <meshStandardMaterial
                color='#dbc8a6'
                map={isPhotoreal ? groundDiffuseMap : undefined}
                roughness={isPhotoreal ? 0.84 : 0.9}
                metalness={isPhotoreal ? 0.02 : 0}
                wireframe={effectiveWireframe}
              />
            </mesh>

            {seatingArea && seatingSurfaceVisual && (
              <>
                {seatingShape === 'circular' ? (
                  <>
                    <mesh
                      rotation={[-Math.PI / 2, 0, 0]}
                      position={[0, -0.012, 0]}
                    >
                      <circleGeometry args={[seatingArea.radiusFt, 96]} />
                      <meshStandardMaterial
                        color={seatingSurfaceVisual.baseColor}
                        map={isPhotoreal ? seatingTexture : undefined}
                        roughness={seatingSurfaceVisual.roughness}
                        metalness={seatingSurfaceVisual.metalness}
                        wireframe={effectiveWireframe}
                      />
                    </mesh>
                    <mesh
                      rotation={[-Math.PI / 2, 0, 0]}
                      position={[0, -0.006, 0]}
                    >
                      <ringGeometry
                        args={[
                          Math.max(0, seatingArea.radiusFt - 0.12),
                          seatingArea.radiusFt,
                          96,
                        ]}
                      />
                      <meshStandardMaterial
                        color={seatingSurfaceVisual.accentColor}
                        roughness={0.9}
                        metalness={0.02}
                        wireframe={effectiveWireframe}
                      />
                    </mesh>
                  </>
                ) : (
                  <>
                    <mesh position={[0, -0.012, 0]}>
                      <boxGeometry
                        args={[
                          seatingArea.overallWidthFt,
                          0.03,
                          seatingArea.overallDepthFt,
                        ]}
                      />
                      <meshStandardMaterial
                        color={seatingSurfaceVisual.baseColor}
                        map={isPhotoreal ? seatingTexture : undefined}
                        roughness={seatingSurfaceVisual.roughness}
                        metalness={seatingSurfaceVisual.metalness}
                        wireframe={effectiveWireframe}
                      />
                    </mesh>
                    <RectangularRing
                      widthFt={seatingArea.overallWidthFt}
                      depthFt={seatingArea.overallDepthFt}
                      thicknessFt={0.12}
                      heightFt={0.03}
                      y={-0.006}
                      color={seatingSurfaceVisual.accentColor}
                      wireframe={effectiveWireframe}
                    />
                  </>
                )}
                {showSeatingGuides && (
                  <>
                    {seatingShape === 'circular' ? (
                      <>
                        <mesh
                          rotation={[-Math.PI / 2, 0, 0]}
                          position={[0, 0.018, 0]}
                        >
                          <ringGeometry
                            args={[
                              Math.max(0, seatingArea.radiusFt - 0.06),
                              seatingArea.radiusFt + 0.02,
                              96,
                            ]}
                          />
                          <meshStandardMaterial
                            color='#f3ece0'
                            roughness={0.9}
                            metalness={0.02}
                            transparent
                            opacity={0.95}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                        <mesh position={[seatingArea.radiusFt / 2, 0.08, 0]}>
                          <boxGeometry
                            args={[seatingArea.radiusFt, 0.03, 0.03]}
                          />
                          <meshStandardMaterial
                            color='#f7f1e8'
                            roughness={0.88}
                            metalness={0.02}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                        <mesh position={[0, 0.08, 0]}>
                          <boxGeometry args={[0.05, 0.22, 0.05]} />
                          <meshStandardMaterial
                            color='#f7f1e8'
                            roughness={0.88}
                            metalness={0.02}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                        <mesh position={[seatingArea.radiusFt, 0.08, 0]}>
                          <boxGeometry args={[0.05, 0.22, 0.05]} />
                          <meshStandardMaterial
                            color='#f7f1e8'
                            roughness={0.88}
                            metalness={0.02}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                        <Html
                          position={[seatingArea.radiusFt / 2, 0.36, 0]}
                          center
                          transform
                          distanceFactor={9}
                        >
                          <div className='rounded-full border border-amber-900/35 bg-white/92 px-2 py-1 text-[10px] font-bold text-amber-950 shadow'>
                            Seating radius {seatingArea.radiusFt.toFixed(1)} ft
                          </div>
                        </Html>
                      </>
                    ) : (
                      <>
                        <RectangularRing
                          widthFt={seatingArea.overallWidthFt}
                          depthFt={seatingArea.overallDepthFt}
                          thicknessFt={0.05}
                          heightFt={0.04}
                          y={0.02}
                          color='#f3ece0'
                          wireframe={effectiveWireframe}
                          opacity={0.95}
                        />
                        <mesh position={[0, 0.08, 0]}>
                          <boxGeometry
                            args={[seatingArea.overallWidthFt, 0.03, 0.03]}
                          />
                          <meshStandardMaterial
                            color='#f7f1e8'
                            roughness={0.88}
                            metalness={0.02}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                        <mesh
                          position={[-seatingArea.overallWidthFt / 2, 0.08, 0]}
                        >
                          <boxGeometry args={[0.05, 0.22, 0.05]} />
                          <meshStandardMaterial
                            color='#f7f1e8'
                            roughness={0.88}
                            metalness={0.02}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                        <mesh
                          position={[seatingArea.overallWidthFt / 2, 0.08, 0]}
                        >
                          <boxGeometry args={[0.05, 0.22, 0.05]} />
                          <meshStandardMaterial
                            color='#f7f1e8'
                            roughness={0.88}
                            metalness={0.02}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                        <Html
                          position={[0, 0.36, 0]}
                          center
                          transform
                          distanceFactor={9}
                        >
                          <div className='rounded-full border border-amber-900/35 bg-white/92 px-2 py-1 text-[10px] font-bold text-amber-950 shadow'>
                            Square seating{' '}
                            {seatingArea.overallWidthFt.toFixed(1)} ft x{' '}
                            {seatingArea.overallDepthFt.toFixed(1)} ft
                          </div>
                        </Html>
                      </>
                    )}
                    {seatingReferencePlacements.map((placement, index) =>
                      seatingFurnitureStyle === 'bench' ? (
                        <SeatingBenchMarker
                          key={`seat-marker-${index}`}
                          x={placement.x}
                          z={placement.z}
                          rotationY={placement.rotationY}
                          wireframe={effectiveWireframe}
                        />
                      ) : (
                        <SeatingChairMarker
                          key={`seat-marker-${index}`}
                          x={placement.x}
                          z={placement.z}
                          rotationY={placement.rotationY}
                          wireframe={effectiveWireframe}
                        />
                      ),
                    )}
                  </>
                )}
              </>
            )}

            {output.planShape === 'circular' ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
                <circleGeometry
                  args={[
                    output.foundation.footprintDiameterIn / 2 / 12,
                    96,
                    cutawayThetaStartRad,
                    cutawayThetaLengthRad,
                  ]}
                />
                <meshStandardMaterial
                  color='#b3a284'
                  map={isPhotoreal ? groundDiffuseMap : undefined}
                  roughness={isPhotoreal ? 0.92 : 1}
                  wireframe={effectiveWireframe}
                />
              </mesh>
            ) : (
              <mesh position={[0, 0.001, 0]}>
                <boxGeometry
                  args={[
                    output.foundation.footprintWidthIn / 12,
                    0.03,
                    output.foundation.footprintDepthIn / 12,
                  ]}
                />
                <meshStandardMaterial
                  color='#b3a284'
                  map={isPhotoreal ? groundDiffuseMap : undefined}
                  roughness={isPhotoreal ? 0.92 : 1}
                  wireframe={effectiveWireframe}
                />
              </mesh>
            )}

            {showMortar && output.planShape === 'circular' ? (
              <group key={`wall-mortar-${mortarMode}`}>
                <mesh position={[0, wallHeightFt / 2, 0]}>
                  <cylinderGeometry
                    args={[
                      geometry.wallRadiusFt + mortarOuterRadiusOffset,
                      geometry.wallRadiusFt + mortarOuterRadiusOffset,
                      wallHeightFt,
                      128,
                      1,
                      true,
                      cutawayThetaStartRad,
                      cutawayThetaLengthRad,
                    ]}
                  />
                  <meshStandardMaterial
                    color={palette.mortarColor}
                    map={isPhotoreal ? mortarTexture : undefined}
                    roughness={isPhotoreal ? 0.88 : 0.93}
                    transparent
                    opacity={mortarOpacity}
                    depthWrite={mortarDepthWrite}
                    wireframe={effectiveWireframe}
                  />
                </mesh>
                <mesh position={[0, wallHeightFt / 2, 0]}>
                  <cylinderGeometry
                    args={[
                      geometry.wallRadiusFt - mortarInnerRadiusOffset,
                      geometry.wallRadiusFt - mortarInnerRadiusOffset,
                      wallHeightFt,
                      128,
                      1,
                      true,
                      cutawayThetaStartRad,
                      cutawayThetaLengthRad,
                    ]}
                  />
                  <meshStandardMaterial
                    color={palette.mortarColor}
                    map={isPhotoreal ? mortarTexture : undefined}
                    roughness={isPhotoreal ? 0.88 : 0.93}
                    side={BackSide}
                    transparent
                    opacity={mortarOpacity}
                    depthWrite={mortarDepthWrite}
                    wireframe={effectiveWireframe}
                  />
                </mesh>
              </group>
            ) : showMortar ? (
              <RectangularRing
                key={`wall-mortar-rect-${mortarMode}`}
                widthFt={geometry.wallSpanWidthFt}
                depthFt={geometry.wallSpanDepthFt}
                thicknessFt={brickWidthFt}
                heightFt={wallHeightFt}
                y={wallHeightFt / 2}
                color={palette.mortarColor}
                wireframe={effectiveWireframe}
                opacity={mortarOpacity}
              />
            ) : null}

            {showMortar &&
              output.planShape === 'circular' &&
              output.courses.map(
                (course) =>
                  course.courseIndex > 0 && (
                    <mesh
                      key={`bed-${course.courseIndex}-${mortarMode}`}
                      rotation={[-Math.PI / 2, 0, 0]}
                      position={[
                        0,
                        course.courseIndex * geometry.courseRiseFt +
                          (isRockWallVisual ? bedJointHeightFt * 0.5 : 0),
                        0,
                      ]}
                    >
                      <ringGeometry
                        args={[
                          geometry.wallRadiusFt - mortarInnerRadiusOffset,
                          geometry.wallRadiusFt + mortarOuterRadiusOffset,
                          128,
                          1,
                          cutawayThetaStartRad,
                          cutawayThetaLengthRad,
                        ]}
                      />
                      <meshStandardMaterial
                        color={palette.mortarColor}
                        map={isPhotoreal ? mortarTexture : undefined}
                        roughness={isPhotoreal ? 0.88 : 0.93}
                        transparent
                        opacity={mortarOpacity}
                        depthWrite={mortarDepthWrite}
                        wireframe={effectiveWireframe}
                      />
                    </mesh>
                  ),
              )}

            {isLodHigh &&
              output.courses.map((course) => (
              <group key={course.courseIndex}>
                {Array.from({ length: course.unitCount }, (_, brickIdx) => {
                  const isSpacer =
                    course.specialCourse === 'shim-spacer' &&
                    !!course.spacerIndexes?.includes(brickIdx);
                  const isVentOpening =
                    output.ventSpec.targetCourseIndexes.includes(
                      course.courseIndex,
                    ) && output.ventSpec.ventBrickIndexes.includes(brickIdx);
                  const placement = getPlacement(
                    output,
                    brickIdx,
                    course.unitCount,
                    course.offsetIn,
                    geometry.wallSpanWidthFt,
                    geometry.wallSpanDepthFt,
                    geometry.wallRadiusFt,
                  );
                  if (!shouldRenderInCutaway(placement.x, placement.z)) {
                    return null;
                  }
                  const y =
                    (isSpacer ? shimHeightFt : brickHeightFt) / 2 +
                    course.courseIndex * geometry.courseRiseFt +
                    mortarJointFt / 2;
                  const wallBrickQuad = wallRequiresTaperCut
                    ? buildCircularCapBrickQuad({
                        centerlineRadiusFt: geometry.wallRadiusFt,
                        innerRadiusFt: renderedWallInnerRadiusFt,
                        outerRadiusFt: renderedWallOuterRadiusFt,
                        brickLengthIn: renderedWallBrickLengthFt * 12,
                      })
                    : undefined;
                  const perBrickColor = getWallBrickColor(course, isSpacer);
                  const renderedLengthFt = isSpacer
                    ? Math.max(0.05, shimLengthFt - mortarJointFt * 0.35)
                    : renderedWallBrickLengthFt;
                  const renderedHeightFt = isSpacer
                    ? Math.max(0.05, shimHeightFt - mortarJointFt * 0.35)
                    : visBrickHeightFt;
                  const renderedWidthFt = isSpacer
                    ? Math.max(0.04, shimWidthFt - mortarJointFt * 0.35)
                    : visBrickWidthFt;
                  const brickId = `${course.courseIndex}-${brickIdx}`;
                  const brickInfo: BrickSelectionInfo = {
                    id: brickId,
                    courseIndex: course.courseIndex,
                    brickIndex: brickIdx,
                    kind: isVentOpening ? 'vent-opening' : 'wall-brick',
                    isSpacer,
                    requiresTaperCut: wallRequiresTaperCut && !isSpacer,
                    isVent: isVentOpening,
                  };

                  return isVentOpening ? (
                    <group key={`${course.courseIndex}-${brickIdx}-vent`}>
                      <mesh
                        position={[placement.x, y, placement.z]}
                        rotation={[0, placement.rotationY, 0]}
                        onPointerOver={handleBrickPointerOver(brickId)}
                        onPointerOut={handleBrickPointerOut(brickId)}
                        onClick={handleBrickSelect(brickInfo)}
                      >
                        <boxGeometry
                          args={[
                            ventOpeningLengthFt,
                            ventOpeningHeightFt,
                            brickWidthFt + 0.05,
                          ]}
                        />
                        <meshStandardMaterial
                          color='#241a12'
                          emissive='#f59e0b'
                          emissiveIntensity={getBrickEmissiveIntensity(brickId)}
                          roughness={1}
                          wireframe={effectiveWireframe}
                        />
                        {effectiveShowBrickOutlines && (
                          <Edges
                            color={getBrickEdgeColor(brickId, '#14100a')}
                            lineWidth={1}
                            scale={1.003}
                          />
                        )}
                      </mesh>
                      {output.planShape !== 'circular' &&
                        course.courseIndex ===
                          output.ventSpec.targetCourseIndexes[0] && (
                          <Html
                            position={[
                              placement.x,
                              y + brickHeightFt * 0.64,
                              placement.z,
                            ]}
                            center
                            transform
                            distanceFactor={8}
                          >
                            <div className='rounded-full border border-amber-900/35 bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 shadow'>
                              {getRectangularSideLabel(
                                placement.x,
                                placement.z,
                                geometry.wallSpanWidthFt / 2,
                                geometry.wallSpanDepthFt / 2,
                              )}
                            </div>
                          </Html>
                        )}
                    </group>
                  ) : (
                    <mesh
                      key={`${course.courseIndex}-${brickIdx}`}
                      position={[placement.x, y, placement.z]}
                      rotation={[0, placement.rotationY, 0]}
                      onPointerOver={handleBrickPointerOver(brickId)}
                      onPointerOut={handleBrickPointerOut(brickId)}
                      onClick={handleBrickSelect(brickInfo)}
                    >
                      {isRockWallVisual && !isSpacer ? (
                        (() => {
                          const seedBase = course.courseIndex * 1000 + brickIdx;
                          const styleScales =
                            rockVisualStyle === 'ledgestone'
                              ? {
                                  lengthMin: 1.0,
                                  lengthRange: 0.26,
                                  heightMin: 0.72,
                                  heightRange: 0.22,
                                  widthMin: 0.98,
                                  widthRange: 0.24,
                                  jitterY: 0.16,
                                  jitterX: 0.08,
                                  jitterZ: 0.08,
                                }
                              : rockVisualStyle === 'mosaic'
                                ? {
                                    lengthMin: 0.9,
                                    lengthRange: 0.34,
                                    heightMin: 0.84,
                                    heightRange: 0.28,
                                    widthMin: 0.9,
                                    widthRange: 0.34,
                                    jitterY: 0.22,
                                    jitterX: 0.14,
                                    jitterZ: 0.14,
                                  }
                                : {
                                    lengthMin: 0.94,
                                    lengthRange: 0.32,
                                    heightMin: 0.88,
                                    heightRange: 0.26,
                                    widthMin: 0.94,
                                    widthRange: 0.32,
                                    jitterY: 0.2,
                                    jitterX: 0.12,
                                    jitterZ: 0.12,
                                  };
                          const tightnessLengthBoost = 0.11 * tightness;
                          const tightnessWidthBoost = 0.14 * tightness;
                          const tightnessHeightBoost = 0.08 * tightness;
                          const jitterScale = 1 - tightness * 0.55;
                          const lengthScale =
                            styleScales.lengthMin +
                            tightnessLengthBoost +
                            seededUnitVariation(seedBase + 11) *
                              styleScales.lengthRange;
                          const heightScale =
                            styleScales.heightMin +
                            tightnessHeightBoost +
                            seededUnitVariation(seedBase + 23) *
                              styleScales.heightRange;
                          const widthScale =
                            styleScales.widthMin +
                            tightnessWidthBoost +
                            seededUnitVariation(seedBase + 37) *
                              styleScales.widthRange;
                          const rotationJitterY =
                            (seededUnitVariation(seedBase + 53) - 0.5) *
                            styleScales.jitterY *
                            jitterScale;
                          const rotationJitterX =
                            (seededUnitVariation(seedBase + 71) - 0.5) *
                            styleScales.jitterX *
                            jitterScale;
                          const rotationJitterZ =
                            (seededUnitVariation(seedBase + 89) - 0.5) *
                            styleScales.jitterZ *
                            jitterScale;
                          const colorIndex = Math.floor(
                            seededUnitVariation(seedBase + 101) *
                              rockPalette.length,
                          );
                          const rockColor =
                            rockPalette[colorIndex] ?? '#8f6a4a';
                          const archetypeIndex = getRockArchetypeIndex(
                            rockVisualStyle,
                            course.courseIndex,
                            brickIdx,
                            archetypePatternLength,
                          );
                          const archetypeScales =
                            rockVisualStyle === 'ledgestone'
                              ? [
                                  [1.15, 0.8, 1.04],
                                  [1.07, 0.86, 1.02],
                                  [1.12, 0.74, 0.98],
                                  [1.0, 0.9, 1.06],
                                  [1.18, 0.78, 1.0],
                                ]
                              : rockVisualStyle === 'mosaic'
                                ? [
                                    [0.96, 1.06, 1.0],
                                    [1.02, 0.94, 0.96],
                                    [0.92, 1.1, 1.08],
                                    [1.08, 0.9, 1.02],
                                    [1.0, 1.02, 0.92],
                                  ]
                                : [
                                    [1.0, 1.0, 1.0],
                                    [1.08, 0.96, 1.04],
                                    [0.94, 1.08, 0.98],
                                    [1.04, 0.92, 1.1],
                                    [0.98, 1.04, 0.94],
                                  ];
                          const [archLength, archHeight, archWidth] =
                            archetypeScales[archetypeIndex] ?? [1, 1, 1];

                          return (
                            <mesh
                              rotation={[
                                rotationJitterX,
                                rotationJitterY,
                                rotationJitterZ,
                              ]}
                              scale={[
                                renderedLengthFt * lengthScale * archLength,
                                renderedHeightFt * heightScale * archHeight,
                                renderedWidthFt * widthScale * archWidth,
                              ]}
                            >
                              {rockVisualStyle === 'ledgestone' ? (
                                archetypeIndex % 2 === 0 ? (
                                  <boxGeometry args={[1, 1, 1]} />
                                ) : (
                                  <dodecahedronGeometry args={[0.56, 0]} />
                                )
                              ) : rockVisualStyle === 'mosaic' ? (
                                archetypeIndex % 3 === 0 ? (
                                  <octahedronGeometry args={[0.62, 0]} />
                                ) : archetypeIndex % 3 === 1 ? (
                                  <tetrahedronGeometry args={[0.68, 0]} />
                                ) : (
                                  <icosahedronGeometry args={[0.56, 0]} />
                                )
                              ) : archetypeIndex % 4 === 0 ? (
                                <dodecahedronGeometry args={[0.5, 0]} />
                              ) : archetypeIndex % 4 === 1 ? (
                                <icosahedronGeometry args={[0.54, 0]} />
                              ) : archetypeIndex % 4 === 2 ? (
                                <octahedronGeometry args={[0.6, 0]} />
                              ) : (
                                <sphereGeometry args={[0.52, 9, 8]} />
                              )}
                              <meshStandardMaterial
                                color={rockColor}
                                emissive='#fbbf24'
                                emissiveIntensity={getBrickEmissiveIntensity(
                                  brickId,
                                )}
                                roughness={0.92}
                                metalness={0.01}
                                wireframe={effectiveWireframe}
                              />
                              {effectiveShowBrickOutlines && (
                                <Edges
                                  color={getBrickEdgeColor(brickId, '#2d241c')}
                                  lineWidth={1}
                                  scale={1.01}
                                />
                              )}
                            </mesh>
                          );
                        })()
                      ) : wallRequiresTaperCut && wallBrickQuad && !isSpacer ? (
                        <CircularCapJointFiller
                          polygonPoints={wallBrickQuad.polygonPoints}
                          heightFt={renderedHeightFt}
                          color={perBrickColor}
                          wireframe={effectiveWireframe}
                          showEdges={effectiveShowBrickOutlines}
                        />
                      ) : (
                        <>
                          <boxGeometry
                            args={[
                              renderedLengthFt,
                              renderedHeightFt,
                              renderedWidthFt,
                            ]}
                          />
                          <meshStandardMaterial
                            color={perBrickColor}
                            emissive='#f59e0b'
                            emissiveIntensity={getBrickEmissiveIntensity(brickId)}
                            map={
                              isPhotoreal
                                ? (brickDiffuseMap ?? brickAlbedoTexture)
                                : undefined
                            }
                            bumpMap={isPhotoreal ? brickBumpMap : undefined}
                            bumpScale={isPhotoreal ? 0.05 : 1}
                            roughnessMap={
                              isPhotoreal ? brickRoughnessMap : undefined
                            }
                            roughness={isPhotoreal ? 0.76 : 0.82}
                            metalness={isPhotoreal ? 0.03 : 0}
                            wireframe={effectiveWireframe}
                          />
                          {effectiveShowBrickOutlines && (
                            <Edges
                              color={getBrickEdgeColor(brickId, '#2a1a10')}
                              lineWidth={1}
                              scale={1.003}
                            />
                          )}
                        </>
                      )}
                    </mesh>
                  );
                })}
              </group>
            ))}

            {isLodHigh &&
              (() => {
              // For rectangular/square shapes with overhang, offset capstone placement to align corners with wall
              let capstoneOffsetIn = 0;
              if (output.planShape !== 'circular') {
                // The capstone has larger dimensions due to overhang. To align it properly,
                // we need to shift backward in the perimeter so corner bricks align.
                // The perimeter of the capstone is 4*overhang larger than the wall perimeter.
                const overhangPerimeterIn = output.capstone.overhangIn * 8;
                // Offset by half to center the capstone over the wall
                capstoneOffsetIn = -overhangPerimeterIn / 2;
              }

                return Array.from(
                { length: output.capstone.capUnitsPerCourseRounded },
                (_, capIdx) => {
                  const placement = getPlacement(
                    output,
                    capIdx,
                    output.capstone.capUnitsPerCourseRounded,
                    capstoneOffsetIn,
                    geometry.capSpanWidthFt,
                    geometry.capSpanDepthFt,
                    geometry.capRadiusFt,
                  );
                  if (!shouldRenderInCutaway(placement.x, placement.z)) {
                    return null;
                  }
                  const y =
                    geometry.capRiseFt +
                    capBrickHeightFt / 2 +
                    mortarJointFt / 2;
                  const brickQuad = capRequiresTaperCut
                    ? buildCircularCapBrickQuad({
                        centerlineRadiusFt: geometry.capRadiusFt,
                        innerRadiusFt: renderedCapInnerRadiusFt,
                        outerRadiusFt: renderedCapOuterRadiusFt,
                        brickLengthIn: renderedCapBrickLengthFt * 12,
                      })
                    : undefined;

                  return (
                    <mesh
                      key={`cap-${capIdx}`}
                      position={[placement.x, y, placement.z]}
                      rotation={[0, placement.rotationY, 0]}
                    >
                      {capRequiresTaperCut && brickQuad ? (
                        <CircularCapJointFiller
                          polygonPoints={brickQuad.polygonPoints}
                          heightFt={visCapBrickHeightFt}
                          color={palette.capColor}
                          wireframe={effectiveWireframe}
                          showEdges={effectiveShowBrickOutlines}
                        />
                      ) : isHalfRoundCap ? (
                        <>
                          <mesh
                            position={[
                              0,
                              -visCapBrickHeightFt / 2 +
                                halfRoundBaseHeightFt / 2,
                              0,
                            ]}
                          >
                            <boxGeometry
                              args={[
                                renderedCapBrickLengthFt,
                                halfRoundBaseHeightFt,
                                capBrickWidthFt,
                              ]}
                            />
                            <meshStandardMaterial
                              color={palette.capColor}
                              map={isPhotoreal ? capAlbedoTexture : undefined}
                              roughness={isPhotoreal ? 0.6 : 0.65}
                              metalness={isPhotoreal ? 0.03 : 0}
                              wireframe={effectiveWireframe}
                            />
                            {effectiveShowBrickOutlines && (
                              <Edges
                                color='#3b2d1f'
                                lineWidth={1}
                                scale={1.003}
                              />
                            )}
                          </mesh>
                          <mesh
                            position={[
                              0,
                              -visCapBrickHeightFt / 2 + halfRoundBaseHeightFt,
                              0,
                            ]}
                            rotation={[0, 0, Math.PI / 2]}
                          >
                            <cylinderGeometry
                              args={[
                                halfRoundCrownRadiusFt,
                                halfRoundCrownRadiusFt,
                                renderedCapBrickLengthFt,
                                20,
                              ]}
                            />
                            <meshStandardMaterial
                              color={palette.capCrownColor}
                              map={isPhotoreal ? capAlbedoTexture : undefined}
                              roughness={isPhotoreal ? 0.54 : 0.58}
                              metalness={isPhotoreal ? 0.03 : 0}
                              wireframe={effectiveWireframe}
                            />
                          </mesh>
                        </>
                      ) : (
                        <>
                          <boxGeometry
                            args={[
                              renderedCapBrickLengthFt,
                              visCapBrickHeightFt,
                              capBrickWidthFt,
                            ]}
                          />
                          <meshStandardMaterial
                            color={palette.capColor}
                            map={isPhotoreal ? capAlbedoTexture : undefined}
                            roughness={isPhotoreal ? 0.6 : 0.65}
                            metalness={isPhotoreal ? 0.03 : 0}
                            wireframe={effectiveWireframe}
                          />
                          {effectiveShowBrickOutlines && (
                            <Edges
                              color='#3b2d1f'
                              lineWidth={1}
                              scale={1.003}
                            />
                          )}
                        </>
                      )}
                    </mesh>
                  );
                },
                );
              })()}

            {isLodHigh &&
              showMortar &&
              capJointLengthFt > 0.02 &&
              (() => {
                let capstoneOffsetIn = 0;
                if (output.planShape !== 'circular') {
                  const overhangPerimeterIn = output.capstone.overhangIn * 8;
                  capstoneOffsetIn = -overhangPerimeterIn / 2;
                }

                return Array.from(
                  { length: output.capstone.capUnitsPerCourseRounded },
                  (_, capIdx) => {
                    const jointPlacement = getPlacement(
                      output,
                      capIdx + 0.5,
                      output.capstone.capUnitsPerCourseRounded,
                      capstoneOffsetIn,
                      geometry.capSpanWidthFt,
                      geometry.capSpanDepthFt,
                      geometry.capRadiusFt,
                    );
                    if (
                      !shouldRenderInCutaway(
                        jointPlacement.x,
                        jointPlacement.z,
                      )
                    ) {
                      return null;
                    }
                    const leftPlacement = getPlacement(
                      output,
                      capIdx,
                      output.capstone.capUnitsPerCourseRounded,
                      capstoneOffsetIn,
                      geometry.capSpanWidthFt,
                      geometry.capSpanDepthFt,
                      geometry.capRadiusFt,
                    );
                    const rightPlacement = getPlacement(
                      output,
                      (capIdx + 1) % output.capstone.capUnitsPerCourseRounded,
                      output.capstone.capUnitsPerCourseRounded,
                      capstoneOffsetIn,
                      geometry.capSpanWidthFt,
                      geometry.capSpanDepthFt,
                      geometry.capRadiusFt,
                    );
                    const jointQuad =
                      output.planShape === 'circular' && capRequiresTaperCut
                        ? buildCircularCapJointQuad({
                            centerlineRadiusFt: geometry.capRadiusFt,
                            innerRadiusFt: renderedCapInnerRadiusFt,
                            outerRadiusFt: renderedCapOuterRadiusFt,
                            actualJointIn: output.capstone.joint.actualJointIn,
                          })
                        : output.planShape !== 'circular'
                          ? buildRectangularJointQuad(
                              leftPlacement,
                              rightPlacement,
                              jointPlacement,
                              renderedCapBrickLengthFt,
                              capBrickWidthFt,
                            )
                          : undefined;
                    const jointY =
                      geometry.capRiseFt +
                      capBrickHeightFt / 2 +
                      mortarJointFt / 2;

                    return (
                      <mesh
                        key={`cap-joint-${capIdx}-${mortarMode}`}
                        position={[jointPlacement.x, jointY, jointPlacement.z]}
                        rotation={[0, jointPlacement.rotationY, 0]}
                      >
                        {output.planShape === 'circular' &&
                        capRequiresTaperCut &&
                        jointQuad ? (
                          <CircularCapJointFiller
                            polygonPoints={jointQuad.polygonPoints}
                            heightFt={capJointHeightFt}
                            color={palette.mortarColor}
                            opacity={mortarOpacity}
                            wireframe={effectiveWireframe}
                            showEdges={effectiveShowBrickOutlines}
                          />
                        ) : (
                          <>
                            <boxGeometry
                              args={[
                                renderedCapJointLengthFt,
                                capJointHeightFt,
                                capJointWidthFt,
                              ]}
                            />
                            <meshStandardMaterial
                              color={palette.mortarColor}
                              map={isPhotoreal ? mortarTexture : undefined}
                              roughness={isPhotoreal ? 0.88 : 0.93}
                              transparent
                              opacity={mortarOpacity}
                              depthWrite={mortarDepthWrite}
                              wireframe={effectiveWireframe}
                            />
                          </>
                        )}
                      </mesh>
                    );
                  },
                );
              })()}

            {isLodHigh &&
              showMortar &&
              output.planShape !== 'circular' &&
              capCornerJointSizeFt > 0.02 && (
                <>
                  {[
                    [geometry.capSpanWidthFt / 2, geometry.capSpanDepthFt / 2],
                    [geometry.capSpanWidthFt / 2, -geometry.capSpanDepthFt / 2],
                    [-geometry.capSpanWidthFt / 2, geometry.capSpanDepthFt / 2],
                    [
                      -geometry.capSpanWidthFt / 2,
                      -geometry.capSpanDepthFt / 2,
                    ],
                  ].map(([x, z], index) => (
                    shouldRenderInCutaway(x as number, z as number) ? (
                    <mesh
                      key={`cap-corner-joint-${index}-${mortarMode}`}
                      position={[
                        x as number,
                        geometry.capRiseFt +
                          capBrickHeightFt / 2 +
                          mortarJointFt / 2,
                        z as number,
                      ]}
                    >
                      <boxGeometry
                        args={[
                          capCornerJointSizeFt,
                          capJointHeightFt,
                          capCornerJointSizeFt,
                        ]}
                      />
                      <meshStandardMaterial
                        color={palette.mortarColor}
                        map={isPhotoreal ? mortarTexture : undefined}
                        roughness={isPhotoreal ? 0.88 : 0.93}
                        transparent
                        opacity={mortarOpacity}
                        depthWrite={mortarDepthWrite}
                        wireframe={effectiveWireframe}
                      />
                    </mesh>
                    ) : null
                  ))}
                </>
              )}

            {!isLodHigh && (
              <>
                {isLodMedium ? (
                  <>
                    {output.courses.map((course) => {
                      const courseY =
                        (brickHeightFt / 2) +
                        course.courseIndex * geometry.courseRiseFt +
                        mortarJointFt / 2;
                      const courseColor = getWallCourseColor(course);
                      return output.planShape === 'circular' ? (
                        <mesh
                          key={`lod-medium-wall-${course.courseIndex}`}
                          position={[0, courseY, 0]}
                        >
                          <cylinderGeometry
                            args={[
                              renderedWallOuterRadiusFt,
                              renderedWallOuterRadiusFt,
                              visBrickHeightFt,
                              64,
                              1,
                              true,
                              cutawayThetaStartRad,
                              cutawayThetaLengthRad,
                            ]}
                          />
                          <meshStandardMaterial
                            color={courseColor}
                            roughness={isPhotoreal ? 0.78 : 0.84}
                            metalness={0.02}
                            wireframe={effectiveWireframe}
                          />
                        </mesh>
                      ) : (
                        <RectangularRing
                          key={`lod-medium-wall-${course.courseIndex}`}
                          widthFt={geometry.wallSpanWidthFt}
                          depthFt={geometry.wallSpanDepthFt}
                          thicknessFt={visBrickWidthFt}
                          heightFt={visBrickHeightFt}
                          y={courseY}
                          color={courseColor}
                          wireframe={effectiveWireframe}
                        />
                      );
                    })}
                  </>
                ) : output.planShape === 'circular' ? (
                  <mesh position={[0, wallHeightFt / 2, 0]}>
                    <cylinderGeometry
                      args={[
                        renderedWallOuterRadiusFt,
                        renderedWallOuterRadiusFt,
                        wallHeightFt,
                        64,
                        1,
                        true,
                        cutawayThetaStartRad,
                        cutawayThetaLengthRad,
                      ]}
                    />
                    <meshStandardMaterial
                      color={palette.wallEvenColor}
                      roughness={isPhotoreal ? 0.78 : 0.84}
                      metalness={0.02}
                      wireframe={effectiveWireframe}
                    />
                  </mesh>
                ) : (
                  <RectangularRing
                    widthFt={geometry.wallSpanWidthFt}
                    depthFt={geometry.wallSpanDepthFt}
                    thicknessFt={visBrickWidthFt}
                    heightFt={wallHeightFt}
                    y={wallHeightFt / 2}
                    color={palette.wallEvenColor}
                    wireframe={effectiveWireframe}
                  />
                )}

                {output.planShape === 'circular' ? (
                  <mesh
                    position={[
                      0,
                      geometry.capRiseFt + visCapBrickHeightFt / 2 + mortarJointFt / 2,
                      0,
                    ]}
                  >
                    <cylinderGeometry
                      args={[
                        renderedCapOuterRadiusFt,
                        renderedCapOuterRadiusFt,
                        visCapBrickHeightFt,
                        64,
                        1,
                        true,
                        cutawayThetaStartRad,
                        cutawayThetaLengthRad,
                      ]}
                    />
                    <meshStandardMaterial
                      color={palette.capColor}
                      roughness={isPhotoreal ? 0.62 : 0.68}
                      metalness={0.02}
                      wireframe={effectiveWireframe}
                    />
                  </mesh>
                ) : (
                  <RectangularRing
                    widthFt={geometry.capSpanWidthFt}
                    depthFt={geometry.capSpanDepthFt}
                    thicknessFt={capBrickWidthFt}
                    heightFt={visCapBrickHeightFt}
                    y={geometry.capRiseFt + visCapBrickHeightFt / 2 + mortarJointFt / 2}
                    color={palette.capColor}
                    wireframe={effectiveWireframe}
                  />
                )}
              </>
            )}

            {showMortar && output.planShape === 'circular' ? (
              <mesh
                key={`cap-bed-${mortarMode}`}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, capMortarBedY, 0]}
              >
                <ringGeometry
                  args={[
                    renderedCapInnerRadiusFt,
                    renderedCapOuterRadiusFt,
                    128,
                    1,
                    cutawayThetaStartRad,
                    cutawayThetaLengthRad,
                  ]}
                />
                <meshStandardMaterial
                  color={palette.mortarColor}
                  map={isPhotoreal ? mortarTexture : undefined}
                  roughness={isPhotoreal ? 0.88 : 0.93}
                  transparent
                  opacity={mortarOpacity}
                  depthWrite={mortarDepthWrite}
                  wireframe={effectiveWireframe}
                />
              </mesh>
            ) : showMortar ? (
              <RectangularRing
                key={`cap-bed-rect-${mortarMode}`}
                widthFt={geometry.capSpanWidthFt}
                depthFt={geometry.capSpanDepthFt}
                thicknessFt={capBrickWidthFt}
                heightFt={capMortarBedHeightFt}
                y={capMortarBedY}
                color={palette.mortarColor}
                wireframe={effectiveWireframe}
                opacity={mortarOpacity}
              />
            ) : null}

            {output.linerSpec.enabled &&
              output.planShape === 'circular' &&
              output.linerSpec.type === 'fire-brick' && (
                <>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <ringGeometry
                      args={[
                        geometry.linerOuterRadiusFt,
                        geometry.wallRadiusFt - brickWidthFt / 2,
                        96,
                        1,
                        cutawayThetaStartRad,
                        cutawayThetaLengthRad,
                      ]}
                    />
                    <meshStandardMaterial
                      color='#dfc7a0'
                      roughness={0.9}
                      transparent
                      opacity={0.6}
                      wireframe={effectiveWireframe}
                    />
                  </mesh>
                  <mesh position={[0, linerMidY, 0]}>
                    <cylinderGeometry
                      args={[
                        geometry.linerOuterRadiusFt,
                        geometry.linerOuterRadiusFt,
                        linerHeightFt,
                        96,
                        1,
                        true,
                        cutawayThetaStartRad,
                        cutawayThetaLengthRad,
                      ]}
                    />
                    <meshStandardMaterial
                      color='#8e3b2f'
                      map={
                        isPhotoreal
                          ? (brickDiffuseMap ?? brickAlbedoTexture)
                          : undefined
                      }
                      bumpMap={isPhotoreal ? brickBumpMap : undefined}
                      bumpScale={isPhotoreal ? 0.04 : 1}
                      roughnessMap={isPhotoreal ? brickRoughnessMap : undefined}
                      roughness={isPhotoreal ? 0.74 : 0.82}
                      wireframe={effectiveWireframe}
                    />
                  </mesh>
                  <mesh position={[0, linerMidY, 0]}>
                    <cylinderGeometry
                      args={[
                        geometry.linerInnerRadiusFt,
                        geometry.linerInnerRadiusFt,
                        linerHeightFt,
                        96,
                        1,
                        true,
                        cutawayThetaStartRad,
                        cutawayThetaLengthRad,
                      ]}
                    />
                    <meshStandardMaterial
                      color='#8e3b2f'
                      map={
                        isPhotoreal
                          ? (brickDiffuseMap ?? brickAlbedoTexture)
                          : undefined
                      }
                      bumpMap={isPhotoreal ? brickBumpMap : undefined}
                      bumpScale={isPhotoreal ? 0.04 : 1}
                      roughnessMap={isPhotoreal ? brickRoughnessMap : undefined}
                      roughness={isPhotoreal ? 0.74 : 0.82}
                      side={BackSide}
                      wireframe={effectiveWireframe}
                    />
                  </mesh>
                </>
              )}

            {output.linerSpec.enabled &&
              output.planShape === 'circular' &&
              output.linerSpec.type === 'steel-ring' && (
                <>
                  <mesh position={[0, linerMidY, 0]}>
                    <cylinderGeometry
                      args={[
                        geometry.linerOuterRadiusFt,
                        geometry.linerOuterRadiusFt,
                        linerHeightFt,
                        96,
                        1,
                        true,
                        cutawayThetaStartRad,
                        cutawayThetaLengthRad,
                      ]}
                    />
                    <meshStandardMaterial
                      color='#7b7f86'
                      metalness={0.75}
                      roughness={0.28}
                      wireframe={effectiveWireframe}
                    />
                  </mesh>
                  <mesh position={[0, linerMidY, 0]}>
                    <cylinderGeometry
                      args={[
                        geometry.linerInnerRadiusFt,
                        geometry.linerInnerRadiusFt,
                        linerHeightFt,
                        96,
                        1,
                        true,
                        cutawayThetaStartRad,
                        cutawayThetaLengthRad,
                      ]}
                    />
                    <meshStandardMaterial
                      color='#7b7f86'
                      metalness={0.75}
                      roughness={0.28}
                      side={BackSide}
                      wireframe={effectiveWireframe}
                    />
                  </mesh>
                </>
              )}

            {output.linerSpec.enabled && output.planShape !== 'circular' && (
              <RectangularRing
                widthFt={geometry.linerOuterWidthFt}
                depthFt={geometry.linerOuterDepthFt}
                thicknessFt={Math.max(0.04, output.linerSpec.thicknessIn / 12)}
                heightFt={linerHeightFt}
                y={linerMidY}
                color={
                  output.linerSpec.type === 'steel-ring' ? '#7b7f86' : '#8e3b2f'
                }
                wireframe={effectiveWireframe}
              />
            )}

            {output.planShape === 'circular' ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                <circleGeometry
                  args={[
                    innerVoidRadiusFt,
                    72,
                    cutawayThetaStartRad,
                    cutawayThetaLengthRad,
                  ]}
                />
                <meshStandardMaterial
                  color='#3d3126'
                  map={isPhotoreal ? mortarTexture : undefined}
                  roughness={isPhotoreal ? 0.9 : 0.95}
                  wireframe={effectiveWireframe}
                />
              </mesh>
            ) : (
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry
                  args={[
                    output.linerSpec.enabled && geometry.linerInnerWidthFt > 0
                      ? geometry.linerInnerWidthFt
                      : Math.max(0.2, output.innerSpanWidthIn / 12),
                    0.03,
                    output.linerSpec.enabled && geometry.linerInnerDepthFt > 0
                      ? geometry.linerInnerDepthFt
                      : Math.max(0.2, output.innerSpanDepthIn / 12),
                  ]}
                />
                <meshStandardMaterial
                  color='#3d3126'
                  map={isPhotoreal ? mortarTexture : undefined}
                  roughness={isPhotoreal ? 0.9 : 0.95}
                  wireframe={effectiveWireframe}
                />
              </mesh>
            )}

            {gasPlacement &&
              shouldRenderInCutaway(gasPlacement.x, gasPlacement.z) && (
              <mesh
                position={[gasPlacement.x, 0.12, gasPlacement.z]}
                rotation={[0, gasPlacement.rotationY, 0]}
              >
                <boxGeometry
                  args={[Math.max(0.2, brickWidthFt + 0.16), 0.045, 0.045]}
                />
                <meshStandardMaterial
                  color={
                    output.ventSpec.gasLineEntryClear ? '#2b6f9b' : '#a01d1d'
                  }
                  metalness={isPhotoreal ? 0.82 : 0.7}
                  roughness={isPhotoreal ? 0.24 : 0.35}
                  wireframe={effectiveWireframe}
                />
              </mesh>
            )}

            {showFlame && (
              <FlameCore
                innerRadiusFt={Math.max(0.18, innerVoidRadiusFt)}
                wallHeightFt={wallHeightFt}
              />
            )}

            {showDimensions && (
              <DimensionAnnotationsScene
                innerRadius={renderedWallInnerRadiusFt}
                capOuterRadius={renderedCapOuterRadiusFt}
                wallHeight={wallHeightFt}
                totalHeight={wallHeightFt + visCapBrickHeightFt}
                planShape={output.planShape}
                spanWidthFt={geometry.wallSpanWidthFt}
                spanDepthFt={geometry.wallSpanDepthFt}
              />
            )}
            <ContactShadows
              position={[0, -0.019, 0]}
              opacity={isPhotoreal ? 0.7 : 0.5}
              scale={Math.max(7, stageGroundRadiusFt * 2)}
              blur={isPhotoreal ? 1.6 : 2.8}
              far={Math.max(2.5, stageGroundRadiusFt * 0.85)}
            />
          </Canvas>
        </Stage3DCanvasErrorBoundary>
      )}
    </div>
  );
}
