import { useEffect, useMemo, useState } from 'react';
import type { MasonryInput, MasonryOutput } from '../types';
import { DEFAULT_MASONRY_INPUT } from '../utils/defaultInput';
import { buildCompactShareParams } from '../utils/shareLink';

const FIELD_PLANNER_STORAGE_KEY = 'firepit-parametric-masonry-designer-field-planner';
const MAX_PHOTOS_PER_ITEM = 2;
const MAX_IMAGE_BYTES = 450_000;

type ChecklistItemState = {
  id: string;
  label: string;
  done: boolean;
  notes: string;
  photos: string[];
};

type FieldPlannerState = {
  checklist: ChecklistItemState[];
  measurement: {
    toleranceIn: number;
    toleranceFt: number;
    innerWidthIn: number;
    innerDepthIn: number;
    wallHeightIn: number;
    horizontalClearanceFt: number;
  };
  weather: {
    windMph: number;
    noBurnAdvisory: boolean;
    redFlagWarning: boolean;
    daysSinceMortar: number;
    rainExpected: boolean;
  };
};

const defaultChecklistItems: ChecklistItemState[] = [
  { id: 'layout-staked', label: 'Layout staked and centerpoint verified', done: false, notes: '', photos: [] },
  { id: 'utilities-located', label: 'Utilities located before excavation', done: false, notes: '', photos: [] },
  { id: 'foundation-compacted', label: 'Foundation base compacted and level', done: false, notes: '', photos: [] },
  { id: 'vent-openings-verified', label: 'Vent openings and gas entry verified', done: false, notes: '', photos: [] },
  { id: 'liner-and-cap-checked', label: 'Liner spacing and cap stability checked', done: false, notes: '', photos: [] },
  { id: 'pre-burn-check', label: 'Pre-burn final safety check complete', done: false, notes: '', photos: [] },
];

function createDefaultFieldPlannerState(input: MasonryInput): FieldPlannerState {
  return {
    checklist: defaultChecklistItems,
    measurement: {
      toleranceIn: 0.5,
      toleranceFt: 0.5,
      innerWidthIn:
        input.planShape === 'circular' ? input.innerDiameterIn : input.innerWidthIn,
      innerDepthIn:
        input.planShape === 'rectangular' ? input.innerDepthIn : input.innerWidthIn,
      wallHeightIn: input.wallHeightIn,
      horizontalClearanceFt: input.proximityToStructuresFt,
    },
    weather: {
      windMph: 0,
      noBurnAdvisory: false,
      redFlagWarning: false,
      daysSinceMortar: 0,
      rainExpected: false,
    },
  };
}

function loadFieldPlannerState(input: MasonryInput): FieldPlannerState {
  if (typeof window === 'undefined') {
    return createDefaultFieldPlannerState(input);
  }

  const raw = window.localStorage.getItem(FIELD_PLANNER_STORAGE_KEY);
  if (!raw) {
    return createDefaultFieldPlannerState(input);
  }

  try {
    const parsed = JSON.parse(raw) as FieldPlannerState;
    return {
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : defaultChecklistItems,
      measurement: parsed.measurement,
      weather: parsed.weather,
    };
  } catch {
    return createDefaultFieldPlannerState(input);
  }
}

function withinTolerance(delta: number, tolerance: number): boolean {
  return Math.abs(delta) <= tolerance;
}

interface FieldPlannerPanelProps {
  input: MasonryInput;
  output: MasonryOutput;
  projectName: string;
}

