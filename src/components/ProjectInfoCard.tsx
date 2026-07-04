import { useEffect, useState } from 'react';
import type { MasonryInput, MasonryOutput } from '../types';
import type { FoundationAdvisory } from '../utils/foundationAdvisory';

const seatingGroundTypeLabel: Record<string, string> = {
  gravel: 'Compacted gravel',
  mulch: 'Mulch / wood chips',
  'decomposed-granite': 'Decomposed granite',
  'permeable-paver': 'Permeable paver + grass',
  hardscape: 'Hardscape',
};

const seatingShapeLabel: Record<string, string> = {
  circular: 'circular',
  square: 'square',
};

const seatingFurnitureLabel: Record<string, string> = {
  adirondack: 'Adirondack seating',
  bench: 'bench seating',
};

const seatingDensityLabel: Record<string, string> = {
  cozy: 'cozy density',
  standard: 'standard density',
  spacious: 'spacious density',
};

interface ProjectInfoCardProps {
  input: MasonryInput;
  output: MasonryOutput;
  foundationAdvisory: FoundationAdvisory;
  noCutGuidance?:
    | {
        wall: { requiresCutting: boolean; minimumNoCutDiameterIn: number };
        cap: { requiresCutting: boolean; minimumNoCutDiameterIn: number };
        bothMinimumNoCutDiameterIn: number;
      }
    | undefined;
}

const riskClass = (risk: FoundationAdvisory['risk']) => {
  switch (risk) {
    case 'high':
      return 'rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900';
    case 'moderate':
      return 'rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900';
    default:
      return 'rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800';
  }
};

