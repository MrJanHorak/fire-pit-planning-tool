import { useEffect, useMemo, useState } from 'react';
import { MasonryEngine } from '../engine/MasonryEngine';
import type { MasonryInput, MasonryOutput } from '../types';
import type { StoredFirepitProjectSnapshot } from '../utils/projectFile';
import { buildProjectComparisonMetrics } from '../utils/projectComparison';

const CURRENT_VARIANT_ID = '__current__';
const comparisonEngine = new MasonryEngine();

type Variant = {
  id: string;
  label: string;
  input: MasonryInput;
  output: MasonryOutput;
};

function formatSnapshotTime(value: string | null): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ProjectComparisonPanelProps {
  currentProjectName: string;
  currentInput: MasonryInput;
  currentOutput: MasonryOutput;
  snapshots: StoredFirepitProjectSnapshot[];
}

export default function ProjectComparisonPanel({
  currentProjectName,
  currentInput,
  currentOutput,
  snapshots,
}: ProjectComparisonPanelProps) {
  const [leftVariantId, setLeftVariantId] = useState<string>(CURRENT_VARIANT_ID);
  const [rightVariantId, setRightVariantId] = useState<string>(
    snapshots[0]?.id ?? CURRENT_VARIANT_ID,
  );

  useEffect(() => {
    if (snapshots.length === 0) {
      setRightVariantId(CURRENT_VARIANT_ID);
      return;
    }

    if (rightVariantId === CURRENT_VARIANT_ID) {
      setRightVariantId(snapshots[0].id);
      return;
    }

    if (!snapshots.some((snapshot) => snapshot.id === rightVariantId)) {
      setRightVariantId(snapshots[0].id);
    }
  }, [rightVariantId, snapshots]);

  const snapshotOutputs = useMemo(
    () =>
      new Map(
        snapshots.map((snapshot) => [
          snapshot.id,
          comparisonEngine.calculateDesign(snapshot.input),
        ]),
      ),
    [snapshots],
  );

  const variants = useMemo(() => {
    const base: Variant[] = [
      {
        id: CURRENT_VARIANT_ID,
        label: `Current Draft — ${currentProjectName}`,
        input: currentInput,
        output: currentOutput,
      },
    ];

    const savedVariants: Variant[] = snapshots
      .map((snapshot) => {
        const output = snapshotOutputs.get(snapshot.id);
        if (!output) return null;
        return {
          id: snapshot.id,
          label: `${snapshot.projectName ?? 'Untitled Firepit'} — ${formatSnapshotTime(snapshot.savedAt)}`,
          input: snapshot.input,
          output,
        };
      })
      .filter((variant): variant is Variant => variant !== null);

    return [...base, ...savedVariants];
  }, [
    currentInput,
    currentOutput,
    currentProjectName,
    snapshotOutputs,
    snapshots,
  ]);

  const leftVariant = variants.find((variant) => variant.id === leftVariantId);
  const rightVariant = variants.find((variant) => variant.id === rightVariantId);

  const metrics = useMemo(() => {
    if (!leftVariant || !rightVariant) {
      return [];
    }
    return buildProjectComparisonMetrics(
      leftVariant.input,
      leftVariant.output,
      rightVariant.input,
      rightVariant.output,
    );
  }, [leftVariant, rightVariant]);

  return (
    <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/75'>
          Variant Comparison
        </p>
        <span className='rounded-full border border-amber-900/20 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950'>
          Side-by-side project analysis
        </span>
      </div>

      <div className='mt-3 grid gap-2 sm:grid-cols-2'>
        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/70'>
            Left Variant
          </span>
          <select
            className='rounded-lg border border-amber-900/20 bg-white/85 px-3 py-2 text-sm text-amber-950'
            value={leftVariantId}
            onChange={(event) => setLeftVariantId(event.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>
        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/70'>
            Right Variant
          </span>
          <select
            className='rounded-lg border border-amber-900/20 bg-white/85 px-3 py-2 text-sm text-amber-950'
            value={rightVariantId}
            onChange={(event) => setRightVariantId(event.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {snapshots.length === 0 && (
        <p className='mt-3 rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2 text-sm text-amber-950/85'>
          Save at least one browser snapshot to compare versions over time. You can
          still compare against the current draft once a snapshot exists.
        </p>
      )}

      {leftVariant && rightVariant && (
        <>
          {leftVariant.id === rightVariant.id ? (
            <p className='mt-3 rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2 text-sm text-amber-950/85'>
              Select two different variants to see meaningful deltas.
            </p>
          ) : (
            <div className='mt-3 overflow-x-auto rounded-lg border border-amber-900/20 bg-white/80'>
              <table className='min-w-full text-sm'>
                <thead className='bg-amber-100/70 text-amber-950'>
                  <tr>
                    <th className='px-3 py-2 text-left font-semibold'>Metric</th>
                    <th className='px-3 py-2 text-left font-semibold'>Left</th>
                    <th className='px-3 py-2 text-left font-semibold'>Right</th>
                    <th className='px-3 py-2 text-left font-semibold'>Delta (R-L)</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.key} className='border-t border-amber-900/10'>
                      <td className='px-3 py-2 font-medium text-amber-950'>
                        {metric.label}
                      </td>
                      <td className='px-3 py-2 text-amber-950/90'>{metric.leftValue}</td>
                      <td className='px-3 py-2 text-amber-950/90'>{metric.rightValue}</td>
                      <td className='px-3 py-2 text-amber-950/90'>
                        {metric.delta ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