export default function FieldPlannerPanel({
  input,
  output,
  projectName,
}: FieldPlannerPanelProps) {
  const [state, setState] = useState<FieldPlannerState>(() => loadFieldPlannerState(input));
  const [message, setMessage] = useState<string | null>(null);

  const updateMeasurementField = (
    key: keyof FieldPlannerState['measurement'],
    value: number,
  ) => {
    setState((prev) => ({
      ...prev,
      measurement: {
        ...prev.measurement,
        [key]: value,
      },
    }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FIELD_PLANNER_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const planned = useMemo(
    () => ({
      innerWidthIn: output.innerSpanWidthIn,
      innerDepthIn: output.innerSpanDepthIn,
      wallHeightIn: input.wallHeightIn,
      horizontalClearanceFt: input.proximityToStructuresFt,
    }),
    [input.proximityToStructuresFt, input.wallHeightIn, output.innerSpanDepthIn, output.innerSpanWidthIn],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = buildCompactShareParams(
      input,
      projectName,
      DEFAULT_MASONRY_INPUT,
    );
    return `${window.location.origin}${window.location.pathname}?${params.toString()}#designer`;
  }, [input, projectName]);

  const qrImageUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=Q&qzone=3&data=${encodeURIComponent(shareUrl)}`
    : '';

  const measurementChecks = [
    {
      key: 'innerWidth',
      label: 'Inner width / diameter',
      planned: planned.innerWidthIn,
      measured: state.measurement.innerWidthIn,
      tolerance: state.measurement.toleranceIn,
      unit: 'in',
    },
    {
      key: 'innerDepth',
      label: 'Inner depth',
      planned: planned.innerDepthIn,
      measured: state.measurement.innerDepthIn,
      tolerance: state.measurement.toleranceIn,
      unit: 'in',
    },
    {
      key: 'wallHeight',
      label: 'Wall height',
      planned: planned.wallHeightIn,
      measured: state.measurement.wallHeightIn,
      tolerance: state.measurement.toleranceIn,
      unit: 'in',
    },
    {
      key: 'clearance',
      label: 'Horizontal clearance',
      planned: planned.horizontalClearanceFt,
      measured: state.measurement.horizontalClearanceFt,
      tolerance: state.measurement.toleranceFt,
      unit: 'ft',
    },
  ];

  const weatherWarnings: string[] = [];
  if (state.weather.noBurnAdvisory) {
    weatherWarnings.push('No-burn advisory is active. Delay ignition until advisories are lifted.');
  }
  if (state.weather.redFlagWarning) {
    weatherWarnings.push('Red-flag or high fire-weather warning is active. Postpone fire use.');
  }
  if (state.weather.windMph >= 15) {
    weatherWarnings.push('Wind speed is elevated (15+ mph). Expect ember spread risk and unstable flame behavior.');
  }
  if (state.weather.rainExpected) {
    weatherWarnings.push('Rain is expected. Protect fresh mortar and keep joints covered.');
  }
  if (input.mortarJointIn > 0 && state.weather.daysSinceMortar < 28) {
    weatherWarnings.push(`Mortar cure is ${state.weather.daysSinceMortar} day(s). Wait until day 28 before sustained firing.`);
  }

  return (
    <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/75'>
          Field Toolkit
        </p>
        <span className='rounded-full border border-amber-900/20 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950'>
          Offline local storage
        </span>
      </div>

      <details className='mt-3 rounded-xl border border-amber-900/15 bg-white/70 p-3' open>
        <summary className='cursor-pointer font-semibold text-amber-950'>
          1. Field execution checklist
        </summary>
        <div className='mt-2 space-y-2'>
          {state.checklist.map((item) => (
            <div key={item.id} className='rounded-lg border border-amber-900/10 bg-white/80 p-2'>
              <label className='flex items-center gap-2 text-sm font-medium text-amber-950'>
                <input
                  type='checkbox'
                  checked={item.done}
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      checklist: prev.checklist.map((candidate) =>
                        candidate.id === item.id
                          ? { ...candidate, done: event.target.checked }
                          : candidate,
                      ),
                    }))
                  }
                />
                {item.label}
              </label>
              <textarea
                className='mt-2 w-full rounded-md border border-amber-900/20 bg-white px-2 py-1 text-xs'
                placeholder='Field notes...'
                value={item.notes}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    checklist: prev.checklist.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, notes: event.target.value }
                        : candidate,
                    ),
                  }))
                }
              />
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <input
                  type='file'
                  accept='image/*'
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    if (file.size > MAX_IMAGE_BYTES) {
                      setMessage('Photo is too large. Keep each image under ~450 KB.');
                      return;
                    }
                    let dataUrl = '';
                    try {
                      dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                    } catch {
                      setMessage('Could not read image file.');
                      return;
                    }
                    setState((prev) => ({
                      ...prev,
                      checklist: prev.checklist.map((candidate) =>
                        candidate.id === item.id
                          ? {
                              ...candidate,
                              photos: [...candidate.photos, dataUrl].slice(
                                -MAX_PHOTOS_PER_ITEM,
                              ),
                            }
                          : candidate,
                      ),
                    }));
                    setMessage('Photo attached to checklist item.');
                  }}
                  className='text-xs'
                />
                {item.photos.map((photo, photoIndex) => (
                  <div key={`${item.id}-${photoIndex}`} className='relative'>
                    <img src={photo} alt='Field note' className='h-12 w-12 rounded border border-amber-900/20 object-cover' />
                    <button
                      type='button'
                      className='absolute -right-1 -top-1 rounded-full bg-red-700 px-1 text-[10px] text-white'
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          checklist: prev.checklist.map((candidate) =>
                            candidate.id === item.id
                              ? {
                                  ...candidate,
                                  photos: candidate.photos.filter((_, index) => index !== photoIndex),
                                }
                              : candidate,
                          ),
                        }))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className='mt-3 rounded-xl border border-amber-900/15 bg-white/70 p-3' open>
        <summary className='cursor-pointer font-semibold text-amber-950'>
          2. On-site measurement validation
        </summary>
        <div className='mt-2 grid gap-2 sm:grid-cols-2'>
          <label className='flex flex-col gap-1 text-xs'>
            Tolerance (in)
            <input
              type='number'
              className='rounded border border-amber-900/20 px-2 py-1'
              value={state.measurement.toleranceIn}
              min={0.125}
              step={0.125}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  measurement: {
                    ...prev.measurement,
                    toleranceIn: Number(event.target.value),
                  },
                }))
              }
            />
          </label>
          <label className='flex flex-col gap-1 text-xs'>
            Tolerance (ft)
            <input
              type='number'
              className='rounded border border-amber-900/20 px-2 py-1'
              value={state.measurement.toleranceFt}
              min={0.1}
              step={0.1}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  measurement: {
                    ...prev.measurement,
                    toleranceFt: Number(event.target.value),
                  },
                }))
              }
            />
          </label>
        </div>
        <table className='mt-3 w-full border-collapse text-xs'>
          <thead>
            <tr className='border-b border-amber-900/15'>
              <th className='py-1 text-left'>Check</th>
              <th className='py-1 text-left'>Planned</th>
              <th className='py-1 text-left'>Measured</th>
              <th className='py-1 text-left'>Delta</th>
              <th className='py-1 text-left'>Status</th>
            </tr>
          </thead>
          <tbody>
            {measurementChecks.map((check) => {
              const delta = check.measured - check.planned;
              const pass = withinTolerance(delta, check.tolerance);
              return (
                <tr key={check.key} className='border-b border-amber-900/10'>
                  <td className='py-1'>{check.label}</td>
                  <td className='py-1'>{check.planned.toFixed(2)} {check.unit}</td>
                  <td className='py-1'>
                    <input
                      type='number'
                      className='w-24 rounded border border-amber-900/20 px-1 py-0.5'
                      value={check.measured}
                      step={check.unit === 'ft' ? 0.1 : 0.125}
                      onChange={(event) =>
                        updateMeasurementField(
                          check.key === 'innerWidth'
                            ? 'innerWidthIn'
                            : check.key === 'innerDepth'
                              ? 'innerDepthIn'
                              : check.key === 'wallHeight'
                                ? 'wallHeightIn'
                                : 'horizontalClearanceFt',
                          Number(event.target.value),
                        )
                      }
                    />
                  </td>
                  <td className='py-1'>{delta >= 0 ? '+' : ''}{delta.toFixed(2)} {check.unit}</td>
                  <td className='py-1'>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${
                        pass
                          ? 'border-emerald-800/25 bg-emerald-100 text-emerald-900'
                          : 'border-red-800/25 bg-red-100 text-red-900'
                      }`}
                    >
                      {pass ? 'PASS' : 'REVIEW'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>

      <details className='mt-3 rounded-xl border border-amber-900/15 bg-white/70 p-3' open>
        <summary className='cursor-pointer font-semibold text-amber-950'>
          3. Burn-condition and weather check
        </summary>
        <div className='mt-2 grid gap-2 sm:grid-cols-2'>
          <label className='flex flex-col gap-1 text-xs'>
            Wind speed (mph)
            <input
              type='number'
              className='rounded border border-amber-900/20 px-2 py-1'
              value={state.weather.windMph}
              min={0}
              step={1}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  weather: { ...prev.weather, windMph: Number(event.target.value) },
                }))
              }
            />
          </label>
          <label className='flex flex-col gap-1 text-xs'>
            Days since mortar placement
            <input
              type='number'
              className='rounded border border-amber-900/20 px-2 py-1'
              value={state.weather.daysSinceMortar}
              min={0}
              step={1}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  weather: { ...prev.weather, daysSinceMortar: Number(event.target.value) },
                }))
              }
            />
          </label>
          <label className='inline-flex items-center gap-2 text-xs'>
            <input
              type='checkbox'
              checked={state.weather.noBurnAdvisory}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  weather: { ...prev.weather, noBurnAdvisory: event.target.checked },
                }))
              }
            />
            No-burn advisory active
          </label>
          <label className='inline-flex items-center gap-2 text-xs'>
            <input
              type='checkbox'
              checked={state.weather.redFlagWarning}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  weather: { ...prev.weather, redFlagWarning: event.target.checked },
                }))
              }
            />
            Red-flag fire weather warning
          </label>
          <label className='inline-flex items-center gap-2 text-xs sm:col-span-2'>
            <input
              type='checkbox'
              checked={state.weather.rainExpected}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  weather: { ...prev.weather, rainExpected: event.target.checked },
                }))
              }
            />
            Rain expected before cure period ends
          </label>
        </div>
        <ul className='mt-3 list-disc pl-4 text-xs text-amber-950/85'>
          {weatherWarnings.length > 0 ? (
            weatherWarnings.map((warning) => <li key={warning}>{warning}</li>)
          ) : (
            <li>No active weather or burn-condition blockers based on current values.</li>
          )}
        </ul>
      </details>

      <details className='mt-3 rounded-xl border border-amber-900/15 bg-white/70 p-3' open>
        <summary className='cursor-pointer font-semibold text-amber-950'>
          4. Shareable link and QR handoff
        </summary>
        <p className='mt-2 text-xs text-amber-900/80'>
          Share the exact current project state by link. Receivers can open and continue planning without a backend database.
        </p>
        <div className='mt-2 flex flex-wrap items-center gap-2'>
          <button
            type='button'
            className='rounded-full border border-amber-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setMessage('Share link copied.');
              } catch {
                setMessage('Could not copy link on this device/browser.');
              }
            }}
          >
            Copy Share Link
          </button>
          <a
            href={shareUrl}
            className='rounded-full border border-amber-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
            target='_blank'
            rel='noreferrer'
          >
            Open Shared State
          </a>
        </div>
        {qrImageUrl && (
          <img
            src={qrImageUrl}
            alt='QR code for current project share link'
            className='mt-3 h-40 w-40 rounded border border-amber-900/20 bg-white p-2'
          />
        )}
      </details>

      <div className='mt-3 flex items-center justify-between'>
        {message ? <p className='text-xs text-amber-900/80'>{message}</p> : <span />}
        <button
          type='button'
          className='rounded-full border border-red-800/20 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100'
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(FIELD_PLANNER_STORAGE_KEY);
            }
            setState(createDefaultFieldPlannerState(input));
            setMessage('Field toolkit reset.');
          }}
        >
          Reset Field Toolkit
        </button>
      </div>
    </section>
  );
}
