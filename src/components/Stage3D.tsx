import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { useRef, useMemo, useState } from 'react';
import { BackSide } from 'three';
import type { Group } from 'three';
import type { MasonryOutput } from '../types';

interface Stage3DProps {
  output: MasonryOutput;
}

export interface Stage3DGeometry {
  wallRadiusFt: number;
  capRadiusFt: number;
  capRiseFt: number;
  courseRiseFt: number;
}

export function computeStage3DGeometry(output: MasonryOutput): Stage3DGeometry {
  const brickHeightFt = 2.25 / 12;
  const mortarJointFt = 0.375 / 12;

  return {
    wallRadiusFt: output.centerlineDiameterIn / 2 / 12,
    capRadiusFt: output.capstone.capCenterlineDiameterIn / 2 / 12,
    courseRiseFt: brickHeightFt + mortarJointFt,
    capRiseFt: output.courses.length * (brickHeightFt + mortarJointFt),
  };
}

// A type-safe handle for the subset of OrbitControls methods we use
type OrbitHandle = {
  object: { position: { set: (x: number, y: number, z: number) => void } };
  target: { set: (x: number, y: number, z: number) => void };
  update: () => void;
};

// Animated flame — must be rendered inside <Canvas>
function FlameCore({
  innerRadiusFt,
  wallHeightFt,
}: {
  innerRadiusFt: number;
  wallHeightFt: number;
}) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.scale.x = 1 + Math.sin(t * 4.1) * 0.09;
    groupRef.current.scale.z = 1 + Math.cos(t * 3.3) * 0.09;
  });
  const coneH = Math.min(wallHeightFt * 0.9, innerRadiusFt * 2.4);
  const coneR = innerRadiusFt * 0.52;

  return (
    <group ref={groupRef}>
      {/* ember base */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[coneR * 0.72, coneR * 0.88, 0.07, 20]} />
        <meshStandardMaterial
          color='#ff6600'
          emissive='#cc3300'
          emissiveIntensity={2.4}
        />
      </mesh>
      {/* outer flame */}
      <mesh position={[0, coneH * 0.42, 0]}>
        <coneGeometry args={[coneR, coneH, 14, 1, true]} />
        <meshStandardMaterial
          color='#ff4400'
          emissive='#ff1100'
          emissiveIntensity={2.8}
          transparent
          opacity={0.72}
          side={BackSide}
        />
      </mesh>
      {/* bright inner core */}
      <mesh position={[0, coneH * 0.28, 0]}>
        <coneGeometry args={[coneR * 0.44, coneH * 0.62, 10, 1, true]} />
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
        position={[0, coneH * 0.3, 0]}
        color='#ff6600'
        intensity={1.4}
        distance={3.8}
        decay={2}
      />
    </group>
  );
}

