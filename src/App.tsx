import { useMemo, useState } from 'react';
import ControlPanel from './components/ControlPanel';
import ConstructionMode from './components/ConstructionMode';
import KnowledgeCenter from './components/KnowledgeCenter';
import SafetyClearanceDiagram from './components/SafetyClearanceDiagram';
import Stage3D from './components/Stage3D';
import { MasonryEngine } from './engine/MasonryEngine';
import type { MasonryInput } from './types';
import { buildFoundationAdvisory } from './utils/foundationAdvisory';

const engine = new MasonryEngine();

function getFoundationRiskBadgeClasses(risk: 'low' | 'moderate' | 'high') {
  if (risk === 'high') {
    return 'border-red-800/25 bg-red-100 text-red-900';
  }
  if (risk === 'moderate') {
    return 'border-amber-900/20 bg-amber-100 text-amber-950';
  }
  return 'border-emerald-800/25 bg-emerald-100 text-emerald-900';
}

function roundUpToHundredth(value: number): number {
  return Math.ceil(value * 100) / 100;
}

function findNoCutDiameterIn(
  input: MasonryInput,
  predicate: (nextOutput: ReturnType<typeof engine.calculateDesign>) => boolean,
): number {
  const start = Math.max(18, input.innerDiameterIn);
  const maxDiameterIn = 180;

  // Coarse search first to quickly bracket a passing diameter.
  let coarseCandidate: number | undefined;
  for (
    let diameterIn = start;
    diameterIn <= maxDiameterIn;
    diameterIn += 0.25
  ) {
    const candidateOutput = engine.calculateDesign({
      ...input,
      innerDiameterIn: diameterIn,
    });
    if (predicate(candidateOutput)) {
      coarseCandidate = diameterIn;
      break;
    }
  }

  if (coarseCandidate === undefined) {
    return maxDiameterIn;
  }

  // Refine within the previous coarse bucket for stable UX button values.
  const refineStart = Math.max(start, coarseCandidate - 0.25);
  for (
    let diameterIn = refineStart;
    diameterIn <= coarseCandidate;
    diameterIn += 0.01
  ) {
    const candidateOutput = engine.calculateDesign({
      ...input,
      innerDiameterIn: diameterIn,
    });
    if (predicate(candidateOutput)) {
      return roundUpToHundredth(diameterIn);
    }
  }

  return roundUpToHundredth(coarseCandidate);
}

type ViewMode = '3d' | 'construction';
type SiteView = 'designer' | 'guide' | 'tips' | 'research';

const initialInput: MasonryInput = {
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
  capOrientation: 'match-wall',
  bondPattern: 'running-bond',
  ventCount: 4,
  ventOpeningAreaSqIn: 5,
  gasLineEntryAngleDeg: 225,
  capstoneOverhangIn: 2,
  capPlacementMode: 'outward-only',
  soilType: 'unknown',
  drainageCondition: 'unknown',
  frostClimate: false,
  capstonePresetKey: 'matching',
  brickPresetKey: 'modular',
  customBrickLengthIn: 7.625,
  customBrickWidthIn: 3.625,
  customBrickHeightIn: 2.25,
  customBrickInnerLengthIn: 7.25,
  customBrickOuterLengthIn: 8,
  customCapLengthIn: 14,
  customCapWidthIn: 10,
  customCapHeightIn: 2,
  customCapInnerLengthIn: 13.5,
  customCapOuterLengthIn: 14.5,
};

