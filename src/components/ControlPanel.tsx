import { useState, type Dispatch, type SetStateAction } from 'react';
import HelpTip from './HelpTip';
import { BRICK_PRESETS, CAPSTONE_PRESETS } from '../engine/MasonryEngine';
import type { MasonryInput } from '../types';

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
}: {
  title: string;
  description: string;
}) {
  return (
    <div className='sm:col-span-2'>
      <h3 className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
        {title}
      </h3>
      <p className='mt-1 text-xs leading-5 text-amber-900/70'>{description}</p>
    </div>
  );
}

export default function ControlPanel({
  input,
  setInput,
  noCutGuidance,
}: ControlPanelProps) {
  const [showNoCutDetails, setShowNoCutDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const usingCustomBrick =
    input.brickPresetKey === 'custom' ||
    input.brickPresetKey === 'custom-radial';
  const usingCustomBrickRadial = input.brickPresetKey === 'custom-radial';
  const usingCustomCap =
    input.capstonePresetKey === 'custom' ||
    input.capstonePresetKey === 'custom-radial';
  const usingCustomCapRadial = input.capstonePresetKey === 'custom-radial';
  const courseStrategy = input.wallCourseStrategy ?? 'uniform';

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
        />

        <label className='flex flex-col gap-1 sm:col-span-2'>
          <FieldLabel
            label='Plan Shape'
            tip='Circular layouts are common for masonry fire pits and keep coursing, vent spacing, and cap layout easy to read at a glance.'
          />
          <select
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
            aria-label='Plan Shape'
            title='Plan Shape'
            value={input.planShape}
            onChange={(event) =>
              setInput((prev) => {
                const planShape = event.target
                  .value as MasonryInput['planShape'];
                return {
                  ...prev,
                  planShape,
                  innerDepthIn:
                    planShape === 'rectangular'
                      ? prev.innerDepthIn
                      : prev.innerWidthIn,
                };
              })
            }
          >
            <option value='circular'>Circular</option>
            <option value='square'>Square</option>
            <option value='rectangular'>Rectangular</option>
          </select>
        </label>

        <SectionHeading
          title='2 Materials'
          description='Select wall and cap units, then tune orientation details.'
        />

        <label className='flex flex-col gap-1 sm:col-span-2'>
          <FieldLabel
            label='Brick Type'
            tip='Use actual unit dimensions, not nominal sizes. Switch to a custom or radial option only when you know the exact unit you plan to buy.'
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
            {Object.entries(BRICK_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.name} &mdash; {preset.lengthIn}&Prime; &times;{' '}
                {preset.widthIn}&Prime; &times; {preset.heightIn}&Prime;
              </option>
            ))}
            <option value='custom'>Custom Brick (Rectangular)</option>
            <option value='custom-radial'>Custom Brick (Radial)</option>
          </select>
          {/* <span className='text-xs text-amber-700/70'>
            L&nbsp;{currentPreset.lengthIn}&Prime; &times; W&nbsp;
            {currentPreset.widthIn}&Prime; &times; H&nbsp;
            {currentPreset.heightIn}&Prime; (actual dimensions)
          </span> */}
          {usingCustomBrick && (
            <div className='mt-2 grid gap-2 rounded-md border border-amber-700/20 bg-white/60 p-3 sm:grid-cols-3'>
              {usingCustomBrickRadial ? (
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
                      value={input.customBrickInnerLengthIn ?? 7.25}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          customBrickInnerLengthIn: Number(event.target.value),
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
                      value={input.customBrickOuterLengthIn ?? 8}
                      onChange={(event) =>
                        setInput((prev) => ({
                          ...prev,
                          customBrickOuterLengthIn: Number(event.target.value),
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
        </label>

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
              .map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.unit.name} &mdash; {preset.unit.lengthIn}&Prime;
                  &times; {preset.unit.widthIn}&Prime; &times;{' '}
                  {preset.unit.heightIn}
                  &Prime;
                </option>
              ))}
            <option value='custom'>Custom Cap Unit (Rectangular)</option>
            <option value='custom-radial'>Custom Cap Unit (Radial)</option>
          </select>
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
                          customCapInnerLengthIn: Number(event.target.value),
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
                          customCapOuterLengthIn: Number(event.target.value),
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
                hint: input.orientation === 'header' ? 'Header' : 'Stretcher',
              },
              {
                value: 'stretcher' as const,
                label: 'Stretcher',
                hint: 'Long face',
              },
              { value: 'header' as const, label: 'Header', hint: 'Short face' },
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
              input.planShape === 'circular'
                ? 'Inner Diameter (in)'
                : 'Inner Width (in)'
            }
            tip='Use the firebox opening as the primary dimension. The engine derives outer wall and centerline geometry from this value.'
          />
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
            aria-label={
              input.planShape === 'circular'
                ? 'Inner Diameter in inches'
                : 'Inner Width in inches'
            }
            title={
              input.planShape === 'circular'
                ? 'Inner Diameter in inches'
                : 'Inner Width in inches'
            }
            type='number'
            min={18}
            value={
              input.planShape === 'circular'
                ? input.innerDiameterIn
                : input.innerWidthIn
            }
            onChange={(event) =>
              setInput((prev) => {
                const value = Number(event.target.value);
                return input.planShape === 'circular'
                  ? {
                      ...prev,
                      innerDiameterIn: value,
                    }
                  : {
                      ...prev,
                      innerWidthIn: value,
                      innerDepthIn:
                        prev.planShape === 'rectangular'
                          ? prev.innerDepthIn
                          : value,
                    };
              })
            }
          />
          {input.planShape === 'circular' && noCutGuidance && (
            <div className='mt-1 rounded-md border border-amber-900/15 bg-amber-50/80 px-2 py-1.5 text-xs text-amber-900'>
              <button
                type='button'
                className='rounded-full border border-amber-900/25 bg-white px-2 py-0.5 font-semibold text-amber-950'
                onClick={() => setShowNoCutDetails((value) => !value)}
              >
                {showNoCutDetails ? 'Hide No-Cut Sizes' : 'Show No-Cut Sizes'}
              </button>

              {showNoCutDetails && (
                <div className='mt-2 flex flex-wrap gap-1'>
                  <button
                    type='button'
                    className='rounded-full border border-amber-900/25 bg-white px-2 py-0.5 font-medium text-amber-950'
                    onClick={() =>
                      setInput((prev) => ({
                        ...prev,
                        innerDiameterIn: Number(
                          noCutGuidance.wall.minimumNoCutDiameterIn.toFixed(2),
                        ),
                      }))
                    }
                  >
                    Wall {noCutGuidance.wall.minimumNoCutDiameterIn.toFixed(2)}{' '}
                    in
                  </button>
                  <button
                    type='button'
                    className='rounded-full border border-blue-700/25 bg-blue-50 px-2 py-0.5 font-medium text-blue-900'
                    onClick={() =>
                      setInput((prev) => ({
                        ...prev,
                        innerDiameterIn: Number(
                          noCutGuidance.cap.minimumNoCutDiameterIn.toFixed(2),
                        ),
                      }))
                    }
                  >
                    Cap {noCutGuidance.cap.minimumNoCutDiameterIn.toFixed(2)} in
                  </button>
                  <button
                    type='button'
                    className='rounded-full border border-emerald-700/30 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900'
                    onClick={() =>
                      setInput((prev) => ({
                        ...prev,
                        innerDiameterIn: Number(
                          noCutGuidance.bothMinimumNoCutDiameterIn.toFixed(2),
                        ),
                      }))
                    }
                  >
                    Both {noCutGuidance.bothMinimumNoCutDiameterIn.toFixed(2)}{' '}
                    in
                  </button>
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
            <input
              className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
              aria-label='Inner Depth in inches'
              title='Inner Depth in inches'
              type='number'
              min={18}
              value={input.innerDepthIn}
              onChange={(event) =>
                setInput((prev) => ({
                  ...prev,
                  innerDepthIn: Number(event.target.value),
                }))
              }
            />
          </label>
        )}

        <label className='flex flex-col gap-1'>
          <FieldLabel
            label='Wall Height (in)'
            tip='This controls course count. Very tall walls can reduce comfort and may call for heavier-looking cap proportions.'
          />
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
            aria-label='Wall Height in inches'
            title='Wall Height in inches'
            type='number'
            min={8}
            value={input.wallHeightIn}
            onChange={(event) =>
              setInput((prev) => ({
                ...prev,
                wallHeightIn: Number(event.target.value),
              }))
            }
          />
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
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
            aria-label='Structure Proximity in feet'
            title='Structure Proximity in feet'
            type='number'
            min={1}
            value={input.proximityToStructuresFt}
            onChange={(event) =>
              setInput((prev) => ({
                ...prev,
                proximityToStructuresFt: Number(event.target.value),
              }))
            }
          />
        </label>

        <SectionHeading
          title='3 Fuel + Safety'
          description='Set setback, site context, fuel behavior, and thermal controls.'
        />

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
                orientation: event.target.value as MasonryInput['orientation'],
              }))
            }
          >
            <option value='stretcher'>Stretcher</option>
            <option value='header'>Header</option>
          </select>
        </label>

        <div className='sm:col-span-2 rounded-xl border border-amber-900/15 bg-white/65 px-3 py-2'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-xs font-medium text-amber-900/80'>
              4 Advanced controls for vent routing and course tuning.
            </p>
            <button
              type='button'
              className='rounded-full border border-amber-900/25 bg-white px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-50'
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>
          </div>
        </div>

        {showAdvanced && (
          <>
            <SectionHeading
              title='4 Advanced'
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
          </>
        )}
      </div>
    </section>
  );
}
