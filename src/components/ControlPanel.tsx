import type { Dispatch, SetStateAction } from 'react'
import type { MasonryInput } from '../types'

interface ControlPanelProps {
  input: MasonryInput
  setInput: Dispatch<SetStateAction<MasonryInput>>
}

export default function ControlPanel({ input, setInput }: ControlPanelProps) {
  return (
    <section className="card-rise rounded-2xl border border-amber-900/20 bg-amber-50/70 p-5 shadow-lg backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">Design Inputs</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Inner Diameter (in)</span>
          <input
            className="rounded-md border border-amber-700/30 bg-white px-3 py-2"
            type="number"
            min={18}
            value={input.innerDiameterIn}
            onChange={(event) => setInput((prev) => ({ ...prev, innerDiameterIn: Number(event.target.value) }))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Wall Height (in)</span>
          <input
            className="rounded-md border border-amber-700/30 bg-white px-3 py-2"
            type="number"
            min={8}
            value={input.wallHeightIn}
            onChange={(event) => setInput((prev) => ({ ...prev, wallHeightIn: Number(event.target.value) }))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Mortar Joint (in)</span>
          <input
            className="rounded-md border border-amber-700/30 bg-white px-3 py-2"
            type="number"
            min={0.25}
            step={0.125}
            value={input.mortarJointIn}
            onChange={(event) => setInput((prev) => ({ ...prev, mortarJointIn: Number(event.target.value) }))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Structure Proximity (ft)</span>
          <input
            className="rounded-md border border-amber-700/30 bg-white px-3 py-2"
            type="number"
            min={1}
            value={input.proximityToStructuresFt}
            onChange={(event) => setInput((prev) => ({ ...prev, proximityToStructuresFt: Number(event.target.value) }))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Fuel Type</span>
          <select
            className="rounded-md border border-amber-700/30 bg-white px-3 py-2"
            value={input.fuelType}
            onChange={(event) => setInput((prev) => ({ ...prev, fuelType: event.target.value as MasonryInput['fuelType'] }))}
          >
            <option value="wood">Wood</option>
            <option value="propane">Propane</option>
            <option value="natural-gas">Natural Gas</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Orientation</span>
          <select
            className="rounded-md border border-amber-700/30 bg-white px-3 py-2"
            value={input.orientation}
            onChange={(event) => setInput((prev) => ({ ...prev, orientation: event.target.value as MasonryInput['orientation'] }))}
          >
            <option value="stretcher">Stretcher</option>
            <option value="header">Header</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Capstone Overhang (in)</span>
          <input
            className="rounded-md border border-amber-700/30 bg-white px-3 py-2"
            type="number"
            min={0}
            step={0.25}
            value={input.capstoneOverhangIn}
            onChange={(event) => setInput((prev) => ({ ...prev, capstoneOverhangIn: Number(event.target.value) }))}
          />
        </label>
      </div>
    </section>
  )
}
