import { useState, type Dispatch, type SetStateAction } from 'react';
import HelpTip from './HelpTip';
import { BRICK_PRESETS, CAPSTONE_PRESETS } from '../engine/MasonryEngine';
import type { MasonryInput, MasonryUnit, AshCleanoutType } from '../types';
import {
  clampSeatingFurnitureCount,
  getMaxCircularSeatingCount,
} from '../utils/seatingLayout';

interface ControlPanelProps {
  input: MasonryInput;
  setInput: Dispatch<SetStateAction<MasonryInput>>;
  noCutGuidance?: {
    wall: {
      requiresCutting: boolean;
      minimumNoCutDiameterIn: number;
    };
    cap: {
      requiresCutting: boolean;
      minimumNoCutDiameterIn: number;
    };
    bothMinimumNoCutDiameterIn: number;
  };
}

function FieldLabel({ label, tip }: { label: string; tip?: string }) {
  return (
    <span className='inline-flex items-start gap-2 text-sm font-medium leading-5 text-amber-950 sm:min-h-10'>
      {label}
      {tip && <HelpTip label={`About ${label}`}>{tip}</HelpTip>}
    </span>
  );
}

function SectionHeading({
  title,
  description,
  showDivider = true,
  collapsible = false,
  isOpen = true,
  onToggle,
}: {
  title: string;
  description: string;
  showDivider?: boolean;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  if (collapsible) {
    return (
      <div
        className={`sm:col-span-2 ${showDivider ? 'mt-1 border-t border-amber-900/15 pt-3' : ''}`}
      >
        <button
          type='button'
          className='flex w-full items-center justify-between gap-2 text-left'
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <div>
            <h3 className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
              {title}
            </h3>
            {isOpen && (
              <p className='mt-1 text-xs leading-5 text-amber-900/70'>
                {description}
              </p>
            )}
          </div>
          <svg
            aria-hidden='true'
            viewBox='0 0 10 6'
            className={`h-3 w-3 flex-shrink-0 transition-transform text-amber-900/60 ${isOpen ? 'rotate-180' : ''}`}
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M1 1l4 4 4-4' />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`sm:col-span-2 ${
        showDivider ? 'mt-1 border-t border-amber-900/15 pt-3' : ''
      }`}
    >
      <h3 className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
        {title}
      </h3>
      <p className='mt-1 text-xs leading-5 text-amber-900/70'>{description}</p>
    </div>
  );
}

function sanitizeDimension(
  value: number | undefined,
  fallback: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0.5, value)
    : fallback;
}

function orientUnit(
  unit: MasonryUnit,
  orientation: MasonryInput['orientation'],
): MasonryUnit {
  if (orientation === 'header') {
    return {
      ...unit,
      widthIn: unit.lengthIn,
      lengthIn: unit.widthIn,
    };
  }

  return unit;
}

export default function ControlPanel({
  input,
  setInput,
  noCutGuidance,
}: ControlPanelProps) {
  const [showNoCutDetails, setShowNoCutDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showFuelSafety, setShowFuelSafety] = useState(false);
  const [showSeating, setShowSeating] = useState(false);
  const usingCustomBrick =
    input.brickPresetKey === 'custom' ||
    input.brickPresetKey === 'custom-radial';
  const usingRockPreset = (input.brickPresetKey ?? '').startsWith('rock');
  const unsafeStoneTypeSelected =
    input.naturalStoneType === 'river-rock' ||
    input.naturalStoneType === 'sandstone' ||
    input.naturalStoneType === 'limestone' ||
    input.naturalStoneType === 'shale';
  const usingCustomBrickRadial = input.brickPresetKey === 'custom-radial';
  const usingCustomCap =
    input.capstonePresetKey === 'custom' ||
    input.capstonePresetKey === 'custom-radial';
  const usingCustomCapRadial = input.capstonePresetKey === 'custom-radial';
  const courseStrategy = input.wallCourseStrategy ?? 'uniform';
  const seatingFurnitureStyle = input.seatingFurnitureStyle ?? 'adirondack';
  const seatingDensity = input.seatingDensity ?? 'standard';
  const seatingAreaRadiusFt = input.seatingAreaRadiusFt ?? 10;
  const maxSeatingFurnitureCount = getMaxCircularSeatingCount(
    seatingAreaRadiusFt,
    seatingFurnitureStyle,
    seatingDensity,
  );
  const resolvedSeatingFurnitureCount = clampSeatingFurnitureCount(
    input.seatingFurnitureCount,
    maxSeatingFurnitureCount,
  );
  const selectedWallPresetKey = input.brickPresetKey ?? 'modular';
  const selectedWallPreset =
    selectedWallPresetKey in BRICK_PRESETS
      ? BRICK_PRESETS[selectedWallPresetKey as keyof typeof BRICK_PRESETS]
      : null;
  const selectedCapPresetKey = input.capstonePresetKey ?? 'matching';
  const selectedCapPreset =
    selectedCapPresetKey in CAPSTONE_PRESETS
      ? CAPSTONE_PRESETS[selectedCapPresetKey as keyof typeof CAPSTONE_PRESETS]
      : null;
  const resolvedWallBaseUnit: MasonryUnit =
    selectedWallPreset ??
    (usingCustomBrick
      ? {
          name: usingCustomBrickRadial
            ? 'Custom Radial Brick (Avg)'
            : 'Custom Brick',
          lengthIn: usingCustomBrickRadial
            ? (sanitizeDimension(input.customBrickInnerLengthIn, 7.25) +
                sanitizeDimension(input.customBrickOuterLengthIn, 8)) /
              2
            : sanitizeDimension(input.customBrickLengthIn, 7.625),
          widthIn: sanitizeDimension(input.customBrickWidthIn, 3.625),
          heightIn: sanitizeDimension(input.customBrickHeightIn, 2.25),
        }
      : BRICK_PRESETS.modular);
  const resolvedWallUnit = orientUnit(resolvedWallBaseUnit, input.orientation);
  const resolvedCapBaseUnit: MasonryUnit =
    !input.capstonePresetKey || input.capstonePresetKey === 'matching'
      ? {
          name: 'Matching Brick',
          lengthIn: resolvedWallUnit.lengthIn,
          widthIn: resolvedWallUnit.widthIn,
          heightIn: resolvedWallUnit.heightIn,
        }
      : input.capstonePresetKey === 'custom'
        ? {
            name: 'Custom Cap Unit',
            lengthIn: sanitizeDimension(input.customCapLengthIn, 14),
            widthIn: sanitizeDimension(input.customCapWidthIn, 10),
            heightIn: sanitizeDimension(input.customCapHeightIn, 2),
          }
        : input.capstonePresetKey === 'custom-radial'
          ? {
              name: 'Custom Radial Cap (Avg)',
              lengthIn:
                (sanitizeDimension(input.customCapInnerLengthIn, 13.5) +
                  sanitizeDimension(input.customCapOuterLengthIn, 14.5)) /
                2,
              widthIn: sanitizeDimension(input.customCapWidthIn, 10),
              heightIn: sanitizeDimension(input.customCapHeightIn, 2),
            }
          : (CAPSTONE_PRESETS[input.capstonePresetKey]?.unit ??
            CAPSTONE_PRESETS.matching.unit);
  const resolvedCapOrientation: MasonryInput['orientation'] =
    (input.capOrientation ?? 'match-wall') === 'match-wall'
      ? input.orientation
      : (input.capOrientation as MasonryInput['orientation']);
  const resolvedCapUnit = orientUnit(
    resolvedCapBaseUnit,
    resolvedCapOrientation,
  );
  const thermalAssemblyMode = input.thermalAssemblyMode ?? 'single-wall';
  const cavityWidthIn = sanitizeDimension(input.thermalCavityWidthIn, 1.5);
  const linerThicknessIn =
    input.linerType === 'fire-brick'
      ? 2.5
      : input.linerType === 'steel-ring'
        ? 0.25
        : 0;
  const shellThicknessIn = Math.max(
    resolvedWallUnit.widthIn,
    linerThicknessIn > 0 ? linerThicknessIn : resolvedWallUnit.widthIn,
  );
  const totalWallDepthIn =
    thermalAssemblyMode === 'double-wall'
      ? shellThicknessIn * 2 + cavityWidthIn
      : shellThicknessIn;
  const capBridgeRequiredWidthIn =
    thermalAssemblyMode === 'double-wall'
      ? totalWallDepthIn + input.capstoneOverhangIn
      : resolvedCapUnit.widthIn;
  const capBridgeRowsEstimate =
    thermalAssemblyMode === 'double-wall'
      ? Math.max(
          1,
          Math.ceil(
            capBridgeRequiredWidthIn / Math.max(0.001, resolvedCapUnit.widthIn),
          ),
        )
      : 1;
  const singleRowBridgeCapCandidates = Object.entries(CAPSTONE_PRESETS)
    .filter(([key]) => key !== 'matching')
    .map(([key, preset]) => {
      const orientedUnit = orientUnit(preset.unit, resolvedCapOrientation);
      return { key, preset, orientedUnit };
    })
    .filter(
      ({ orientedUnit }) => orientedUnit.widthIn >= capBridgeRequiredWidthIn,
    );
  const primaryDimensionValue =
    input.planShape === 'circular' ||
    input.planShape === 'hexagonal' ||
    input.planShape === 'octagonal'
      ? input.innerDiameterIn
      : input.innerWidthIn;
  const primaryDimensionMin = 18;
  const primaryDimensionMax = Math.max(180, Math.ceil(primaryDimensionValue));
  const innerDepthMin = 18;
  const innerDepthMax = Math.max(180, Math.ceil(input.innerDepthIn));
  const wallHeightMin = 8;
  const wallHeightMax = Math.max(48, Math.ceil(input.wallHeightIn));
  const proximityMin = 1;
  const proximityMax = Math.max(60, Math.ceil(input.proximityToStructuresFt));

  const updatePrimaryDimension = (value: number) => {
    setInput((prev) => {
      if (
        prev.planShape === 'circular' ||
        prev.planShape === 'hexagonal' ||
        prev.planShape === 'octagonal'
      ) {
        return {
          ...prev,
          innerDiameterIn: value,
        };
      }

      return {
        ...prev,
        innerWidthIn: value,
        innerDepthIn:
          prev.planShape === 'rectangular' ? prev.innerDepthIn : value,
      };
    });
  };

  const updatePlanShape = (planShape: MasonryInput['planShape']) => {
    setInput((prev) => ({
      ...prev,
      planShape,
      innerDepthIn:
        planShape === 'rectangular' ? prev.innerDepthIn : prev.innerWidthIn,
    }));
  };

  return (
    <section className='control-panel card-rise relative z-30 rounded-2xl border border-amber-900/20 bg-amber-50/70 p-5 shadow-lg backdrop-blur'>
      <div className='mb-4 flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-lg font-semibold tracking-tight'>
            Design Inputs
          </h2>
          <p className='mt-1 text-sm text-amber-900/75'>
            Work from layout to materials, then finish with fuel and safety.
          </p>
        </div>
      </div>

      <div className='control-panel-grid grid gap-3 sm:grid-cols-2'>
        <SectionHeading
          title='1 Layout'
          description='Set the shape, opening size, and overall wall mass.'
          showDivider={false}
        />

        <label className='flex flex-col gap-1 sm:col-span-2'>
          <FieldLabel
            label='Plan Shape'
            tip='Circular layouts are common for masonry fire pits and keep coursing, vent spacing, and cap layout easy to read at a glance.'
          />
          <div
            className='grid grid-cols-5 gap-1 rounded-lg border border-amber-700/25 bg-white p-1'
            role='group'
            aria-label='Plan Shape'
          >
            {[
              {
                value: 'circular' as const,
                label: 'Circle',
                icon: (
                  <span className='inline-block h-3.5 w-3.5 rounded-full border-2 border-current' />
                ),
              },
              {
                value: 'square' as const,
                label: 'Square',
                icon: (
                  <span className='inline-block h-3.5 w-3.5 rounded-[2px] border-2 border-current' />
                ),
              },
              {
                value: 'rectangular' as const,
                label: 'Rect',
                icon: (
                  <span className='inline-block h-2.5 w-4.5 rounded-[2px] border-2 border-current' />
                ),
              },
              {
                value: 'hexagonal' as const,
                label: 'Hex',
                icon: (
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 20 20'
                    aria-hidden='true'
                  >
                    <polygon
                      points='10,2.5 16.5,6.25 16.5,13.75 10,17.5 3.5,13.75 3.5,6.25'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.4'
                      strokeLinejoin='round'
                    />
                  </svg>
                ),
              },
              {
                value: 'octagonal' as const,
                label: 'Oct',
                icon: (
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 20 20'
                    aria-hidden='true'
                  >
                    <polygon
                      points='7,2.5 13,2.5 17.5,7 17.5,13 13,17.5 7,17.5 2.5,13 2.5,7'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.4'
                      strokeLinejoin='round'
                    />
                  </svg>
                ),
              },
            ].map((option) => {
              const selected = input.planShape === option.value;

              return (
                <button
                  key={option.value}
                  type='button'
                  className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-md px-1.5 py-2 text-center transition-colors ${
                    selected
                      ? 'bg-amber-900 text-amber-50 shadow-sm'
                      : 'bg-white text-amber-900 hover:bg-amber-100/80'
                  }`}
                  onClick={() => updatePlanShape(option.value)}
                  aria-pressed={selected}
                >
                  <span className='flex h-6 items-center justify-center'>
                    {option.icon}
                  </span>
                  <span
                    className={`block text-xs font-medium leading-tight ${
                      selected ? 'text-amber-100/90' : 'text-amber-700/80'
                    }`}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </label>

        <SectionHeading
          title='2 Materials'
          description='Select wall and cap units, then tune orientation details.'
          collapsible
          isOpen={showMaterials}
          onToggle={() => setShowMaterials((v) => !v)}
        />

        {showMaterials && (
          <div className='contents'>
            <label className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Wall Unit Type'
                tip='Use actual unit dimensions, not nominal sizes. Natural stone presets are average dimensions for planning only and should be paired with liner and geology checks.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                value={input.brickPresetKey ?? 'modular'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    brickPresetKey: event.target.value,
                  }))
                }
              >
                <optgroup label='Masonry Units'>
                  {Object.entries(BRICK_PRESETS)
                    .filter(([key]) => !key.startsWith('rock'))
                    .map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label='Natural Stone (Planning Averages)'>
                  {Object.entries(BRICK_PRESETS)
                    .filter(([key]) => key.startsWith('rock'))
                    .map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.name}
                      </option>
                    ))}
                </optgroup>
                <option value='custom'>Custom Brick (Rectangular)</option>
                <option value='custom-radial'>Custom Brick (Radial)</option>
              </select>
              {selectedWallPreset && (
                <span className='text-xs text-amber-800/75'>
                  {selectedWallPreset.lengthIn}&Prime; L &times;{' '}
                  {selectedWallPreset.widthIn}&Prime; W &times;{' '}
                  {selectedWallPreset.heightIn}&Prime; H (actual dimensions)
                </span>
              )}
              {!selectedWallPreset && usingCustomBrick && (
                <span className='text-xs text-amber-800/75'>
                  Custom unit dimensions are set in the fields below.
                </span>
              )}
              {usingCustomBrick && (
                <div className='mt-2 grid gap-2 rounded-md border border-amber-700/20 bg-white/60 p-3 sm:grid-cols-3'>
                  {usingCustomBrickRadial ? (
                    <>
                      <label className='flex flex-col gap-1'>
                        <span className='text-xs font-medium text-amber-900'>
                          Insert Flange OD (in)
                        </span>
                        <input
                          type='number'
                          min={6}
                          step={0.25}
                          className={`rounded-md border bg-white px-2 py-1.5 text-sm ${
                            (input.smokelessInsertFlangeOD ?? 21.0) <=
                            (input.smokelessInsertBaseOD ?? 19.0)
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-amber-700/30'
                          }`}
                          value={input.smokelessInsertFlangeOD ?? 21.0}
                          onChange={(e) =>
                            setInput((prev) => ({
                              ...prev,
                              smokelessInsertFlangeOD: Number(e.target.value),
                            }))
                          }
                        />
                        {(input.smokelessInsertFlangeOD ?? 21.0) <=
                          (input.smokelessInsertBaseOD ?? 19.0) && (
                          <span className='text-xs text-red-700'>
                            Flange OD must be larger than Base OD - the flange
                            rests on top of the masonry and can't be narrower
                            than the insert body.
                          </span>
                        )}
                      </label>
                      <label className='flex flex-col gap-1'>
                        <span className='text-xs font-medium text-amber-900'>
                          Outer Length (in)
                        </span>
                        <input
                          className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                          type='number'
                          min={1}
                          step={0.125}
                          value={input.customBrickOuterLengthIn ?? 8}
                          onChange={(event) =>
                            setInput((prev) => ({
                              ...prev,
                              customBrickOuterLengthIn: Number(
                                event.target.value,
                              ),
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <label className='flex flex-col gap-1'>
                      <span className='text-xs font-medium text-amber-900'>
                        Length (in)
                      </span>
                      <input
                        className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                        type='number'
                        min={1}
                        step={0.125}
                        value={input.customBrickLengthIn ?? 7.625}
                        onChange={(event) =>
                          setInput((prev) => ({
                            ...prev,
                            customBrickLengthIn: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  )}
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Width (in)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={1}
                      step={0.125}
                      value={input.customBrickWidthIn ?? 3.625}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          customBrickWidthIn: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Height (in)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={1}
                      step={0.125}
                      value={input.customBrickHeightIn ?? 2.25}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          customBrickHeightIn: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
              )}

              {usingRockPreset && (
                <div className='mt-2 grid gap-2 rounded-md border border-amber-700/20 bg-white/70 p-3 sm:grid-cols-2'>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Stone Type
                    </span>
                    <select
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      aria-label='Natural stone type'
                      title='Natural stone type'
                      value={input.naturalStoneType ?? 'unspecified'}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          naturalStoneType: event.target
                            .value as MasonryInput['naturalStoneType'],
                        }))
                      }
                    >
                      <option value='unspecified'>Unspecified</option>
                      <option value='granite'>Granite</option>
                      <option value='basalt'>Basalt</option>
                      <option value='marble'>Marble</option>
                      <option value='river-rock'>River Rock</option>
                      <option value='sandstone'>Sandstone</option>
                      <option value='limestone'>Limestone</option>
                      <option value='shale'>Shale</option>
                    </select>
                  </label>

                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Build Method
                    </span>
                    <select
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      aria-label='Natural stone build method'
                      title='Natural stone build method'
                      value={input.stoneBuildMethod ?? 'dry-stack'}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          stoneBuildMethod: event.target
                            .value as MasonryInput['stoneBuildMethod'],
                        }))
                      }
                    >
                      <option value='dry-stack'>Dry Stack</option>
                      <option value='mortared'>Mortared</option>
                    </select>
                  </label>

                  {unsafeStoneTypeSelected && (
                    <p className='sm:col-span-2 rounded-md border border-red-700/30 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-900'>
                      Selected stone type is unsafe for direct-heat fire-facing
                      zones. Prefer granite, basalt, or marble and keep a
                      dedicated heat shield.
                    </p>
                  )}
                </div>
              )}
            </label>

            <label className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Thermal Assembly'
                tip='Choose this early. Double-wall changes wall depth, cap-bridge requirements, and overall material planning.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Thermal Assembly'
                title='Thermal Assembly'
                value={input.thermalAssemblyMode ?? 'single-wall'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    thermalAssemblyMode: event.target
                      .value as MasonryInput['thermalAssemblyMode'],
                  }))
                }
              >
                <option value='single-wall'>Single Wall</option>
                <option value='double-wall'>Double Wall Cavity</option>
              </select>
              {input.thermalAssemblyMode === 'double-wall' && (
                <p className='text-xs text-amber-800/80'>
                  Estimated wall depth:{' '}
                  <strong>{totalWallDepthIn.toFixed(2)} in</strong>. Target
                  cap-bridge coverage:{' '}
                  <strong>{capBridgeRequiredWidthIn.toFixed(2)} in</strong>.
                </p>
              )}
            </label>

            {input.thermalAssemblyMode === 'double-wall' && (
              <div className='grid gap-2 rounded-md border border-amber-700/20 bg-white/60 p-3 sm:col-span-2 sm:grid-cols-2'>
                <label className='flex flex-col gap-1 sm:col-span-2'>
                  <span className='text-xs font-semibold text-amber-900'>
                    Inner Wall Material{' '}
                    <span className='font-normal text-amber-700/70'>
                      (firebox — heat-rated)
                    </span>
                  </span>
                  <p className='text-xs text-amber-800/70'>
                    Uses the primary Wall Material selection above. For wood
                    fires, choose firebrick or radial firebrick (rated ≥
                    1,400°F).
                  </p>
                  <span className='text-xs text-amber-900/60 italic'>
                    Currently:{' '}
                    <strong>
                      {BRICK_PRESETS[input.brickPresetKey ?? 'modular']?.name ??
                        'Custom'}
                    </strong>
                    {' — change via "Wall Material" above.'}
                  </span>
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Inner Wall Mortar
                  </span>
                  <select
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    aria-label='Inner Wall Mortar Type'
                    title='Inner Wall Mortar Type'
                    value={input.innerWallMortarType ?? 'refractory'}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        innerWallMortarType: event.target
                          .value as MasonryInput['innerWallMortarType'],
                      }))
                    }
                  >
                    <option value='refractory'>
                      Refractory (fireclay) — required for firebox
                    </option>
                    <option value='type-n'>Type N masonry mortar</option>
                    <option value='type-s'>Type S masonry mortar</option>
                    <option value='construction-adhesive'>
                      Construction adhesive (heat-rated)
                    </option>
                  </select>
                </label>

                <label className='flex flex-col gap-1 sm:col-span-2'>
                  <span className='text-xs font-semibold text-amber-900'>
                    Outer Wall Material{' '}
                    <span className='font-normal text-amber-700/70'>
                      (decorative shell)
                    </span>
                  </span>
                  <select
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    aria-label='Outer Wall Material'
                    title='Outer Wall Material'
                    value={
                      input.outerWallBrickPresetKey ??
                      input.brickPresetKey ??
                      'modular'
                    }
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        outerWallBrickPresetKey: event.target.value,
                      }))
                    }
                  >
                    <optgroup label='Standard Brick (Outer Shell)'>
                      <option value='modular'>Modular Brick</option>
                      <option value='standard'>Standard Brick</option>
                      <option value='queen'>Queen Brick</option>
                      <option value='king'>King Brick</option>
                      <option value='norman'>Norman Brick</option>
                      <option value='jumboModular'>Jumbo Modular Brick</option>
                      <option value='closure'>Closure Brick</option>
                      <option value='utility'>Utility Brick</option>
                      <option value='paver'>Clay Paver</option>
                      <option value='bullnose'>Bullnose Face Brick</option>
                      <option value='radialFace'>Radial Face Brick</option>
                    </optgroup>
                    <optgroup label='Natural Stone (Outer Shell)'>
                      <option value='rockLedgestone'>
                        Natural Stone — Ledgestone
                      </option>
                      <option value='rockFieldstone'>
                        Natural Stone — Fieldstone
                      </option>
                      <option value='rockMosaic'>Natural Stone — Mosaic</option>
                    </optgroup>
                    <optgroup label='Heat-Rated Inner Materials (caution on outer)'>
                      <option value='fireBrickSplits'>
                        Fire Brick Split (inner-rated)
                      </option>
                      <option value='fireBrickFull'>
                        Fire Brick Full (inner-rated)
                      </option>
                      <option value='radialFireBrick'>
                        Radial Fire Brick (inner-rated)
                      </option>
                    </optgroup>
                  </select>
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Outer Wall Mortar
                  </span>
                  <select
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    aria-label='Outer Wall Mortar Type'
                    title='Outer Wall Mortar Type'
                    value={input.outerWallMortarType ?? 'type-n'}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        outerWallMortarType: event.target
                          .value as MasonryInput['outerWallMortarType'],
                      }))
                    }
                  >
                    <option value='type-n'>
                      Type N masonry mortar (outdoor, decorative)
                    </option>
                    <option value='type-s'>
                      Type S masonry mortar (below-grade, structural)
                    </option>
                    <option value='refractory'>
                      Refractory mortar (if outer shell also heat-exposed)
                    </option>
                    <option value='construction-adhesive'>
                      Construction adhesive (dry-stack / no-mortar)
                    </option>
                  </select>
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Cavity Fill
                  </span>
                  <select
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    aria-label='Thermal Cavity Fill'
                    title='Thermal Cavity Fill'
                    value={input.thermalCavityFill ?? 'air-gap'}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        thermalCavityFill: event.target
                          .value as MasonryInput['thermalCavityFill'],
                      }))
                    }
                  >
                    <option value='air-gap'>Vented air gap</option>
                    <option value='sand-fill'>Sand fill</option>
                    <option value='insulation-board'>Insulation board</option>
                  </select>
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Cavity Vent Mode
                  </span>
                  <select
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    aria-label='Thermal Cavity Vent Mode'
                    title='Thermal Cavity Vent Mode'
                    value={input.thermalCavityVentMode ?? 'vented'}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        thermalCavityVentMode: event.target
                          .value as MasonryInput['thermalCavityVentMode'],
                      }))
                    }
                  >
                    <option value='vented'>Vented</option>
                    <option value='sealed'>Sealed</option>
                  </select>
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Cavity Width (in)
                  </span>
                  <input
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    type='number'
                    min={0.75}
                    step={0.25}
                    value={input.thermalCavityWidthIn ?? 1.5}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        thermalCavityWidthIn: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Tie Spacing (in)
                  </span>
                  <input
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    type='number'
                    min={8}
                    step={1}
                    value={input.thermalTieSpacingIn ?? 16}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        thermalTieSpacingIn: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
            )}

            <label className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Ash Cleanout'
                tip='Choose how ash will be removed from the firebox. A cleanout door or pan simplifies maintenance for wood-burning pits.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                value={input.ashCleanoutType ?? 'none'}
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    ashCleanoutType: e.target.value as AshCleanoutType,
                  }))
                }
              >
                <option value='none'>None</option>
                <option value='hinged-door'>Hinged cleanout door</option>
                <option value='removable-pan'>Removable ash pan</option>
                <option value='drain-holes'>Drainage holes (outdoor)</option>
              </select>
            </label>

            {/* ── Smokeless Secondary-Combustion Mode ── */}
            {input.fuelType === 'wood' && (
              <label className='flex flex-col gap-1 sm:col-span-2'>
                <FieldLabel
                  label='Smokeless Mode'
                  tip='Enables secondary-combustion engineering. Cool air enters base intake holes, heats in the annular cavity between walls (or between liner and wall), then jets through top rim holes to re-ignite unburned gases — eliminating most visible smoke.'
                />
                <div className='flex items-center gap-3'>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={input.smokelessMode ?? false}
                    onClick={() =>
                      setInput((prev) => ({
                        ...prev,
                        smokelessMode: !(prev.smokelessMode ?? false),
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-1 ${(input.smokelessMode ?? false) ? 'bg-amber-600' : 'bg-amber-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${(input.smokelessMode ?? false) ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                  <span className='text-sm text-amber-900'>
                    {(input.smokelessMode ?? false)
                      ? 'Enabled — secondary combustion mode'
                      : 'Disabled'}
                  </span>
                </div>
              </label>
            )}

            {input.fuelType === 'wood' && (input.smokelessMode ?? false) && (
              <div className='grid gap-3 rounded-md border border-amber-600/30 bg-amber-50/60 p-3 sm:col-span-2 sm:grid-cols-2'>
                <div className='sm:col-span-2'>
                  <p className='text-xs font-semibold text-amber-900'>
                    Smokeless Insert / Liner Profile
                  </p>
                  <p className='mt-0.5 text-xs text-amber-800/70'>
                    Select a commercial insert to auto-fill dimensions, or use
                    Custom to enter your own steel liner specs.
                  </p>
                </div>

                <label className='flex flex-col gap-1 sm:col-span-2'>
                  <span className='text-xs font-medium text-amber-900'>
                    Insert Preset
                  </span>
                  <select
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    aria-label='Smokeless Insert Preset'
                    value={input.smokelessInsertPreset ?? 'custom-diy'}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        smokelessInsertPreset: event.target
                          .value as MasonryInput['smokelessInsertPreset'],
                      }))
                    }
                  >
                    <option value='solo-stove-bonfire-2'>
                      Solo Stove Bonfire 2.0 — 19.5" base / 21.5" flange
                    </option>
                    <option value='breeo-x19'>
                      Breeo X19 — 19.0" base / 22.0" flange
                    </option>
                    <option value='breeo-x24'>
                      Breeo X24 — 24.0" base / 27.5" flange
                    </option>
                    <option value='breeo-x30'>
                      Breeo X30 — 30.0" base / 34.0" flange
                    </option>
                    <option value='tiki-patio'>
                      Tiki Brand Patio — 24.75" base / 26.75" flange
                    </option>
                    <option value='custom-diy'>Custom / DIY Steel Liner</option>
                  </select>
                </label>

                {(input.smokelessInsertPreset ?? 'custom-diy') ===
                  'custom-diy' && (
                  <>
                    <label className='flex flex-col gap-1'>
                      <span className='text-xs font-medium text-amber-900'>
                        Insert Base OD (in)
                      </span>
                      <input
                        type='number'
                        min={6}
                        step={0.25}
                        className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                        value={input.smokelessInsertBaseOD ?? 19.0}
                        onChange={(e) =>
                          setInput((prev) => ({
                            ...prev,
                            smokelessInsertBaseOD: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className='flex flex-col gap-1'>
                      <span className='text-xs font-medium text-amber-900'>
                        Insert Flange OD (in)
                      </span>
                      <input
                        type='number'
                        min={6}
                        step={0.25}
                        className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                        value={input.smokelessInsertFlangeOD ?? 21.0}
                        onChange={(e) =>
                          setInput((prev) => ({
                            ...prev,
                            smokelessInsertFlangeOD: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className='flex flex-col gap-1'>
                      <span className='text-xs font-medium text-amber-900'>
                        Min. Pit Depth (in)
                      </span>
                      <input
                        type='number'
                        min={8}
                        step={0.25}
                        className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                        value={input.smokelessInsertMinDepthIn ?? 14.0}
                        onChange={(e) =>
                          setInput((prev) => ({
                            ...prev,
                            smokelessInsertMinDepthIn: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                  </>
                )}

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Air Gap (in)
                  </span>
                  <input
                    type='number'
                    min={0.25}
                    max={3}
                    step={0.25}
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    value={input.smokelessInsertAirGapIn ?? 0.75}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        smokelessInsertAirGapIn: Number(e.target.value),
                      }))
                    }
                  />
                </label>

                <div className='sm:col-span-2 border-t border-amber-600/20 pt-2'>
                  <p className='text-xs font-semibold text-amber-900'>
                    Vent Sizing
                  </p>
                </div>

                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Primary Intake Holes
                  </span>
                  <input
                    type='number'
                    min={3}
                    max={48}
                    step={1}
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    value={input.smokelessPrimaryVentCount ?? 20}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        smokelessPrimaryVentCount: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Primary Hole Diameter (in)
                  </span>
                  <input
                    type='number'
                    min={0.25}
                    max={2}
                    step={0.0625}
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    value={input.smokelessPrimaryVentDiameterIn ?? 0.75}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        smokelessPrimaryVentDiameterIn: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Secondary Jet Holes
                  </span>
                  <input
                    type='number'
                    min={3}
                    max={48}
                    step={1}
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    value={input.smokelessSecondaryVentCount ?? 20}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        smokelessSecondaryVentCount: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className='flex flex-col gap-1'>
                  <span className='text-xs font-medium text-amber-900'>
                    Jet Hole Diameter (in)
                  </span>
                  <input
                    type='number'
                    min={0.25}
                    max={1}
                    step={0.0625}
                    className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                    value={input.smokelessSecondaryVentDiameterIn ?? 0.5}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        smokelessSecondaryVentDiameterIn: Number(
                          e.target.value,
                        ),
                      }))
                    }
                  />
                </label>
              </div>
            )}

            <label className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Capstone Type'
                tip='Cap units affect the finished top course, overhang, and cut planning. Matching wall units are the simplest starting point.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                value={input.capstonePresetKey ?? 'matching'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    capstonePresetKey: event.target.value,
                  }))
                }
              >
                <option value='matching'>Matching Wall Unit</option>
                {Object.entries(CAPSTONE_PRESETS)
                  .filter(([key]) => key !== 'matching')
                  .filter(([key]) =>
                    input.thermalAssemblyMode === 'double-wall'
                      ? key !== 'matching'
                      : true,
                  )
                  .map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.unit.name}
                      {input.thermalAssemblyMode === 'double-wall'
                        ? ` (${preset.unit.widthIn}" wide)`
                        : ''}
                    </option>
                  ))}
                <option value='custom'>Custom Cap Unit (Rectangular)</option>
                <option value='custom-radial'>Custom Cap Unit (Radial)</option>
              </select>
              {input.thermalAssemblyMode === 'double-wall' && (
                <div
                  className={`rounded-md border px-2 py-1.5 text-xs ${
                    capBridgeRowsEstimate > 1
                      ? 'border-amber-700/30 bg-amber-50 text-amber-900'
                      : 'border-emerald-700/30 bg-emerald-50 text-emerald-900'
                  }`}
                >
                  {capBridgeRowsEstimate > 1 ? (
                    <>
                      Current cap width is{' '}
                      <strong>{resolvedCapUnit.widthIn.toFixed(2)} in</strong>,
                      which does not fully bridge the double-wall depth in one
                      row. Estimated bridge rows:{' '}
                      <strong>{capBridgeRowsEstimate}</strong>.
                      {singleRowBridgeCapCandidates.length > 0 && (
                        <>
                          {' '}
                          Try a wider cap such as{' '}
                          <strong>
                            {singleRowBridgeCapCandidates[0]?.preset.unit.name}
                          </strong>
                          .
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Current cap width{' '}
                      <strong>{resolvedCapUnit.widthIn.toFixed(2)} in</strong>{' '}
                      can bridge the double-wall assembly in a single row.
                    </>
                  )}
                </div>
              )}
              {selectedCapPresetKey === 'matching' && selectedWallPreset && (
                <span className='text-xs text-amber-800/75'>
                  Matches wall unit: {selectedWallPreset.lengthIn}&Prime; L
                  &times; {selectedWallPreset.widthIn}&Prime; W &times;{' '}
                  {selectedWallPreset.heightIn}&Prime; H
                </span>
              )}
              {selectedCapPresetKey !== 'matching' &&
                selectedCapPreset &&
                'unit' in selectedCapPreset && (
                  <span className='text-xs text-amber-800/75'>
                    {selectedCapPreset.unit.lengthIn}&Prime; L &times;{' '}
                    {selectedCapPreset.unit.widthIn}&Prime; W &times;{' '}
                    {selectedCapPreset.unit.heightIn}&Prime; H (actual
                    dimensions)
                  </span>
                )}
              {!selectedCapPreset && usingCustomCap && (
                <span className='text-xs text-amber-800/75'>
                  Custom cap dimensions are set in the fields below.
                </span>
              )}
              {usingCustomCap && (
                <div className='mt-2 grid gap-2 rounded-md border border-amber-700/20 bg-white/60 p-3 sm:grid-cols-3'>
                  {usingCustomCapRadial ? (
                    <>
                      <label className='flex flex-col gap-1'>
                        <span className='text-xs font-medium text-amber-900'>
                          Inner Length (in)
                        </span>
                        <input
                          className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                          type='number'
                          min={1}
                          step={0.125}
                          value={input.customCapInnerLengthIn ?? 13.5}
                          onChange={(event) =>
                            setInput((prev) => ({
                              ...prev,
                              customCapInnerLengthIn: Number(
                                event.target.value,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label className='flex flex-col gap-1'>
                        <span className='text-xs font-medium text-amber-900'>
                          Outer Length (in)
                        </span>
                        <input
                          className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                          type='number'
                          min={1}
                          step={0.125}
                          value={input.customCapOuterLengthIn ?? 14.5}
                          onChange={(event) =>
                            setInput((prev) => ({
                              ...prev,
                              customCapOuterLengthIn: Number(
                                event.target.value,
                              ),
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <label className='flex flex-col gap-1'>
                      <span className='text-xs font-medium text-amber-900'>
                        Length (in)
                      </span>
                      <input
                        className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                        type='number'
                        min={1}
                        step={0.125}
                        value={input.customCapLengthIn ?? 14}
                        onChange={(event) =>
                          setInput((prev) => ({
                            ...prev,
                            customCapLengthIn: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  )}
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Width (in)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={1}
                      step={0.125}
                      value={input.customCapWidthIn ?? 10}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          customCapWidthIn: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Height (in)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={1}
                      step={0.125}
                      value={input.customCapHeightIn ?? 2}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          customCapHeightIn: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
              )}
            </label>

            <div className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Capstone Orientation'
                tip='This only changes cap module spacing. The wall still follows running bond.'
              />
              <div
                className='grid grid-cols-3 gap-1 rounded-lg border border-amber-700/25 bg-white p-1'
                role='group'
                aria-label='Capstone orientation'
              >
                {[
                  {
                    value: 'match-wall' as const,
                    label: 'Match Wall',
                    hint:
                      input.orientation === 'header' ? 'Header' : 'Stretcher',
                  },
                  {
                    value: 'stretcher' as const,
                    label: 'Stretcher',
                    hint: 'Long face',
                  },
                  {
                    value: 'header' as const,
                    label: 'Header',
                    hint: 'Short face',
                  },
                ].map((option) => {
                  const selected =
                    (input.capOrientation ?? 'match-wall') === option.value;

                  return (
                    <button
                      key={option.value}
                      type='button'
                      className={`rounded-md px-2 py-2 text-left transition-colors ${
                        selected
                          ? 'bg-amber-900 text-amber-50 shadow-sm'
                          : 'bg-white text-amber-900 hover:bg-amber-100/80'
                      }`}
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          capOrientation: option.value,
                        }))
                      }
                      aria-pressed={selected}
                    >
                      <span className='block text-sm font-semibold leading-tight'>
                        {option.label}
                      </span>
                      <span
                        className={`block text-xs leading-tight ${
                          selected ? 'text-amber-100/90' : 'text-amber-700/80'
                        }`}
                      >
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Capstone Cut Strategy'
                tip='Full-fit trims every cap to follow the finished ring. DIY corner-only leaves face caps square and cuts only corner pieces, reducing saw work but allowing larger or less-uniform joints.'
              />
              <div
                className='grid grid-cols-2 gap-1 rounded-lg border border-amber-700/25 bg-white p-1'
                role='group'
                aria-label='Capstone cut strategy'
              >
                {[
                  {
                    value: 'full-fit' as const,
                    label: 'Full-fit',
                    hint: 'Best coverage',
                  },
                  {
                    value: 'corner-only' as const,
                    label: 'DIY corner-only',
                    hint: 'Fewer cuts',
                  },
                ].map((option) => {
                  const selected =
                    (input.capCutStrategy ?? 'full-fit') === option.value;

                  return (
                    <button
                      key={option.value}
                      type='button'
                      className={`rounded-md px-2 py-2 text-left transition-colors ${
                        selected
                          ? 'bg-amber-900 text-amber-50 shadow-sm'
                          : 'bg-white text-amber-900 hover:bg-amber-100/80'
                      }`}
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          capCutStrategy: option.value,
                        }))
                      }
                      aria-pressed={selected}
                    >
                      <span className='block text-sm font-semibold leading-tight'>
                        {option.label}
                      </span>
                      <span
                        className={`block text-xs leading-tight ${
                          selected ? 'text-amber-100/90' : 'text-amber-700/80'
                        }`}
                      >
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label={
                  input.planShape === 'circular' ||
                  input.planShape === 'hexagonal' ||
                  input.planShape === 'octagonal'
                    ? 'Inner Diameter (in)'
                    : 'Inner Width (in)'
                }
                tip='Use the firebox opening as the primary dimension. The engine derives outer wall and centerline geometry from this value.'
              />
              <div className='space-y-2'>
                <div className='grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2'>
                  <input
                    className='h-2.5 w-full cursor-pointer rounded-full bg-white accent-amber-700'
                    aria-label={
                      input.planShape === 'circular' ||
                      input.planShape === 'hexagonal' ||
                      input.planShape === 'octagonal'
                        ? 'Inner Diameter in inches'
                        : 'Inner Width in inches'
                    }
                    title={
                      input.planShape === 'circular' ||
                      input.planShape === 'hexagonal' ||
                      input.planShape === 'octagonal'
                        ? 'Inner Diameter in inches'
                        : 'Inner Width in inches'
                    }
                    type='range'
                    min={primaryDimensionMin}
                    max={primaryDimensionMax}
                    step={1}
                    value={primaryDimensionValue}
                    onChange={(event) =>
                      updatePrimaryDimension(Number(event.target.value))
                    }
                  />
                  <input
                    className='w-[4.5rem] rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-right'
                    aria-label={
                      input.planShape === 'circular' ||
                      input.planShape === 'hexagonal' ||
                      input.planShape === 'octagonal'
                        ? 'Inner Diameter in inches'
                        : 'Inner Width in inches'
                    }
                    title={
                      input.planShape === 'circular' ||
                      input.planShape === 'hexagonal' ||
                      input.planShape === 'octagonal'
                        ? 'Inner Diameter in inches'
                        : 'Inner Width in inches'
                    }
                    type='number'
                    min={primaryDimensionMin}
                    value={primaryDimensionValue}
                    onChange={(event) =>
                      updatePrimaryDimension(Number(event.target.value))
                    }
                  />
                </div>
                <div className='flex justify-between text-xs text-amber-900/70'>
                  <span>{primaryDimensionMin}"</span>
                  <span>{primaryDimensionMax}"</span>
                </div>
              </div>
              {input.planShape === 'circular' && noCutGuidance && (
                <div className='mt-1 rounded-md border border-amber-900/15 bg-amber-50/80 px-2 py-1.5 text-xs text-amber-900'>
                  <button
                    type='button'
                    className='rounded-full border border-amber-900/25 bg-white px-2 py-0.5 font-semibold text-amber-950'
                    onClick={() => setShowNoCutDetails((value) => !value)}
                    aria-expanded={showNoCutDetails}
                  >
                    {showNoCutDetails
                      ? 'Hide No-Cut Sizes'
                      : 'Show No-Cut Sizes'}
                  </button>

                  {showNoCutDetails && (
                    <div className='mt-2'>
                      <p className='mb-1 text-[11px] font-medium text-amber-900/80'>
                        <span className='text-amber-900'>● wall</span>{' '}
                        <span className='text-blue-800'>● cap</span>{' '}
                        <span className='text-emerald-800'>● both</span>
                      </p>
                      <div className='flex flex-wrap gap-1'>
                        <button
                          type='button'
                          className='rounded-full border border-amber-900/25 bg-white px-2 py-0.5 font-medium text-amber-950'
                          onClick={() =>
                            setInput((prev) => ({
                              ...prev,
                              innerDiameterIn: Number(
                                noCutGuidance.wall.minimumNoCutDiameterIn.toFixed(
                                  2,
                                ),
                              ),
                            }))
                          }
                        >
                          Wall{' '}
                          {noCutGuidance.wall.minimumNoCutDiameterIn.toFixed(2)}{' '}
                          in
                        </button>
                        <button
                          type='button'
                          className='rounded-full border border-blue-700/25 bg-blue-50 px-2 py-0.5 font-medium text-blue-900'
                          onClick={() =>
                            setInput((prev) => ({
                              ...prev,
                              innerDiameterIn: Number(
                                noCutGuidance.cap.minimumNoCutDiameterIn.toFixed(
                                  2,
                                ),
                              ),
                            }))
                          }
                        >
                          Cap{' '}
                          {noCutGuidance.cap.minimumNoCutDiameterIn.toFixed(2)}{' '}
                          in
                        </button>
                        <button
                          type='button'
                          className='rounded-full border border-emerald-700/30 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900'
                          onClick={() =>
                            setInput((prev) => ({
                              ...prev,
                              innerDiameterIn: Number(
                                noCutGuidance.bothMinimumNoCutDiameterIn.toFixed(
                                  2,
                                ),
                              ),
                            }))
                          }
                        >
                          Both{' '}
                          {noCutGuidance.bothMinimumNoCutDiameterIn.toFixed(2)}{' '}
                          in
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </label>

            {input.planShape === 'rectangular' && (
              <label className='flex flex-col gap-1'>
                <FieldLabel
                  label='Inner Depth (in)'
                  tip='Only used for rectangular plans. Square plans keep width and depth locked together.'
                />
                <div className='space-y-2'>
                  <div className='grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2'>
                    <input
                      className='h-2.5 w-full cursor-pointer rounded-full bg-white accent-amber-700'
                      aria-label='Inner Depth in inches'
                      title='Inner Depth in inches'
                      type='range'
                      min={innerDepthMin}
                      max={innerDepthMax}
                      step={1}
                      value={input.innerDepthIn}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          innerDepthIn: Number(event.target.value),
                        }))
                      }
                    />
                    <input
                      className='w-[4.5rem] rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-right'
                      aria-label='Inner Depth in inches'
                      title='Inner Depth in inches'
                      type='number'
                      min={innerDepthMin}
                      value={input.innerDepthIn}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          innerDepthIn: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className='flex justify-between text-xs text-amber-900/70'>
                    <span>{innerDepthMin}"</span>
                    <span>{innerDepthMax}"</span>
                  </div>
                </div>
              </label>
            )}

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Wall Height (in)'
                tip='This controls course count. Very tall walls can reduce comfort and may call for heavier-looking cap proportions.'
              />
              <div className='space-y-2'>
                <div className='grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2'>
                  <input
                    className='h-2.5 w-full cursor-pointer rounded-full bg-white accent-amber-700'
                    aria-label='Wall Height in inches'
                    title='Wall Height in inches'
                    type='range'
                    min={wallHeightMin}
                    max={wallHeightMax}
                    step={1}
                    value={input.wallHeightIn}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        wallHeightIn: Number(event.target.value),
                      }))
                    }
                  />
                  <input
                    className='w-[4.5rem] rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-right'
                    aria-label='Wall Height in inches'
                    title='Wall Height in inches'
                    type='number'
                    min={wallHeightMin}
                    value={input.wallHeightIn}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        wallHeightIn: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className='flex justify-between text-xs text-amber-900/70'>
                  <span>{wallHeightMin}"</span>
                  <span>{wallHeightMax}"</span>
                </div>
              </div>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Mortar Joint (in)'
                tip='The default 3/8 in joint matches the core engineering baseline. Changing it will affect counts, spacing, and cut guidance.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Mortar Joint in inches'
                title='Mortar Joint in inches'
                type='number'
                min={0.25}
                step={0.125}
                value={input.mortarJointIn}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    mortarJointIn: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Structure Proximity (ft)'
                tip='This is the horizontal setback to combustibles. Anything below 10 ft triggers a warning.'
              />
              <div className='space-y-2'>
                <div className='grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-2'>
                  <input
                    className='h-2.5 w-full cursor-pointer rounded-full bg-white accent-amber-700'
                    aria-label='Structure Proximity in feet'
                    title='Structure Proximity in feet'
                    type='range'
                    min={proximityMin}
                    max={proximityMax}
                    step={1}
                    value={input.proximityToStructuresFt}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        proximityToStructuresFt: Number(event.target.value),
                      }))
                    }
                  />
                  <input
                    className='w-[4.5rem] rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-right'
                    aria-label='Structure Proximity in feet'
                    title='Structure Proximity in feet'
                    type='number'
                    min={proximityMin}
                    value={input.proximityToStructuresFt}
                    onChange={(event) =>
                      setInput((prev) => ({
                        ...prev,
                        proximityToStructuresFt: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className='flex justify-between text-xs text-amber-900/70'>
                  <span>{proximityMin} ft</span>
                  <span>{proximityMax} ft</span>
                </div>
              </div>
            </label>
          </div>
        )}

        <SectionHeading
          title='3 Fuel + Safety'
          description='Set setback, site context, and fuel behavior.'
          collapsible
          isOpen={showFuelSafety}
          onToggle={() => setShowFuelSafety((v) => !v)}
        />

        {showFuelSafety && (
          <div className='contents'>
            <label className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Soil Type (Site Context)'
                tip='Used for advisory guidance only. It does not override the locked baseline calculation of 8 in compacted angular stone.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Soil Type'
                title='Soil Type'
                value={input.soilType ?? 'unknown'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    soilType: event.target.value as NonNullable<
                      MasonryInput['soilType']
                    >,
                  }))
                }
              >
                <option value='unknown'>Unknown / not assessed</option>
                <option value='dense-granular'>
                  Dense granular (well-compacted gravel)
                </option>
                <option value='sandy'>Sandy soil</option>
                <option value='silty'>Silty soil</option>
                <option value='clay-expansive'>Clay / expansive soil</option>
                <option value='organic-or-fill'>
                  Organic soil or uncontrolled fill
                </option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Drainage'
                tip='Also advisory-only. Slow drainage raises the chance of settlement, freeze-thaw trouble, and soft subgrade conditions.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Drainage'
                title='Drainage'
                value={input.drainageCondition ?? 'unknown'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    drainageCondition: event.target.value as NonNullable<
                      MasonryInput['drainageCondition']
                    >,
                  }))
                }
              >
                <option value='unknown'>Unknown</option>
                <option value='well-drained'>Well drained</option>
                <option value='moderate'>Moderate</option>
                <option value='slow-draining'>Slow draining</option>
                <option value='poor-drainage'>Poor drainage</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Freeze-Thaw Climate'
                tip='Use this when seasonal frost is a real site condition. It only adjusts advisory guidance and does not change baseline quantities.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Freeze-Thaw Climate'
                title='Freeze-Thaw Climate'
                value={input.frostClimate ? 'yes' : 'no'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    frostClimate: event.target.value === 'yes',
                  }))
                }
              >
                <option value='no'>No / minimal frost risk</option>
                <option value='yes'>Yes / seasonal freeze-thaw</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Local Frost Line Depth (in)'
                tip='Use your local jurisdiction or geotech value. This drives code-checker guidance only.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Local Frost Line Depth in inches'
                title='Local Frost Line Depth in inches'
                type='number'
                min={0}
                step={1}
                value={input.frostLineDepthIn ?? 0}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    frostLineDepthIn: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Regional Code Profile'
                tip='Select the broad jurisdiction profile used by the regional checker. This is advisory and does not replace permit review.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Regional Code Profile'
                title='Regional Code Profile'
                value={input.regionalCodeProfile ?? 'ibc-general'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    regionalCodeProfile: event.target.value as NonNullable<
                      MasonryInput['regionalCodeProfile']
                    >,
                  }))
                }
              >
                <option value='ibc-general'>IBC general</option>
                <option value='irc-residential'>IRC residential</option>
                <option value='wui-high-risk'>
                  WUI high-risk wildfire zone
                </option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='HOA Constraint Level'
                tip='Use this to add pre-approval reminders and conservative checks for strict communities.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='HOA Constraint Level'
                title='HOA Constraint Level'
                value={input.hoaConstraintLevel ?? 'unknown'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    hoaConstraintLevel: event.target.value as NonNullable<
                      MasonryInput['hoaConstraintLevel']
                    >,
                  }))
                }
              >
                <option value='unknown'>Unknown</option>
                <option value='none'>No HOA restrictions</option>
                <option value='typical'>Typical HOA review</option>
                <option value='strict'>Strict HOA review</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Fuel Type'
                tip='Fuel type drives vent placement rules. Propane vents low, natural gas vents high, and wood focuses on combustion airflow.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Fuel Type'
                title='Fuel Type'
                value={input.fuelType}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    fuelType: event.target.value as MasonryInput['fuelType'],
                  }))
                }
              >
                <option value='wood'>Wood</option>
                <option value='propane'>Propane</option>
                <option value='natural-gas'>Natural Gas</option>
              </select>
            </label>

            {input.fuelType !== 'wood' && (
              <label className='flex flex-col gap-1'>
                <FieldLabel
                  label='Gas Hardware Template'
                  tip='Select the closest burner or pan class to tune vent-area guidance ranges. Always follow your exact hardware documentation.'
                />
                <select
                  className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                  aria-label='Gas hardware template'
                  title='Gas hardware template'
                  value={input.gasHardwareTemplate ?? 'generic-firepit'}
                  onChange={(event) =>
                    setInput((prev) => ({
                      ...prev,
                      gasHardwareTemplate: event.target
                        .value as MasonryInput['gasHardwareTemplate'],
                    }))
                  }
                >
                  <option value='generic-firepit'>
                    Generic firepit cavity
                  </option>
                  <option value='drop-in-pan'>Drop-in burner pan</option>
                  <option value='linear-burner'>Linear burner tray</option>
                  <option value='high-btu-bowl'>High-BTU bowl / ring</option>
                </select>
              </label>
            )}

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Thermal Liner'
                tip='Wood pits should generally use a liner or ring to protect the outer decorative shell from direct heat.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Thermal Liner'
                title='Thermal Liner'
                value={input.linerType}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    linerType: event.target.value as MasonryInput['linerType'],
                  }))
                }
              >
                <option value='none'>None</option>
                <option value='fire-brick'>Fire Brick</option>
                <option value='steel-ring'>Steel Ring</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Orientation'
                tip='Stretcher uses the long face along the wall run. Header rotates the unit and increases wall thickness.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Orientation'
                title='Orientation'
                value={input.orientation}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    orientation: event.target
                      .value as MasonryInput['orientation'],
                  }))
                }
              >
                <option value='stretcher'>Stretcher</option>
                <option value='header'>Header</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Overhead Clearance (ft)'
                tip='Planning value for vertical clearance to branches, pergolas, soffits, and other overhead combustibles.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Overhead clearance in feet'
                title='Overhead clearance in feet'
                type='number'
                min={1}
                max={40}
                step={0.5}
                value={input.overheadClearanceFt ?? 20}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    overheadClearanceFt: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
        )}

        <SectionHeading
          title='4 Seating Area'
          description='Plan the ground surface around your firepit and calculate material quantities.'
          collapsible
          isOpen={showSeating}
          onToggle={() => setShowSeating((v) => !v)}
        />

        {showSeating && (
          <div className='contents'>
            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Seating Shape'
                tip='Circular is the most common social layout. Square seating zones feel more patio-like and use the center-to-edge half-width for quantity math.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Seating Area Shape'
                title='Seating Area Shape'
                value={input.seatingAreaShape ?? 'circular'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    seatingAreaShape: event.target
                      .value as MasonryInput['seatingAreaShape'],
                  }))
                }
              >
                <option value='circular'>Circular</option>
                <option value='square'>Square</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Ground Type'
                tip='Select the finish surface for your seating zone. The engine will calculate material quantities based on the radius you set.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Seating Ground Type'
                title='Seating Ground Type'
                value={input.seatingGroundType ?? 'gravel'}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    seatingGroundType: event.target
                      .value as MasonryInput['seatingGroundType'],
                  }))
                }
              >
                <option value='gravel'>Compacted Gravel</option>
                <option value='mulch'>Mulch / Wood Chips</option>
                <option value='decomposed-granite'>Decomposed Granite</option>
                <option value='permeable-paver'>Permeable Paver + Grass</option>
                <option value='hardscape'>Hardscape (Concrete/Stone)</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Furniture Style'
                tip='Use Adirondack for individual gathering chairs or Bench for a simpler built-in seating reference in the 3D preview.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Seating Furniture Style'
                title='Seating Furniture Style'
                value={seatingFurnitureStyle}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    seatingFurnitureStyle: event.target
                      .value as MasonryInput['seatingFurnitureStyle'],
                    seatingFurnitureCount: clampSeatingFurnitureCount(
                      prev.seatingFurnitureCount,
                      getMaxCircularSeatingCount(
                        prev.seatingAreaRadiusFt ?? 10,
                        event.target
                          .value as MasonryInput['seatingFurnitureStyle'],
                        prev.seatingDensity ?? 'standard',
                      ),
                    ),
                  }))
                }
              >
                <option value='adirondack'>Adirondack Chairs</option>
                <option value='bench'>Bench Seating</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Furniture Count'
                tip='Default is 4. Increase or decrease how many seating markers are shown around the pit; the maximum is capped by what fits around the selected seating diameter.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Seating furniture count'
                title='Seating furniture count'
                type='number'
                min={1}
                max={maxSeatingFurnitureCount}
                step={1}
                value={resolvedSeatingFurnitureCount}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    seatingFurnitureCount: clampSeatingFurnitureCount(
                      Number(event.target.value),
                      getMaxCircularSeatingCount(
                        prev.seatingAreaRadiusFt ?? 10,
                        prev.seatingFurnitureStyle ?? 'adirondack',
                        prev.seatingDensity ?? 'standard',
                      ),
                    ),
                  }))
                }
              />
              <span className='text-xs text-amber-900/70'>
                Max for current layout: {maxSeatingFurnitureCount}
              </span>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Seating Density'
                tip='Cozy pulls seating inward with tighter spacing, Standard balances movement and conversation, Spacious opens circulation around the fire.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Seating Density'
                title='Seating Density'
                value={seatingDensity}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    seatingDensity: event.target
                      .value as MasonryInput['seatingDensity'],
                    seatingFurnitureCount: clampSeatingFurnitureCount(
                      prev.seatingFurnitureCount,
                      getMaxCircularSeatingCount(
                        prev.seatingAreaRadiusFt ?? 10,
                        prev.seatingFurnitureStyle ?? 'adirondack',
                        event.target.value as MasonryInput['seatingDensity'],
                      ),
                    ),
                  }))
                }
              >
                <option value='cozy'>Cozy</option>
                <option value='standard'>Standard</option>
                <option value='spacious'>Spacious</option>
              </select>
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label={
                  input.seatingAreaShape === 'square'
                    ? 'Seating Half-Width (ft)'
                    : 'Seating Area Radius (ft)'
                }
                tip={
                  input.seatingAreaShape === 'square'
                    ? 'For square seating, this is the center-to-edge half-width. A value of 10 ft creates a 20 ft by 20 ft seating zone.'
                    : 'Distance from pit center to outer edge of the seating zone. Typical range is 8–15 ft for comfortable social gathering.'
                }
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label={
                  input.seatingAreaShape === 'square'
                    ? 'Seating half-width in feet'
                    : 'Seating area radius in feet'
                }
                title={
                  input.seatingAreaShape === 'square'
                    ? 'Seating half-width in feet'
                    : 'Seating area radius in feet'
                }
                type='number'
                min={5}
                max={30}
                step={0.5}
                value={seatingAreaRadiusFt}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    seatingAreaRadiusFt: Number(event.target.value),
                    seatingFurnitureCount: clampSeatingFurnitureCount(
                      prev.seatingFurnitureCount,
                      getMaxCircularSeatingCount(
                        Number(event.target.value),
                        prev.seatingFurnitureStyle ?? 'adirondack',
                        prev.seatingDensity ?? 'standard',
                      ),
                    ),
                  }))
                }
              />
            </label>
          </div>
        )}

        <div className='sm:col-span-2 rounded-xl border border-amber-900/15 bg-white/65 px-3 py-2'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-xs font-medium text-amber-900/80'>
              5 Advanced controls for vent routing and course tuning.
            </p>
            <button
              type='button'
              className='rounded-full border border-amber-900/25 bg-white px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-50'
              onClick={() => setShowAdvanced((value) => !value)}
              aria-expanded={showAdvanced}
              aria-controls='advanced-options-panel'
            >
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div id='advanced-options-panel' className='contents'>
            <SectionHeading
              title='5 Advanced'
              description='Use practical presets for shim spacers or vent-heavy accent courses while keeping running bond behavior.'
            />

            <label className='flex flex-col gap-1 sm:col-span-2'>
              <FieldLabel
                label='Wall Course Strategy'
                tip='Uniform keeps a consistent course recipe. Shim Spacer inserts thin units between primary units. Vented Accent applies a more open alternate course.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Wall Course Strategy'
                title='Wall Course Strategy'
                value={courseStrategy}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    wallCourseStrategy: event.target.value as NonNullable<
                      MasonryInput['wallCourseStrategy']
                    >,
                  }))
                }
              >
                <option value='uniform'>Uniform Running Bond</option>
                <option value='shim-spacer'>Shim Spacer Course</option>
                <option value='vented-accent'>Vented Accent Course</option>
              </select>
            </label>

            {courseStrategy === 'shim-spacer' && (
              <div className='rounded-md border border-amber-700/20 bg-white/60 p-3 sm:col-span-2'>
                <h4 className='text-xs font-semibold uppercase tracking-[0.12em] text-amber-900/75'>
                  Shim Spacer Settings
                </h4>
                <p className='mt-1 text-xs text-amber-900/70'>
                  Configure a thin spacer inserted between larger units. Spacer
                  height should generally match the adjacent course height. The
                  engine adaptively spaces inserts to match curve geometry.
                </p>
                <div className='mt-2 grid gap-2 sm:grid-cols-4'>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Spacer Length (in)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={0.5}
                      step={0.125}
                      value={input.shimUnitLengthIn ?? 1.25}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          shimUnitLengthIn: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Spacer Width (in)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={0.5}
                      step={0.125}
                      value={input.shimUnitWidthIn ?? 1.125}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          shimUnitWidthIn: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Spacer Height (in)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={0.5}
                      step={0.125}
                      value={input.shimUnitHeightIn ?? 2.25}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          shimUnitHeightIn: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='text-xs font-medium text-amber-900'>
                      Max Shim Share (%)
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={10}
                      max={33}
                      step={1}
                      value={input.shimMaxSharePct ?? 25}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          shimMaxSharePct: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            {courseStrategy === 'vented-accent' && (
              <div className='rounded-md border border-amber-700/20 bg-white/60 p-3 sm:col-span-2'>
                <h4 className='text-xs font-semibold uppercase tracking-[0.12em] text-amber-900/75'>
                  Vented Accent Settings
                </h4>
                <p className='mt-1 text-xs text-amber-900/70'>
                  Define a repeating cycle where one course uses larger joints
                  and an alternate orientation for airflow.
                </p>
                <div className='mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4'>
                  <label className='flex flex-col gap-1'>
                    <span className='min-h-15 text-xs font-medium leading-5 text-amber-900'>
                      Joint Multiplier
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={1}
                      step={0.1}
                      value={input.accentJointMultiplier ?? 1.75}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          accentJointMultiplier: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='min-h-15 text-xs font-medium leading-5 text-amber-900'>
                      Cycle Length
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={2}
                      step={1}
                      value={input.accentCycleLength ?? 3}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          accentCycleLength: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='min-h-15 text-xs font-medium leading-5 text-amber-900'>
                      Accent Course Position
                    </span>
                    <input
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      type='number'
                      min={1}
                      step={1}
                      value={input.accentCoursePosition ?? 2}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          accentCoursePosition: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='min-h-15 text-xs font-medium leading-5 text-amber-900'>
                      Accent Orientation
                    </span>
                    <select
                      className='rounded-md border border-amber-700/30 bg-white px-2 py-1.5 text-sm'
                      aria-label='Accent Orientation'
                      title='Accent Orientation'
                      value={input.accentCourseOrientation ?? 'header'}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          accentCourseOrientation: event.target
                            .value as NonNullable<
                            MasonryInput['accentCourseOrientation']
                          >,
                        }))
                      }
                    >
                      <option value='stretcher'>Stretcher</option>
                      <option value='header'>Header</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Expansion Gap (in)'
                tip='This affects liner geometry. It matters most when a steel ring or fire-brick liner needs room to move independently of the outer shell.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Expansion Gap in inches'
                title='Expansion Gap in inches'
                type='number'
                min={0}
                step={0.125}
                value={input.expansionGapIn}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    expansionGapIn: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Vent Count'
                tip='Use enough vents to satisfy total open area and to support balanced airflow around the firebox.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Vent Count'
                title='Vent Count'
                type='number'
                min={2}
                value={input.ventCount}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    ventCount: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Vent Opening Area (sq in)'
                tip='The engine uses this to calculate total open area. Gas features often target a broader 18 to 36 sq in range depending on hardware.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Vent Opening Area in square inches'
                title='Vent Opening Area in square inches'
                type='number'
                min={1}
                step={0.5}
                value={input.ventOpeningAreaSqIn}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    ventOpeningAreaSqIn: Number(event.target.value),
                  }))
                }
              />
            </label>

            <SectionHeading
              title='Cap And Routing'
              description='Finish the top profile and keep utilities clear of vent openings.'
            />

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Capstone Overhang (in)'
                tip='A modest 1 to 2 in overhang usually improves water shedding and gives the cap more visual presence.'
              />
              <input
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Capstone Overhang in inches'
                title='Capstone Overhang in inches'
                type='number'
                min={0}
                step={0.25}
                value={input.capstoneOverhangIn}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    capstoneOverhangIn: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className='flex flex-col gap-1'>
              <FieldLabel
                label='Cap Placement'
                tip='Outward-only keeps the overhang outside the wall. Symmetric splits the cap extension inward and outward.'
              />
              <select
                className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                aria-label='Cap Placement'
                title='Cap Placement'
                value={input.capPlacementMode}
                onChange={(event) =>
                  setInput((prev) => ({
                    ...prev,
                    capPlacementMode: event.target
                      .value as MasonryInput['capPlacementMode'],
                  }))
                }
              >
                <option value='outward-only'>Outward Only</option>
                <option value='symmetric'>Symmetric</option>
              </select>
            </label>

            {input.fuelType !== 'wood' && (
              <label className='flex flex-col gap-1 sm:col-span-2'>
                <FieldLabel
                  label='Gas Line Entry Angle (deg)'
                  tip='Use this to route the gas line away from planned vent axes. The engine can auto-shift the entry if it conflicts with a vent.'
                />
                <input
                  className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
                  aria-label='Gas Line Entry Angle in degrees'
                  title='Gas Line Entry Angle in degrees'
                  type='number'
                  min={0}
                  max={359}
                  value={input.gasLineEntryAngleDeg}
                  onChange={(event) =>
                    setInput((prev) => ({
                      ...prev,
                      gasLineEntryAngleDeg: Number(event.target.value),
                    }))
                  }
                />
              </label>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