export default function App() {
  const [input, setInput] = useState<MasonryInput>(initialInput);
  const [view, setView] = useState<ViewMode>('3d');
  const [siteView, setSiteView] = useState<SiteView>('designer');

  const output = useMemo(() => engine.calculateDesign(input), [input]);
  const foundationAdvisory = useMemo(
    () => buildFoundationAdvisory(input, output),
    [input, output],
  );
  const noCutGuidance = useMemo(() => {
    if (output.planShape !== 'circular') {
      return undefined;
    }
    const wallMinimumNoCutDiameterIn = findNoCutDiameterIn(
      input,
      (nextOutput) => !nextOutput.cutPlan.requiresCutting,
    );
    const capMinimumNoCutDiameterIn = findNoCutDiameterIn(
      input,
      (nextOutput) => !nextOutput.capstone.requiresTaperCutting,
    );
    const capRequiresCutting = output.capstone.requiresTaperCutting;
    const bothMinimumNoCutDiameterIn = roundUpToHundredth(
      Math.max(wallMinimumNoCutDiameterIn, capMinimumNoCutDiameterIn),
    );

    return {
      wall: {
        requiresCutting: output.cutPlan.requiresCutting,
        minimumNoCutDiameterIn: wallMinimumNoCutDiameterIn,
      },
      cap: {
        requiresCutting: capRequiresCutting,
        minimumNoCutDiameterIn: capMinimumNoCutDiameterIn,
      },
      bothMinimumNoCutDiameterIn,
    };
  }, [input, output]);

  const siteTabs: Array<{ value: SiteView; label: string }> = [
    { value: 'designer', label: 'Designer' },
    { value: 'guide', label: 'Instructions' },
    { value: 'tips', label: 'Tips' },
    { value: 'research', label: 'Field Notes' },
  ];

  return (
    <main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10'>
      <header className='mb-5 card-rise rounded-2xl border border-amber-900/20 bg-amber-100/70 p-5 shadow-lg backdrop-blur'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/75'>
              Fire Pit Design Studio
            </p>
            <h1 className='mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl'>
              Parametric Masonry Designer
            </h1>
            <p className='mt-2 max-w-3xl text-sm leading-6 sm:text-base'>
              Plan masonry fire pits with real unit dimensions, venting rules,
              safety checks, material estimates, and build-focused reference
              guidance.
            </p>
          </div>

          <nav className='flex flex-wrap gap-2' aria-label='Site sections'>
            {siteTabs.map((tab) => {
              const selected = siteView === tab.value;

              return (
                <button
                  key={tab.value}
                  type='button'
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-amber-900 text-amber-50'
                      : 'bg-white/70 text-amber-900 hover:bg-white'
                  }`}
                  onClick={() => setSiteView(tab.value)}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {siteView === 'designer' ? (
        <div className='grid gap-4 lg:grid-cols-[360px_1fr]'>
          <ControlPanel
            input={input}
            setInput={setInput}
            noCutGuidance={noCutGuidance}
          />

          <section className='space-y-4'>
            <div className='card-rise grid gap-3 rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg sm:grid-cols-3'>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Units/Course
                </p>
                <p className='text-2xl font-bold'>
                  {output.unitsPerCourseRounded}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Total Units
                </p>
                <p className='text-2xl font-bold'>{output.totalUnits}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Plan Shape
                </p>
                <p className='text-2xl font-bold'>{output.planShape}</p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Cap Units
                </p>
                <p className='text-2xl font-bold'>
                  {output.capstone.capUnitsPerCourseRounded}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Liner
                </p>
                <p className='text-lg font-bold'>
                  {output.linerSpec.type === 'none'
                    ? 'None'
                    : output.linerSpec.type === 'fire-brick'
                      ? 'Fire Brick'
                      : 'Steel Ring'}
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Stone Base (yd3)
                </p>
                <p className='text-2xl font-bold'>
                  {output.foundation.stoneVolumeCubicYards.toFixed(2)}
                </p>
                <p className='mt-1'>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getFoundationRiskBadgeClasses(
                      foundationAdvisory.risk,
                    )}`}
                  >
                    {foundationAdvisory.risk} review
                  </span>
                </p>
              </div>
            </div>

            <div className='card-rise grid gap-3 rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg sm:grid-cols-2 lg:grid-cols-5'>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Purchased Units
                </p>
                <p className='text-xl font-bold'>
                  {output.logistics.purchasedUnits}
                </p>
                <p className='text-xs text-amber-900/70'>
                  Includes {output.logistics.wasteFactorPct}% waste
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Brick Weight
                </p>
                <p className='text-xl font-bold'>
                  {Math.round(output.logistics.estimatedBrickWeightLb)} lb
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Stone Weight
                </p>
                <p className='text-xl font-bold'>
                  {Math.round(output.logistics.estimatedStoneWeightLb)} lb
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Mortar Volume
                </p>
                <p className='text-xl font-bold'>
                  {output.logistics.estimatedMortarVolumeCubicFeet.toFixed(1)}{' '}
                  ft3
                </p>
              </div>
              <div>
                <p className='text-xs uppercase tracking-wide text-amber-950/75'>
                  Cap Weight
                </p>
                <p className='text-xl font-bold'>
                  {Math.round(output.logistics.estimatedCapWeightLb)} lb
                </p>
                <p className='text-xs text-amber-900/70'>
                  Purchased caps: {output.logistics.purchasedCapUnits}
                </p>
              </div>
            </div>

            {output.warnings.length > 0 && (
              <div className='card-rise rounded-2xl border border-red-800/25 bg-red-50 p-4 text-red-900 shadow-lg'>
                {output.warnings.map((warning) => (
                  <p key={warning.code} className='text-sm font-medium'>
                    {warning.message}
                    {warning.actualValue !== undefined && (
                      <>
                        {' '}
                        Entered: {warning.actualValue.toFixed(1)}
                        {warning.code === 'clearance-too-low'
                          ? ' ft'
                          : warning.code === 'gas-line-near-vent'
                            ? ' deg'
                            : ''}
                        .
                      </>
                    )}
                  </p>
                ))}
              </div>
            )}

            <div className='flex gap-2'>
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

            {view === '3d' ? (
              <Stage3D output={output} />
            ) : (
              <ConstructionMode input={input} output={output} />
            )}

            <SafetyClearanceDiagram input={input} output={output} />

            <div className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 text-sm shadow-lg'>
              <p>
                Unit basis:{' '}
                <strong>
                  {output.resolvedUnit.name}{' '}
                  {output.resolvedUnit.lengthIn.toFixed(3)}
                  in x {output.resolvedUnit.widthIn.toFixed(3)} in x{' '}
                  {output.resolvedUnit.heightIn.toFixed(3)} in
                </strong>
              </p>
              <p>
                Plan footprint:{' '}
                <strong>
                  {output.innerSpanWidthIn.toFixed(2)} in x{' '}
                  {output.innerSpanDepthIn.toFixed(2)} in inner
                </strong>
              </p>
              <p>
                Vent rule:{' '}
                <strong>
                  {output.ventSpec.placement === 'base'
                    ? 'Base Venting'
                    : 'Upper Venting'}
                </strong>{' '}
                ({output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in total open
                area, {output.ventSpec.layout})
              </p>
              <p>
                Vent brick indexes:{' '}
                <strong>{output.ventSpec.ventBrickIndexes.join(', ')}</strong>
              </p>
              <p>
                Liner system: <strong>{output.linerSpec.description}</strong>
              </p>
              {input.fuelType !== 'wood' &&
                output.ventSpec.gasLineEntryAngleDeg !== undefined && (
                  <p>
                    Gas line entry:{' '}
                    <strong>
                      {output.ventSpec.gasLineEntryAngleDeg.toFixed(0)} deg at
                      brick {output.ventSpec.gasLineEntryBrickIndex}
                    </strong>
                    {output.ventSpec.gasLineAutoAdjusted &&
                      ' (auto-shifted off vent gap)'}
                  </p>
                )}
              <p>
                Foundation footprint:{' '}
                <strong>
                  {output.foundation.footprintWidthIn.toFixed(2)} in x{' '}
                  {output.foundation.footprintDepthIn.toFixed(2)} in
                </strong>{' '}
                with 8 in angular stone depth.
              </p>
              <p>
                Foundation advisory:{' '}
                <strong>{foundationAdvisory.heading}</strong> (
                {foundationAdvisory.risk} risk).
              </p>
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
              {foundationAdvisory.checks.map((check) => (
                <p key={check}>- {check}</p>
              ))}
              <p>
                Capstone span:{' '}
                <strong>
                  {output.capstone.capOuterWidthIn.toFixed(2)} in x{' '}
                  {output.capstone.capOuterDepthIn.toFixed(2)} in
                </strong>{' '}
                ({input.capstoneOverhangIn.toFixed(2)} in overhang each side).
              </p>
              <p>
                Capstone type: <strong>{output.resolvedCapUnit.name}</strong> (
                {input.capPlacementMode})
              </p>
              <p>
                Cut guidance:{' '}
                <strong>
                  {output.cutPlan.requiresCutting
                    ? `Taper each brick by ${output.cutPlan.recommendedTaperPerBrickIn.toFixed(3)} in (${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in per side)`
                    : 'No taper cuts required at this diameter'}
                </strong>
              </p>
            </div>
          </section>
        </div>
      ) : (
        <KnowledgeCenter view={siteView} />
      )}
    </main>
  );
}