export default function ProjectInfoCard({
  input,
  output,
  foundationAdvisory,
  noCutGuidance,
}: ProjectInfoCardProps) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const copyToClipboard = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(label ? `${label} copied` : 'Copied to clipboard');
    } catch {
      setToast('Copy failed');
    }
  };

  const accessibilityProps = !toast ? { 'aria-hidden': true as const } : {};

  return (
    <div className='card-rise relative rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 text-sm shadow-lg'>
      <div
        {...accessibilityProps} // 2. Spread the props here
        role='status'
        aria-live='polite'
        className={`absolute right-4 top-4 z-50 rounded-md bg-amber-900 px-3 py-2 text-sm font-semibold text-amber-50 shadow transform transition-all duration-300 ${
          toast
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
        }`}
      >
        {toast ?? ''}
      </div>
      <div className='grid gap-3 sm:grid-cols-4'>
        <div className='rounded-xl bg-white/90 p-3 text-center shadow-sm border border-amber-900/10'>
          <p className='text-xs uppercase tracking-wide text-amber-950/75'>
            Units / Course
          </p>
          <p className='text-2xl font-bold'>{output.unitsPerCourseRounded}</p>
        </div>

        <div className='rounded-xl bg-white/90 p-3 text-center shadow-sm border border-amber-900/10'>
          <p className='text-xs uppercase tracking-wide text-amber-950/75'>
            Inner Diameter
          </p>
          <p className='text-2xl font-bold'>
            {input.planShape === 'circular'
              ? `${input.innerDiameterIn.toFixed(2)} in`
              : `${output.innerSpanWidthIn.toFixed(2)} x ${output.innerSpanDepthIn.toFixed(2)} in`}
          </p>
        </div>

        <div className='rounded-xl bg-white/90 p-3 text-center shadow-sm border border-amber-900/10'>
          <p className='text-xs uppercase tracking-wide text-amber-950/75'>
            Vent Area
          </p>
          <p className='text-2xl font-bold'>
            {output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in
          </p>
        </div>

        <div className='rounded-xl bg-white/90 p-3 text-center shadow-sm border border-amber-900/10'>
          <p className='text-xs uppercase tracking-wide text-amber-950/75'>
            Foundation Footprint
          </p>
          <p className='text-2xl font-bold'>
            {output.foundation.footprintWidthIn.toFixed(0)} in x{' '}
            {output.foundation.footprintDepthIn.toFixed(0)} in
          </p>
        </div>
      </div>
      <div className='mt-4 grid gap-4 md:grid-cols-2'>
        <div>
          <h3 className='mb-2 text-sm font-semibold uppercase text-amber-900/80'>
            Build Summary
          </h3>
          <dl className='grid gap-2'>
            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>Unit basis</dt>
              <dd className='font-semibold'>
                {output.resolvedUnit.name}{' '}
                {output.resolvedUnit.lengthIn.toFixed(3)} in x{' '}
                {output.resolvedUnit.widthIn.toFixed(3)} in x{' '}
                {output.resolvedUnit.heightIn.toFixed(3)} in
              </dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>Venting</dt>
              <dd className='font-semibold'>
                {output.ventSpec.placement === 'base'
                  ? 'Base Venting'
                  : 'Upper Venting'}{' '}
                ({output.ventSpec.layout})
              </dd>
            </div>

            {input.fuelType !== 'wood' && (
              <div className='flex justify-between'>
                <dt className='text-xs text-amber-950/75'>Gas template</dt>
                <dd className='font-semibold'>
                  {output.ventSpec.gasHardwareTemplateLabel ??
                    'Generic firepit cavity'}
                </dd>
              </div>
            )}

            <div className='flex justify-between items-center'>
              <dt className='text-xs text-amber-950/75'>Vent locations</dt>
              <dd className='flex items-center gap-2 font-semibold'>
                <span>
                  {output.ventSpec.ventBrickIndexes.join(', ') || '—'}
                </span>
                <button
                  type='button'
                  className='rounded-md border border-amber-900/20 bg-white/80 px-2 py-1 text-xs font-medium text-amber-950 hover:bg-white'
                  onClick={() =>
                    copyToClipboard(
                      output.ventSpec.ventBrickIndexes.join(', '),
                      'Vent locations',
                    )
                  }
                >
                  Copy
                </button>
              </dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>Liner system</dt>
              <dd className='font-semibold'>{output.linerSpec.description}</dd>
            </div>

            {input.fuelType !== 'wood' &&
              output.ventSpec.gasLineEntryAngleDeg !== undefined && (
                <div className='flex justify-between'>
                  <dt className='text-xs text-amber-950/75'>Gas line entry</dt>
                  <dd className='font-semibold'>
                    {output.ventSpec.gasLineEntryAngleDeg.toFixed(0)} deg at
                    brick {output.ventSpec.gasLineEntryBrickIndex}
                    {output.ventSpec.gasLineAutoAdjusted
                      ? ' (auto-shifted off vent gap)'
                      : ''}
                  </dd>
                </div>
              )}
          </dl>
        </div>

        <div>
          <h3 className='mb-2 text-sm font-semibold uppercase text-amber-900/80'>
            Foundation And Cap
          </h3>
          <dl className='grid gap-2'>
            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>
                Foundation footprint
              </dt>
              <dd className='font-semibold'>
                {output.foundation.footprintWidthIn.toFixed(2)} in x{' '}
                {output.foundation.footprintDepthIn.toFixed(2)} in
              </dd>
            </div>

            <div className='flex justify-between items-center'>
              <dt className='text-xs text-amber-950/75'>Foundation check</dt>
              <dd className='flex items-center gap-2'>
                <span className={riskClass(foundationAdvisory.risk)}>
                  {foundationAdvisory.heading}
                </span>
              </dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>Foundation base</dt>
              <dd className='font-semibold'>
                Compacted angular stone (3/4 in minus)
              </dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>Overhead clearance</dt>
              <dd className='font-semibold'>
                {(input.overheadClearanceFt ?? 20).toFixed(1)} ft
              </dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>Capstone type</dt>
              <dd className='font-semibold'>
                {output.resolvedCapUnit.name} ({input.capPlacementMode})
              </dd>
            </div>

            <div className='flex justify-between'>
              <dt className='text-xs text-amber-950/75'>Cut guidance</dt>
              <dd className='font-semibold'>
                {output.cutPlan.requiresCutting
                  ? `Taper each brick by ${output.cutPlan.recommendedTaperPerBrickIn.toFixed(3)} in (${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in per side)`
                  : 'No taper cuts required at this diameter'}
              </dd>
            </div>

            {output.cornerGuidance?.required && (
              <div className='flex justify-between'>
                <dt className='text-xs text-amber-950/75'>Corner interlock</dt>
                <dd className='font-semibold'>
                  {output.cornerGuidance.recommendedOverlapIn.toFixed(2)} in
                  overlap, up to{' '}
                  {output.cornerGuidance.cornerCutPerSideIn.toFixed(2)} in trim
                  per side
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      <details className='mt-4 rounded-lg border border-amber-900/15 bg-white/70 p-3'>
        <summary className='cursor-pointer font-medium'>Site notes</summary>
        <div className='mt-2 text-sm text-amber-900/85'>
          <p>
            Site context:{' '}
            <strong>
              {input.soilType ?? 'unknown'} soil,{' '}
              {input.drainageCondition ?? 'unknown'} drainage,{' '}
              {input.frostClimate
                ? 'freeze-thaw climate'
                : 'minimal frost risk'}
            </strong>
          </p>
          <ul className='mt-2 list-inside list-disc pl-4'>
            {foundationAdvisory.checks.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </details>
      <details className='mt-3 rounded-lg border border-amber-900/15 bg-white/70 p-3'>
        <summary className='cursor-pointer font-medium'>Cut notes</summary>
        <div className='mt-2 text-sm text-amber-900/85'>
          {output.cutPlan.notes.length > 0 ? (
            <ul className='list-disc pl-4'>
              {output.cutPlan.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : (
            <p>None</p>
          )}

          {noCutGuidance && (
            <p className='mt-2 text-xs text-amber-900/70'>
              No-cut minimum: {noCutGuidance.bothMinimumNoCutDiameterIn} in
            </p>
          )}
        </div>
      </details>
      {output.cornerGuidance?.required && (
        <details className='mt-3 rounded-lg border border-amber-900/15 bg-white/70 p-3'>
          <summary className='cursor-pointer font-medium'>
            Corner interlock notes
          </summary>
          <ul className='mt-2 list-disc pl-4 text-sm text-amber-900/85'>
            {output.cornerGuidance.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </details>
      )}
      {output.logistics.seatingAreaMaterials && (
        <details className='mt-3 rounded-lg border border-amber-900/15 bg-white/70 p-3'>
          <summary className='cursor-pointer font-medium'>
            Seating area materials &amp; tips
          </summary>
          <div className='mt-2 text-sm text-amber-900/85'>
            <p>
              <strong>
                {seatingGroundTypeLabel[
                  output.logistics.seatingAreaMaterials.groundType
                ] ?? output.logistics.seatingAreaMaterials.groundType}
              </strong>{' '}
              {seatingShapeLabel[output.logistics.seatingAreaMaterials.shape] ??
                output.logistics.seatingAreaMaterials.shape}{' '}
              seating zone with{' '}
              {seatingFurnitureLabel[
                output.logistics.seatingAreaMaterials.furnitureStyle
              ] ?? output.logistics.seatingAreaMaterials.furnitureStyle}{' '}
              at{' '}
              {seatingDensityLabel[
                output.logistics.seatingAreaMaterials.density
              ] ?? output.logistics.seatingAreaMaterials.density}
              :{' '}
              {output.logistics.seatingAreaMaterials.shape === 'square'
                ? `${output.logistics.seatingAreaMaterials.overallWidthFt.toFixed(1)} ft x ${output.logistics.seatingAreaMaterials.overallDepthFt.toFixed(1)} ft`
                : `${output.logistics.seatingAreaMaterials.radiusFt.toFixed(1)} ft radius`}
              , ~
              {Math.round(output.logistics.seatingAreaMaterials.areaSquareFeet)}{' '}
              sq ft
            </p>
            <table className='mt-2 w-full border-collapse text-xs'>
              <tbody>
                {output.logistics.seatingAreaMaterials.materials.map(
                  (material, i) => (
                    <tr key={i} className='border-b border-amber-900/10'>
                      <td className='py-1 pr-2'>{material.name}</td>
                      <td className='py-1 pr-2 font-semibold text-right'>
                        {material.quantity.toFixed(
                          material.unit === 'units' ? 0 : 1,
                        )}
                      </td>
                      <td className='py-1 text-amber-900/75'>
                        {material.unit}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
            <ul className='mt-2 list-disc pl-4'>
              {output.logistics.seatingAreaMaterials.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        </details>
      )}
      <div className='mt-4 flex flex-wrap gap-2'>
        <button
          type='button'
          className='rounded-full border border-amber-900/20 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-white'
          onClick={() =>
            copyToClipboard(
              JSON.stringify(
                {
                  project: {
                    innerDiameterIn: input.innerDiameterIn,
                    footprint: `${output.foundation.footprintWidthIn.toFixed(2)} x ${output.foundation.footprintDepthIn.toFixed(2)}`,
                    ventIndexes: output.ventSpec.ventBrickIndexes,
                  },
                },
                null,
                2,
              ),
              'Summary',
            )
          }
        >
          Copy build summary
        </button>

        <button
          type='button'
          className='rounded-full border border-amber-900/20 bg-amber-900 px-3 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-950'
          onClick={() => window.print()}
        >
          Print
        </button>
      </div>
    </div>
  );
}