export default function Stage3D({ output }: Stage3DProps) {
  const [wireframe, setWireframe] = useState(false);
  const [showFlame, setShowFlame] = useState(false);
  const orbitRef = useRef<OrbitHandle>(null);

  const rings = useMemo(() => output.courses, [output.courses]);
  const geometry = useMemo(() => computeStage3DGeometry(output), [output]);

  const brickLengthFt = 7.625 / 12;
  const brickHeightFt = 2.25 / 12;
  const brickWidthFt = 3.625 / 12;
  const mortarJointFt = 0.375 / 12;

  // Slightly inset bricks so the mortar background shell shows in all joint gaps
  const visBrickL = brickLengthFt - mortarJointFt * 0.55;
  const visBrickH = brickHeightFt - mortarJointFt * 0.6;
  const visBrickW = brickWidthFt - mortarJointFt * 0.8;

  const wallRadiusIn = output.centerlineDiameterIn / 2;
  const outerWallRadiusFt = geometry.wallRadiusFt + brickWidthFt / 2;
  const innerWallRadiusFt = geometry.wallRadiusFt - brickWidthFt / 2;
  const wallHeightFt = geometry.capRiseFt;
  const mortarColor = '#c6b39a';

  const topDown = () => {
    if (!orbitRef.current) return;
    orbitRef.current.target.set(0, wallHeightFt / 2, 0);
    orbitRef.current.object.position.set(0, 6, 0.001);
    orbitRef.current.update();
  };

  const sideView = () => {
    if (!orbitRef.current) return;
    orbitRef.current.target.set(0, 0, 0);
    orbitRef.current.object.position.set(0, 2.2, 4.8);
    orbitRef.current.update();
  };

  return (
    <div className='card-rise relative h-[460px] rounded-2xl border border-amber-900/20 bg-amber-100/70 p-2 shadow-lg'>
      {/* Top-right controls */}
      <div className='absolute right-4 top-4 z-10 flex flex-col items-end gap-2'>
        <div className='flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow'>
          <span>Wireframe</span>
          <button
            className={`h-5 w-10 rounded-full transition-colors ${wireframe ? 'bg-amber-900' : 'bg-amber-300'}`}
            onClick={() => setWireframe((v) => !v)}
            aria-label='Toggle wireframe'
          >
            <span
              className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${wireframe ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        </div>

        <div className='flex items-center gap-2 rounded-full bg-amber-50/95 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow'>
          <span>Flame</span>
          <button
            className={`h-5 w-10 rounded-full transition-colors ${showFlame ? 'bg-orange-500' : 'bg-amber-300'}`}
            onClick={() => setShowFlame((v) => !v)}
            aria-label='Toggle flame'
          >
            <span
              className={`block h-4 w-4 rounded-full bg-amber-50 transition-transform ${showFlame ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        </div>

        <div className='flex gap-1.5'>
          <button
            className='rounded-full bg-amber-50/95 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow'
            onClick={topDown}
          >
            Top
          </button>
          <button
            className='rounded-full bg-amber-50/95 px-3 py-1.5 text-xs font-semibold text-amber-950 shadow'
            onClick={sideView}
          >
            Side
          </button>
        </div>
      </div>

      {/* Bottom-left legend */}
      <div className='absolute bottom-4 left-4 z-10 rounded-xl bg-amber-50/95 px-3 py-2 text-xs text-amber-950 shadow'>
        <p className='mb-1 font-semibold'>3D Legend</p>
        <p>
          <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#7d3512]' />
          Wall Brick
        </p>
        <p>
          <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#ccb085]' />
          Cap Brick
        </p>
        <p>
          <span className='mr-1 inline-block h-2 w-2 rounded-full bg-[#c6b39a]' />
          Mortar Joint
        </p>
      </div>

      <Canvas camera={{ position: [0, 2.2, 4.8], fov: 48 }}>
        <ambientLight intensity={0.65} />
        <hemisphereLight
          skyColor='#fff4dd'
          groundColor='#8e7a5b'
          intensity={0.48}
        />
        <directionalLight position={[3.5, 5.5, 3]} intensity={1.1} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <OrbitControls
          ref={orbitRef as any}
          enablePan={false}
          maxPolarAngle={Math.PI * 0.49}
          minDistance={2.2}
          maxDistance={9}
        />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[3.4, 96]} />
          <meshStandardMaterial
            color='#dbc8a6'
            roughness={0.9}
            wireframe={wireframe}
          />
        </mesh>

        {/* Compacted stone footprint */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <circleGeometry
            args={[output.foundation.footprintDiameterIn / 2 / 12, 96]}
          />
          <meshStandardMaterial
            color='#b3a284'
            roughness={1.0}
            wireframe={wireframe}
          />
        </mesh>

        {/* MORTAR OUTER SHELL — fills all vertical head joints from the outside */}
        <mesh position={[0, wallHeightFt / 2, 0]}>
          <cylinderGeometry
            args={[
              outerWallRadiusFt,
              outerWallRadiusFt,
              wallHeightFt,
              128,
              1,
              true,
            ]}
          />
          <meshStandardMaterial
            color={mortarColor}
            roughness={0.93}
            wireframe={wireframe}
          />
        </mesh>

        {/* MORTAR INNER SHELL — fills vertical joints visible through the top opening */}
        <mesh position={[0, wallHeightFt / 2, 0]}>
          <cylinderGeometry
            args={[
              innerWallRadiusFt,
              innerWallRadiusFt,
              wallHeightFt,
              128,
              1,
              true,
            ]}
          />
          <meshStandardMaterial
            color={mortarColor}
            roughness={0.93}
            side={BackSide}
            wireframe={wireframe}
          />
        </mesh>

        {/* HORIZONTAL BED JOINTS — flat ring between each course */}
        {rings.map(
          (course) =>
            course.courseIndex > 0 && (
              <mesh
                key={`bed-${course.courseIndex}`}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, course.courseIndex * geometry.courseRiseFt, 0]}
              >
                <ringGeometry
                  args={[innerWallRadiusFt, outerWallRadiusFt, 128]}
                />
                <meshStandardMaterial
                  color={mortarColor}
                  roughness={0.93}
                  wireframe={wireframe}
                />
              </mesh>
            ),
        )}

        {/* Wall bricks — slightly inset so mortar shell shows around all edges */}
        {rings.map((course) => (
          <group key={course.courseIndex}>
            {Array.from({ length: course.unitCount }, (_, brickIdx) => {
              const baseAngle = (brickIdx / course.unitCount) * Math.PI * 2;
              const offsetRad = course.offsetIn / wallRadiusIn;
              const angle = baseAngle + offsetRad;
              const x = Math.cos(angle) * geometry.wallRadiusFt;
              const z = Math.sin(angle) * geometry.wallRadiusFt;
              const y =
                brickHeightFt / 2 +
                course.courseIndex * geometry.courseRiseFt +
                mortarJointFt / 2;

              return (
                <mesh
                  key={`${course.courseIndex}-${brickIdx}`}
                  position={[x, y, z]}
                  rotation={[0, -angle + Math.PI / 2, 0]}
                >
                  <boxGeometry args={[visBrickL, visBrickH, visBrickW]} />
                  <meshStandardMaterial
                    color={course.courseIndex % 2 === 0 ? '#924018' : '#7d3512'}
                    roughness={0.82}
                    wireframe={wireframe}
                  />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* Cap bed joint ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, wallHeightFt, 0]}>
          <ringGeometry
            args={[
              innerWallRadiusFt,
              outerWallRadiusFt +
                (geometry.capRadiusFt - geometry.wallRadiusFt),
              128,
            ]}
          />
          <meshStandardMaterial
            color={mortarColor}
            roughness={0.93}
            wireframe={wireframe}
          />
        </mesh>

        {/* Capstone bricks */}
        {Array.from(
          { length: output.capstone.capUnitsPerCourseRounded },
          (_, capIdx) => {
            const angle =
              (capIdx / output.capstone.capUnitsPerCourseRounded) * Math.PI * 2;
            const x = Math.cos(angle) * geometry.capRadiusFt;
            const z = Math.sin(angle) * geometry.capRadiusFt;
            const y =
              geometry.capRiseFt + brickHeightFt / 2 + mortarJointFt / 2;

            return (
              <mesh
                key={`cap-${capIdx}`}
                position={[x, y, z]}
                rotation={[0, -angle + Math.PI / 2, 0]}
              >
                <boxGeometry args={[visBrickL, visBrickH, visBrickW]} />
                <meshStandardMaterial
                  color='#ccb085'
                  roughness={0.65}
                  wireframe={wireframe}
                />
              </mesh>
            );
          },
        )}

        {/* Inner burn area */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <circleGeometry args={[innerWallRadiusFt, 72]} />
          <meshStandardMaterial
            color='#3d3126'
            roughness={0.95}
            wireframe={wireframe}
          />
        </mesh>

        {showFlame && (
          <FlameCore
            innerRadiusFt={innerWallRadiusFt}
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
