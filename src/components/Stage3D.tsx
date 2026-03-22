import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import type { MasonryOutput } from '../types'

interface Stage3DProps {
  output: MasonryOutput
}

export interface Stage3DGeometry {
  wallRadiusFt: number
  capRadiusFt: number
  capRiseFt: number
}

export function computeStage3DGeometry(output: MasonryOutput): Stage3DGeometry {
  return {
    wallRadiusFt: output.centerlineDiameterIn / 2 / 12,
    capRadiusFt: output.capstone.capCenterlineDiameterIn / 2 / 12,
    capRiseFt: output.courses.length * 0.09 + 0.03,
  }
}

export default function Stage3D({ output }: Stage3DProps) {
  const rings = useMemo(() => output.courses, [output.courses])
  const geometry = useMemo(() => computeStage3DGeometry(output), [output])

  return (
    <div className="card-rise h-[360px] rounded-2xl border border-amber-900/20 bg-amber-100/70 p-2 shadow-lg">
      <Canvas camera={{ position: [0, 1.7, 3.6], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 4, 2]} intensity={1.2} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
          <circleGeometry args={[2.6, 64]} />
          <meshStandardMaterial color="#d8c09b" />
        </mesh>

        {rings.map((course) => (
          <mesh key={course.courseIndex} position={[0, course.courseIndex * 0.09, 0]} rotation={[0, (course.offsetIn / 12) * 0.8, 0]}>
            <torusGeometry args={[geometry.wallRadiusFt, 0.08, 16, Math.max(30, course.unitCount * 2)]} />
            <meshStandardMaterial color={course.courseIndex % 2 === 0 ? '#a35a2a' : '#8f4c21'} />
          </mesh>
        ))}

        <mesh position={[0, geometry.capRiseFt, 0]}>
          <torusGeometry args={[geometry.capRadiusFt, 0.04, 12, 56]} />
          <meshStandardMaterial color="#d6b78f" />
        </mesh>
      </Canvas>
    </div>
  )
}
