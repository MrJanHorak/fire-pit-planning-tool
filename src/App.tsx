import { useMemo, useState } from 'react'
import ControlPanel from './components/ControlPanel'
import ConstructionMode from './components/ConstructionMode'
import SafetyClearanceDiagram from './components/SafetyClearanceDiagram'
import Stage3D from './components/Stage3D'
import { MasonryEngine } from './engine/MasonryEngine'
import type { MasonryInput } from './types'

const engine = new MasonryEngine()

type ViewMode = '3d' | 'construction'

const initialInput: MasonryInput = {
  innerDiameterIn: 36,
  wallHeightIn: 18,
  proximityToStructuresFt: 12,
  fuelType: 'propane',
  mortarJointIn: 0.375,
  orientation: 'stretcher',
  bondPattern: 'running-bond',
  ventCount: 4,
  capstoneOverhangIn: 2,
}

export default function App() {
  const [input, setInput] = useState<MasonryInput>(initialInput)
  const [view, setView] = useState<ViewMode>('3d')

  const output = useMemo(() => engine.calculateDesign(input), [input])

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-5 card-rise rounded-2xl border border-amber-900/20 bg-amber-100/70 p-5 shadow-lg backdrop-blur">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Parametric Masonry Designer</h1>
        <p className="mt-2 text-sm sm:text-base">
          Engineering-accurate firepit layout with running bond logic, vent placement rules, and real-time foundation quantities.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <ControlPanel input={input} setInput={setInput} />

        <section className="space-y-4">
          <div className="card-rise grid gap-3 rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Units/Course</p>
              <p className="text-2xl font-bold">{output.unitsPerCourseRounded}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Total Units</p>
              <p className="text-2xl font-bold">{output.totalUnits}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Stone Base (yd3)</p>
              <p className="text-2xl font-bold">{output.foundation.stoneVolumeCubicYards.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Cap Units</p>
              <p className="text-2xl font-bold">{output.capstone.capUnitsPerCourseRounded}</p>
            </div>
          </div>

          <div className="card-rise grid gap-3 rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Purchased Units</p>
              <p className="text-xl font-bold">{output.logistics.purchasedUnits}</p>
              <p className="text-xs text-amber-900/70">Includes {output.logistics.wasteFactorPct}% waste</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Brick Weight</p>
              <p className="text-xl font-bold">{Math.round(output.logistics.estimatedBrickWeightLb)} lb</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Stone Weight</p>
              <p className="text-xl font-bold">{Math.round(output.logistics.estimatedStoneWeightLb)} lb</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Mortar Volume</p>
              <p className="text-xl font-bold">{output.logistics.estimatedMortarVolumeCubicFeet.toFixed(1)} ft3</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-950/75">Cap Weight</p>
              <p className="text-xl font-bold">{Math.round(output.logistics.estimatedCapWeightLb)} lb</p>
              <p className="text-xs text-amber-900/70">Purchased caps: {output.logistics.purchasedCapUnits}</p>
            </div>
          </div>

          {output.warnings.length > 0 && (
            <div className="card-rise rounded-2xl border border-red-800/25 bg-red-50 p-4 text-red-900 shadow-lg">
              {output.warnings.map((warning) => (
                <p key={warning.code} className="text-sm font-medium">
                  {warning.message} Entered: {warning.actualValue.toFixed(1)} ft.
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${view === '3d' ? 'bg-amber-900 text-amber-50' : 'bg-amber-100 text-amber-900'}`}
              onClick={() => setView('3d')}
            >
              3D Stage
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${view === 'construction' ? 'bg-amber-900 text-amber-50' : 'bg-amber-100 text-amber-900'}`}
              onClick={() => setView('construction')}
            >
              Construction Mode
            </button>
          </div>

          {view === '3d' ? <Stage3D output={output} /> : <ConstructionMode input={input} output={output} />}

          <SafetyClearanceDiagram input={input} output={output} />

          <div className="card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 text-sm shadow-lg">
            <p>
              Vent rule: <strong>{output.ventSpec.placement === 'base' ? 'Base Venting' : 'Upper Venting'}</strong> ({output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in total open area)
            </p>
            <p>
              Foundation footprint diameter: <strong>{output.foundation.footprintDiameterIn.toFixed(2)} in</strong> with 8 in angular stone depth.
            </p>
            <p>
              Capstone diameter: <strong>{output.capstone.capOuterDiameterIn.toFixed(2)} in</strong> ({input.capstoneOverhangIn.toFixed(2)} in overhang each side).
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
