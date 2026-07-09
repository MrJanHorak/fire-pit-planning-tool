import { useState } from 'react';
import type { MasonryOutput } from '../types';
import type { MasonryInput } from '../types';
import {
  buildEngineeringReportHtml,
  buildCapstonePlacementSampleSvg,
  buildCapstoneCutTypeDiagramsSvg,
  buildConstructionPacketHtml,
  buildCoursePlanSvg,
  buildCutScheduleTablesHtml,
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
  const [isPreparingReport, setIsPreparingReport] = useState(false);
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
  const coursePlanMarkup = buildCoursePlanSvg(output, input);
  const wallBrickCutMarkup = buildWallBrickTaperCutSvg(output);
  const capstonePlacementMarkup = buildCapstonePlacementSampleSvg(output);
  const capstoneCutTypesMarkup = buildCapstoneCutTypeDiagramsSvg(output);
  const cutScheduleMarkup = buildCutScheduleTablesHtml(output);
  const wallCutPerSideIn = output.cutPlan.recommendedCutPerSideIn;
  const wallCutAngleDeg = output.cutPlan.recommendedCutAngleDeg;
  const capCount = Math.max(1, output.capstone.capUnitsPerCourseRounded);
  const n = output.planShape === 'hexagonal' ? 6 : output.planShape === 'octagonal' ? 8 : 0;
  const capMiterSideCount =
    n > 0
      ? n
      : output.planShape === 'square' || output.planShape === 'rectangular'
        ? 4
        : 0;
  const isPolygonPlan = n > 0;
  const capInnerRadiusIn = Math.max(
    0.001,
    output.capstone.capInnerDiameterIn / 2,
  );
  const capModuleSpacingIn = isPolygonPlan
    ? (n * output.capstone.capCenterlineDiameterIn * Math.tan(Math.PI / n)) / capCount
    : output.planShape === 'circular'
      ? (Math.PI * output.capstone.capCenterlineDiameterIn) / capCount
      : (2 *
          (output.capstone.capCenterlineWidthIn +
            output.capstone.capCenterlineDepthIn)) /
        capCount;
  const capChordIn =
    capInnerRadiusIn > 0
      ? 2 *
        capInnerRadiusIn *
        Math.sin(capModuleSpacingIn / (2 * capInnerRadiusIn))
      : output.resolvedCapUnit.lengthIn;
  const capChordDeficitIn = Math.max(
    0,
    output.resolvedCapUnit.lengthIn - capChordIn,
  );
  const capTaperPerUnitIn = Math.max(
    0,
    -output.capstone.joint.innerJointIn,
    capChordDeficitIn,
    capMiterSideCount > 0
      ? Math.abs(
          output.capstone.joint.outerJointIn -
            output.capstone.joint.innerJointIn,
        )
      : 0,
  );
  const capCutPerSideIn = capTaperPerUnitIn / 2;
  const capCutAngleDeg =
    capMiterSideCount > 0
      ? 180 / capMiterSideCount
      : (Math.atan(
          capCutPerSideIn / Math.max(0.001, output.capstone.capCourseWidthIn),
        ) *
          180) /
        Math.PI;
  const capRequiresCutting =
    output.planShape === 'circular'
      ? output.capstone.requiresTaperCutting
      : capMiterSideCount > 0;
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
    {
      label: 'Corner/cut unit marker',
      dotClassName: 'bg-[#6e4728]',
      chipClassName: 'border-stone-900/20 bg-stone-100 text-stone-950',
    },
    {
      label: 'Cap taper-cut marker',
      dotClassName: 'bg-[#e2cfa6]',
      chipClassName: 'border-amber-900/20 bg-amber-100 text-amber-950',
    },
    {
      label: 'Cap miter+taper marker',
      dotClassName: 'bg-[#9f8050]',
      chipClassName: 'border-yellow-900/20 bg-yellow-100 text-yellow-950',
    },
    {
      label: 'Gas line entry marker',
      dotClassName: 'bg-[#2b6f9b]',
      chipClassName: 'border-sky-900/20 bg-sky-100 text-sky-950',
    },
  ];

  if (input.ashCleanoutType && input.ashCleanoutType !== 'none') {
    strategySwatches.push({
      label: 'Ash cleanout marker',
      dotClassName: 'bg-[#2f2f2f]',
      chipClassName: 'border-neutral-900/20 bg-neutral-100 text-neutral-950',
    });
  }

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

  const printEngineeringReportPdf = () => {
    setIsPreparingReport(true);
    const html = buildEngineeringReportHtml(input, output);
    const win = window.open('', '_blank', 'width=980,height=760');
    if (!win) {
      setIsPreparingReport(false);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setIsPreparingReport(false);
    }, 250);
  };

  return (
    <section className='card-rise min-w-0 w-full rounded-2xl border border-amber-900/20 bg-amber-50/80 p-4 shadow-lg'>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-base font-semibold'>Construction Mode (SVG)</h3>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            className='rounded-full border border-amber-900/25 bg-white px-4 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-50'
            onClick={printEngineeringReportPdf}
            disabled={isPreparingReport}
          >
            {isPreparingReport ? 'Preparing PDF…' : 'Engineering Report PDF'}
          </button>
          <button
            className='rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-amber-50'
            onClick={downloadPacket}
          >
            Download Packet
          </button>
        </div>
      </div>
      <p className='mb-3 text-sm text-amber-950/80'>
        C1 is the lowest wall course and numbering rises upward. CAP is the
        capstone course. Alternating start offsets implement running bond.
        Double-wall plans show inner-wall, outer-wall, and cap-bridge rows
        separately. Red marks planned vent openings, blue marks gas line entry,
        dark marks ash cleanout, and C marks corner/cut units.
      </p>
      <p className='mb-3 text-xs text-amber-900/70'>
        Engineering report PDF includes assumptions/limitations and a sign-off
        section for reviewer handoff.
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
          if (selected) {
            return (
              <button
                key={tab.value}
                type='button'
                role='tab'
                aria-selected='true'
                className='rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-amber-50 transition-colors'
                onClick={() => handleTabChange(tab.value)}
              >
                {tab.label}
              </button>
            );
          }

          return (
            <button
              key={tab.value}
              type='button'
              role='tab'
              aria-selected='false'
              className='rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100/80'
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
            <h4 className='text-sm font-semibold text-amber-950'>
              Cut Marking And Saw Setup
            </h4>
            {capMiterSideCount > 0 ? (
              <>
                <p className='mt-2 text-sm text-amber-950/85'>
                  <strong>
                    {isPolygonPlan
                      ? `${n}-sided polygon plan`
                      : 'Rectangular/square plan'}{' '}
                    — clipped cap and wall pieces:
                  </strong>
                </p>
                <ul className='mt-1 list-disc space-y-1 pl-5 text-sm text-amber-950/80'>
                  <li>
                    <strong>Face pieces:</strong>{' '}
                    {(output.capstone.cutStrategy ?? 'full-fit') ===
                    'corner-only'
                      ? 'Leave cap face units rectangular/full-length where practical; use dry-fit spacing to absorb the visual compromise.'
                      : 'Cut to the listed face module length; side edges are trimmed so the inner and outer cap edges follow the finished ring.'}
                  </li>
                  <li>
                    <strong>Corner pieces:</strong>{' '}
                    Set miter saw to{' '}
                    <strong>{capCutAngleDeg.toFixed(1)}°</strong> off square to
                    close the vertex with the adjacent face.
                  </li>
                  <li>
                    {(output.capstone.cutStrategy ?? 'full-fit') ===
                    'corner-only' ? (
                      <>
                        DIY tradeoff: fewer cuts, but less perfect cap coverage
                        and larger or less-uniform joints.
                      </>
                    ) : (
                      <>
                        Cap taper reference: about{' '}
                        <strong>{capCutPerSideIn.toFixed(3)} in per side</strong>{' '}
                        between inner and outer edges.
                      </>
                    )}
                  </li>
                  <li>
                    Wall pieces on hex/oct plans use the same clipped-face
                    logic so bricks do not project through the corner angles.
                  </li>
                </ul>
              </>
            ) : (
              <>
                <p className='mt-2 text-sm text-amber-950/85'>
                  Wall cuts:{' '}
                  {output.cutPlan.requiresCutting
                    ? `${wallCutPerSideIn.toFixed(3)} in per side at ${wallCutAngleDeg.toFixed(2)} deg off square.`
                    : `No taper cuts required; saw angle reference remains ${wallCutAngleDeg.toFixed(2)} deg.`}
                </p>
                <p className='mt-1 text-sm text-amber-950/85'>
                  Cap cuts:{' '}
                  {capRequiresCutting
                    ? `${capCutPerSideIn.toFixed(3)} in per side at ${capCutAngleDeg.toFixed(2)} deg off square.`
                    : `No taper cuts required; cap angle reference is ${capCutAngleDeg.toFixed(2)} deg.`}
                </p>
                <ul className='mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950/80'>
                  <li>
                    Manual marking: mark centerline first, then measure equal side
                    offsets from the inner edge using the per-side taper values.
                  </li>
                  <li>
                    Saw setup: set fence/miter to the listed angle off square, cut
                    one side, flip, and repeat on the opposite side.
                  </li>
                  <li>
                    Verify fit with 3 to 5 dry-fit units before batch cutting.
                  </li>
                </ul>
              </>
            )}
          </div>

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

          <div className='rounded-lg border border-amber-900/20 bg-white p-3'>
            <h4 className='text-sm font-semibold text-amber-950'>
              Capstone Cut Type Diagrams
            </h4>
            <div
              className='mt-2 overflow-hidden rounded-lg border border-amber-900/20 bg-white p-2'
              dangerouslySetInnerHTML={{ __html: capstoneCutTypesMarkup }}
            />
          </div>

          <div className='rounded-lg border border-amber-900/20 bg-white p-3'>
            <h4 className='text-sm font-semibold text-amber-950'>
              Wall And Capstone Cut Schedule
            </h4>
            <div
              className='mt-2 overflow-x-auto text-sm'
              dangerouslySetInnerHTML={{ __html: cutScheduleMarkup }}
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
