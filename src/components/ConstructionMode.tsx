import { useState } from 'react';
import type { MasonryOutput } from '../types';
import type { MasonryInput } from '../types';
import {
  buildCapstonePlacementSampleSvg,
  buildConstructionPacketHtml,
  buildCoursePlanSvg,
  buildWallBrickTaperCutSvg,
} from '../utils/constructionPacket';
import { buildFoundationAdvisory } from '../utils/foundationAdvisory';
import { FoundationRiskBadge, FoundationRiskLegend } from './FoundationReview';

interface ConstructionModeProps {
  input: MasonryInput;
  output: MasonryOutput;
}

type ConstructionTab = 'layout' | 'cuts' | 'site';

const CONSTRUCTION_TAB_KEY =
  'firepit-parametric-masonry-designer-construction-tab';

export default function ConstructionMode({
  input,
  output,
}: ConstructionModeProps) {
  const [expandedDetail, setExpandedDetail] = useState<'wall' | 'cap' | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ConstructionTab>(() => {
    if (typeof window === 'undefined') return 'layout';
    const stored = window.localStorage.getItem(CONSTRUCTION_TAB_KEY);
    return stored === 'layout' || stored === 'cuts' || stored === 'site'
      ? stored
      : 'layout';
  });

  const handleTabChange = (tab: ConstructionTab) => {
    setActiveTab(tab);
    window.localStorage.setItem(CONSTRUCTION_TAB_KEY, tab);
  };
  const coursePlanMarkup = buildCoursePlanSvg(output);
  const wallBrickCutMarkup = buildWallBrickTaperCutSvg(output);
  const capstonePlacementMarkup = buildCapstonePlacementSampleSvg(output);
  const foundationAdvisory = buildFoundationAdvisory(input, output);
  const strategySummaryText =
    output.courseStrategy.strategy === 'shim-spacer'
      ? `Shim spacer strategy is active. Purple markers indicate spacer inserts between standard units and the model currently estimates ${output.courseStrategy.shimUnitCount} spacer inserts.`
      : output.courseStrategy.strategy === 'vented-accent'
        ? `Vented accent strategy is active. Accent courses are highlighted in amber-gold at ${output.courseStrategy.accentCourseIndexes.map((index) => `C${index + 1}`).join(', ') || 'the configured cycle slot'}.`
        : 'Uniform running bond strategy is active for all wall courses.';

  const strategySwatches = [
    {
      label: 'Standard course units',
      dotClassName: 'bg-[#7d3512]',
      chipClassName: 'border-amber-900/20 bg-amber-100 text-amber-950',
    },
    {
      label: 'Vent opening marker',
      dotClassName: 'bg-[#c13a1f]',
      chipClassName: 'border-red-900/20 bg-red-100 text-red-950',
    },
  ];

  if (output.courseStrategy.strategy === 'shim-spacer') {
    strategySwatches.splice(1, 0, {
      label: 'Shim spacer course',
      dotClassName: 'bg-[#6f58b5]',
      chipClassName: 'border-indigo-900/20 bg-indigo-100 text-indigo-950',
    });
  }

  if (output.courseStrategy.strategy === 'vented-accent') {
    strategySwatches.splice(1, 0, {
      label: 'Vented accent course',
      dotClassName: 'bg-[#8a5a13]',
      chipClassName: 'border-amber-900/20 bg-amber-200 text-amber-950',
    });
  }

  const downloadPacket = () => {
    const html = buildConstructionPacketHtml(input, output);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'firepit-construction-packet.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className='card-rise min-w-0 w-full rounded-2xl border border-amber-900/20 bg-amber-50/80 p-4 shadow-lg'>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-base font-semibold'>Construction Mode (SVG)</h3>
        <button
          className='rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-amber-50'
          onClick={downloadPacket}
        >
          Download Packet
        </button>
      </div>
      <p className='mb-3 text-sm text-amber-950/80'>
        C1 is the lowest wall course and numbering rises upward. CAP is the
        capstone course. Alternating start offsets implement running bond. Red
        marks planned vent openings and blue marks gas line entry.
      </p>

      <div
        className='mb-3 grid grid-cols-3 gap-2 rounded-xl border border-amber-900/20 bg-white/70 p-1'
        role='tablist'
        aria-label='Build plan sections'
      >
        {[
          { value: 'layout' as const, label: 'Course Layout' },
          { value: 'cuts' as const, label: 'Cuts' },
          { value: 'site' as const, label: 'Site Guidance' },
        ].map((tab) => {
          const selected = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type='button'
              role='tab'
              aria-selected={selected}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                selected
                  ? 'bg-amber-900 text-amber-50'
                  : 'bg-white text-amber-900 hover:bg-amber-100/80'
              }`}
              onClick={() => handleTabChange(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'layout' && (
        <>
          <div className='mb-3 rounded-lg border border-amber-900/20 bg-white/75 px-3 py-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wide text-amber-900/70'>
              Strategy Summary
            </p>
            <p className='mt-1 text-sm text-amber-950/85'>
              {strategySummaryText}
            </p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {strategySwatches.map((swatch) => (
                <span
                  key={swatch.label}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${swatch.chipClassName}`}
                >
                  <span
                    className={`mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle ${swatch.dotClassName}`}
                  />
                  {swatch.label}
                </span>
              ))}
            </div>
          </div>

          <div
            className='overflow-x-auto rounded-lg border border-amber-900/20 bg-white p-2'
            dangerouslySetInnerHTML={{ __html: coursePlanMarkup }}
          />
        </>
      )}

      {activeTab === 'site' && (
        <div className='rounded-lg border border-amber-900/20 bg-white p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h4 className='text-sm font-semibold text-amber-950'>
              Site Guidance
            </h4>
            <FoundationRiskBadge risk={foundationAdvisory.risk}>
              {foundationAdvisory.risk} foundation review
            </FoundationRiskBadge>
          </div>
          <div className='mt-2'>
            <FoundationRiskLegend />
          </div>
          <p className='mt-2 text-sm text-amber-950/85'>
            {foundationAdvisory.heading}. Baseline foundation math remains fixed
            at {output.foundation.stoneDepthIn.toFixed(0)} in compacted angular
            stone with a footprint extension of 6 in per side.
          </p>
          <p className='mt-2 text-sm text-amber-950/80'>
            Site context: {input.soilType ?? 'unknown'} soil,{' '}
            {input.drainageCondition ?? 'unknown'} drainage,{' '}
            {input.frostClimate ? 'freeze-thaw climate' : 'minimal frost risk'}.
          </p>
          <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950/80'>
            {foundationAdvisory.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
          <p className='mt-3 text-sm text-amber-950/80'>
            Liner venting note: in this model, primary airflow is handled by
            wall vent gaps. Keep the cavity and expansion space clear, and
            verify any dedicated vent or drain requirements from the liner,
            ring, or burner manufacturer before installation.
          </p>
        </div>
      )}

      {activeTab === 'cuts' && (
        <div className='space-y-4'>
          <p className='text-sm text-amber-950/80'>
            Review these detail drawings before purchasing units and laying out
            final cuts.
          </p>

          <div className='rounded-lg border border-amber-900/20 bg-white p-3'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <h4 className='text-sm font-semibold text-amber-950'>
                Wall Brick Cut Detail
              </h4>
              {wallBrickCutMarkup && (
                <button
                  type='button'
                  className='rounded-full border border-amber-900/30 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950'
                  onClick={() => setExpandedDetail('wall')}
                >
                  Expand
                </button>
              )}
            </div>
            {wallBrickCutMarkup ? (
              <div
                className='overflow-hidden rounded-lg border border-amber-900/20 bg-white p-2'
                dangerouslySetInnerHTML={{ __html: wallBrickCutMarkup }}
              />
            ) : (
              <p className='text-sm text-amber-950/80'>
                No taper cuts are required for this current geometry.
              </p>
            )}
          </div>

          <div className='rounded-lg border border-amber-900/20 bg-white p-3'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <h4 className='text-sm font-semibold text-amber-950'>
                Capstone Placement Detail
              </h4>
              <button
                type='button'
                className='rounded-full border border-amber-900/30 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950'
                onClick={() => setExpandedDetail('cap')}
              >
                Expand
              </button>
            </div>
            <div
              className='overflow-hidden rounded-lg border border-amber-900/20 bg-white p-2'
              dangerouslySetInnerHTML={{ __html: capstonePlacementMarkup }}
            />
          </div>
        </div>
      )}

      {expandedDetail && (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-5xl rounded-xl border border-amber-900/20 bg-amber-50 p-4 shadow-xl'>
            <div className='mb-3 flex items-center justify-between gap-2'>
              <h4 className='text-base font-semibold text-amber-950'>
                {expandedDetail === 'wall'
                  ? 'Wall Brick Cut Detail'
                  : 'Capstone Placement Detail'}
              </h4>
              <button
                type='button'
                className='rounded-full bg-amber-900 px-3 py-1 text-xs font-semibold text-amber-50'
                onClick={() => setExpandedDetail(null)}
              >
                Close
              </button>
            </div>
            <div
              className='max-h-[75vh] overflow-auto rounded-lg border border-amber-900/20 bg-white p-2'
              dangerouslySetInnerHTML={{
                __html:
                  expandedDetail === 'wall'
                    ? wallBrickCutMarkup
                    : capstonePlacementMarkup,
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
