import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Edges, Html, OrbitControls } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { BackSide, Shape } from 'three';
import type { Group } from 'three';
import type { MasonryOutput } from '../types';

interface Stage3DProps {
  output: MasonryOutput;
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
  wireframe,
  showEdges,
}: {
  polygonPoints: Point2D[];
  heightFt: number;
  color: string;
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

  useFrame((state) => {
    if (!groupRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    groupRef.current.scale.x = 1 + Math.sin(time * 4.1) * 0.09;
    groupRef.current.scale.z = 1 + Math.cos(time * 3.3) * 0.09;
  });

  const coneHeightFt = Math.min(wallHeightFt * 0.9, innerRadiusFt * 2.4);
  const coneRadiusFt = innerRadiusFt * 0.52;

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry
          args={[coneRadiusFt * 0.72, coneRadiusFt * 0.88, 0.07, 20]}
        />
        <meshStandardMaterial
          color='#ff6600'
          emissive='#cc3300'
          emissiveIntensity={2.4}
        />
      </mesh>
      <mesh position={[0, coneHeightFt * 0.42, 0]}>
        <coneGeometry args={[coneRadiusFt, coneHeightFt, 14, 1, true]} />
        <meshStandardMaterial
          color='#ff4400'
          emissive='#ff1100'
          emissiveIntensity={2.8}
          transparent
          opacity={0.72}
          side={BackSide}
        />
      </mesh>
      <mesh position={[0, coneHeightFt * 0.28, 0]}>
        <coneGeometry
          args={[coneRadiusFt * 0.44, coneHeightFt * 0.62, 10, 1, true]}
        />
        <meshStandardMaterial
          color='#ffcc00'
          emissive='#ffcc00'
          emissiveIntensity={3.5}
          transparent
          opacity={0.85}
          side={BackSide}
        />
      </mesh>
      <pointLight
        position={[0, coneHeightFt * 0.3, 0]}
        color='#ff6600'
        intensity={1.4}
        distance={3.8}
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

export default function Stage3D({ output }: Stage3DProps) {
  const [wireframe, setWireframe] = useState(false);
  const [showBrickOutlines, setShowBrickOutlines] = useState(true);
  const [showFlame, setShowFlame] = useState(false);
  const orbitRef = useRef<OrbitHandle>(null);

  const geometry = useMemo(() => computeStage3DGeometry(output), [output]);

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

    return course.courseIndex % 2 === 0 ? '#924018' : '#7d3512';
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

  const topDown = () => {
    if (!orbitRef.current) {
      return;
    }

    orbitRef.current.target.set(0, wallHeightFt / 2, 0);
    orbitRef.current.object.position.set(0, 6, 0.001);
    orbitRef.current.update();
  };

  const sideView = () => {
    if (!orbitRef.current) {
      return;
    }

    orbitRef.current.target.set(0, wallHeightFt / 3, 0);
    orbitRef.current.object.position.set(0, 2.4, 5.2);
    orbitRef.current.update();
  };

  return (
    <div className='card-rise relative h-[460px] rounded-2xl border border-amber-900/20 bg-amber-100/70 p-2 shadow-lg sm:h-[500px]'>
      <div className='absolute right-2 top-2 z-10 flex flex-col items-end gap-2 sm:right-4 sm:top-4'>
        <div className='flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
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

        <div className='flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
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

        <div className='flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow sm:text-xs'>
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

        <div className='flex gap-1.5'>
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
      </div>

      <div className='absolute bottom-2 left-2 z-10 max-w-[78%] rounded-xl border border-amber-900/15 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-950 shadow sm:bottom-4 sm:left-4 sm:max-w-sm sm:text-xs'>
        <p className='mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-900/80 sm:text-xs'>
          3D Legend
        </p>
        <p className='leading-5'>
          <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#7d3512]' />
          Wall Brick
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
          <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#ccb085]' />
          Cap Brick
        </p>
        <p className='leading-5'>
          <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#c6b39a]' />
          Mortar
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

      <Canvas camera={{ position: [0, 2.4, 5.2], fov: 48 }}>
        <ambientLight intensity={0.65} />
        <hemisphereLight args={['#fff4dd', '#8e7a5b', 0.48]} />
        <directionalLight position={[3.5, 5.5, 3]} intensity={1.1} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <OrbitControls
          ref={orbitRef as any}
          enablePan={false}
          maxPolarAngle={Math.PI * 0.49}
          minDistance={2.2}
          maxDistance={9}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[3.4, 96]} />
          <meshStandardMaterial
            color='#dbc8a6'
            roughness={0.9}
            wireframe={wireframe}
          />
        </mesh>

        {output.planShape === 'circular' ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <circleGeometry
              args={[output.foundation.footprintDiameterIn / 2 / 12, 96]}
            />
            <meshStandardMaterial
              color='#b3a284'
              roughness={1}
              wireframe={wireframe}
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
              roughness={1}
              wireframe={wireframe}
            />
          </mesh>
        )}

        {output.planShape === 'circular' ? (
          <>
            <mesh position={[0, wallHeightFt / 2, 0]}>
              <cylinderGeometry
                args={[
                  geometry.wallRadiusFt + brickWidthFt / 2,
                  geometry.wallRadiusFt + brickWidthFt / 2,
                  wallHeightFt,
                  128,
                  1,
                  true,
                ]}
              />
              <meshStandardMaterial
                color='#c6b39a'
                roughness={0.93}
                wireframe={wireframe}
              />
            </mesh>
            <mesh position={[0, wallHeightFt / 2, 0]}>
              <cylinderGeometry
                args={[
                  geometry.wallRadiusFt - brickWidthFt / 2,
                  geometry.wallRadiusFt - brickWidthFt / 2,
                  wallHeightFt,
                  128,
                  1,
                  true,
                ]}
              />
              <meshStandardMaterial
                color='#c6b39a'
                roughness={0.93}
                side={BackSide}
                wireframe={wireframe}
              />
            </mesh>
          </>
        ) : (
          <RectangularRing
            widthFt={geometry.wallSpanWidthFt}
            depthFt={geometry.wallSpanDepthFt}
            thicknessFt={brickWidthFt}
            heightFt={wallHeightFt}
            y={wallHeightFt / 2}
            color='#c6b39a'
            wireframe={wireframe}
            opacity={0.96}
          />
        )}

        {output.planShape === 'circular' &&
          output.courses.map(
            (course) =>
              course.courseIndex > 0 && (
                <mesh
                  key={`bed-${course.courseIndex}`}
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, course.courseIndex * geometry.courseRiseFt, 0]}
                >
                  <ringGeometry
                    args={[
                      geometry.wallRadiusFt - brickWidthFt / 2,
                      geometry.wallRadiusFt + brickWidthFt / 2,
                      128,
                    ]}
                  />
                  <meshStandardMaterial
                    color='#c6b39a'
                    roughness={0.93}
                    wireframe={wireframe}
                  />
                </mesh>
              ),
          )}

        {output.courses.map((course) => (
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

              return isVentOpening ? (
                <group key={`${course.courseIndex}-${brickIdx}-vent`}>
                  <mesh
                    position={[placement.x, y, placement.z]}
                    rotation={[0, placement.rotationY, 0]}
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
                      roughness={1}
                      wireframe={wireframe}
                    />
                    {showBrickOutlines && (
                      <Edges color='#14100a' lineWidth={1} scale={1.003} />
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
                >
                  {wallRequiresTaperCut && wallBrickQuad && !isSpacer ? (
                    <CircularCapJointFiller
                      polygonPoints={wallBrickQuad.polygonPoints}
                      heightFt={renderedHeightFt}
                      color={perBrickColor}
                      wireframe={wireframe}
                      showEdges={showBrickOutlines}
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
                        roughness={0.82}
                        wireframe={wireframe}
                      />
                      {showBrickOutlines && (
                        <Edges color='#2a1a10' lineWidth={1} scale={1.003} />
                      )}
                    </>
                  )}
                </mesh>
              );
            })}
          </group>
        ))}

        {(() => {
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
              const y =
                geometry.capRiseFt + capBrickHeightFt / 2 + mortarJointFt / 2;
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
                      color='#ccb085'
                      wireframe={wireframe}
                      showEdges={showBrickOutlines}
                    />
                  ) : isHalfRoundCap ? (
                    <>
                      <mesh
                        position={[
                          0,
                          -visCapBrickHeightFt / 2 + halfRoundBaseHeightFt / 2,
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
                          color='#ccb085'
                          roughness={0.65}
                          wireframe={wireframe}
                        />
                        {showBrickOutlines && (
                          <Edges color='#3b2d1f' lineWidth={1} scale={1.003} />
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
                          color='#d5bb93'
                          roughness={0.58}
                          wireframe={wireframe}
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
                        color='#ccb085'
                        roughness={0.65}
                        wireframe={wireframe}
                      />
                      {showBrickOutlines && (
                        <Edges color='#3b2d1f' lineWidth={1} scale={1.003} />
                      )}
                    </>
                  )}
                </mesh>
              );
            },
          );
        })()}

        {capJointLengthFt > 0.02 &&
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
                  geometry.capRiseFt + capBrickHeightFt / 2 + mortarJointFt / 2;

                return (
                  <mesh
                    key={`cap-joint-${capIdx}`}
                    position={[jointPlacement.x, jointY, jointPlacement.z]}
                    rotation={[0, jointPlacement.rotationY, 0]}
                  >
                    {output.planShape === 'circular' &&
                    capRequiresTaperCut &&
                    jointQuad ? (
                      <CircularCapJointFiller
                        polygonPoints={jointQuad.polygonPoints}
                        heightFt={capJointHeightFt}
                        color='#c6b39a'
                        wireframe={wireframe}
                        showEdges={showBrickOutlines}
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
                          color='#c6b39a'
                          roughness={0.93}
                          wireframe={wireframe}
                        />
                      </>
                    )}
                  </mesh>
                );
              },
            );
          })()}

        {output.planShape !== 'circular' && capCornerJointSizeFt > 0.02 && (
          <>
            {[
              [geometry.capSpanWidthFt / 2, geometry.capSpanDepthFt / 2],
              [geometry.capSpanWidthFt / 2, -geometry.capSpanDepthFt / 2],
              [-geometry.capSpanWidthFt / 2, geometry.capSpanDepthFt / 2],
              [-geometry.capSpanWidthFt / 2, -geometry.capSpanDepthFt / 2],
            ].map(([x, z], index) => (
              <mesh
                key={`cap-corner-joint-${index}`}
                position={[
                  x as number,
                  geometry.capRiseFt + capBrickHeightFt / 2 + mortarJointFt / 2,
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
                  color='#c6b39a'
                  roughness={0.93}
                  wireframe={wireframe}
                />
              </mesh>
            ))}
          </>
        )}

        {output.planShape === 'circular' ? (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, capMortarBedY, 0]}
          >
            <ringGeometry
              args={[renderedCapInnerRadiusFt, renderedCapOuterRadiusFt, 128]}
            />
            <meshStandardMaterial
              color='#c6b39a'
              roughness={0.93}
              wireframe={wireframe}
            />
          </mesh>
        ) : (
          <RectangularRing
            widthFt={geometry.capSpanWidthFt}
            depthFt={geometry.capSpanDepthFt}
            thicknessFt={capBrickWidthFt}
            heightFt={capMortarBedHeightFt}
            y={capMortarBedY}
            color='#c6b39a'
            wireframe={wireframe}
            opacity={0.94}
          />
        )}

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
                  ]}
                />
                <meshStandardMaterial
                  color='#dfc7a0'
                  roughness={0.9}
                  transparent
                  opacity={0.6}
                  wireframe={wireframe}
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
                  ]}
                />
                <meshStandardMaterial
                  color='#8e3b2f'
                  roughness={0.82}
                  wireframe={wireframe}
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
                  ]}
                />
                <meshStandardMaterial
                  color='#8e3b2f'
                  roughness={0.82}
                  side={BackSide}
                  wireframe={wireframe}
                />
              </mesh>
            </>
          )}

        {output.linerSpec.enabled &&
          output.planShape === 'circular' &&
          output.linerSpec.type === 'steel-ring' && (
            <mesh position={[0, linerMidY, 0]}>
              <cylinderGeometry
                args={[
                  geometry.linerOuterRadiusFt,
                  geometry.linerOuterRadiusFt,
                  linerHeightFt,
                  96,
                  1,
                  true,
                ]}
              />
              <meshStandardMaterial
                color='#7b7f86'
                metalness={0.75}
                roughness={0.28}
                wireframe={wireframe}
              />
            </mesh>
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
            wireframe={wireframe}
          />
        )}

        {output.planShape === 'circular' ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <circleGeometry args={[innerVoidRadiusFt, 72]} />
            <meshStandardMaterial
              color='#3d3126'
              roughness={0.95}
              wireframe={wireframe}
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
              roughness={0.95}
              wireframe={wireframe}
            />
          </mesh>
        )}

        {gasPlacement && (
          <mesh
            position={[gasPlacement.x, 0.12, gasPlacement.z]}
            rotation={[0, gasPlacement.rotationY, 0]}
          >
            <boxGeometry
              args={[Math.max(0.2, brickWidthFt + 0.16), 0.045, 0.045]}
            />
            <meshStandardMaterial
              color={output.ventSpec.gasLineEntryClear ? '#2b6f9b' : '#a01d1d'}
              metalness={0.7}
              roughness={0.35}
              wireframe={wireframe}
            />
          </mesh>
        )}

        {showFlame && (
          <FlameCore
            innerRadiusFt={Math.max(0.18, innerVoidRadiusFt)}
            wallHeightFt={wallHeightFt}
          />
        )}

        <ContactShadows
          position={[0, -0.019, 0]}
          opacity={0.5}
          scale={7}
          blur={2.8}
          far={2.5}
        />
      </Canvas>
    </div>
  );
}
