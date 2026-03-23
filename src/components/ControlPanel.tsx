import { useState, type Dispatch, type SetStateAction } from 'react';
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

export default function ControlPanel({
  input,
  setInput,
  noCutGuidance,
}: ControlPanelProps) {
  const [showNoCutDetails, setShowNoCutDetails] = useState(false);
  const usingCustomBrick =
    input.brickPresetKey === 'custom' ||
    input.brickPresetKey === 'custom-radial';
  const usingCustomBrickRadial = input.brickPresetKey === 'custom-radial';
  const usingCustomCap =
    input.capstonePresetKey === 'custom' ||
    input.capstonePresetKey === 'custom-radial';
  const usingCustomCapRadial = input.capstonePresetKey === 'custom-radial';
  const currentPreset = usingCustomBrick
    ? {
        name: usingCustomBrickRadial
          ? 'Custom Radial Brick (Avg)'
          : 'Custom Brick',
        lengthIn: usingCustomBrickRadial
          ? ((input.customBrickInnerLengthIn ?? 7.25) +
              (input.customBrickOuterLengthIn ?? 8)) /
            2
          : (input.customBrickLengthIn ?? 7.625),
        widthIn: input.customBrickWidthIn ?? 3.625,
        heightIn: input.customBrickHeightIn ?? 2.25,
      }
    : BRICK_PRESETS[input.brickPresetKey ?? 'modular'];

  return (
    <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/70 p-5 shadow-lg backdrop-blur'>
      <h2 className='mb-4 text-lg font-semibold tracking-tight'>
        Design Inputs
      </h2>

      <div className='grid gap-3 sm:grid-cols-2'>
        <label className='flex flex-col gap-1 sm:col-span-2'>
          <span className='text-sm font-medium'>Plan Shape</span>
          <select
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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

        <label className='flex flex-col gap-1 sm:col-span-2'>
          <span className='text-sm font-medium'>Brick Type</span>
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
          <span className='text-xs text-amber-700/70'>
            L&nbsp;{currentPreset.lengthIn}&Prime; &times; W&nbsp;
            {currentPreset.widthIn}&Prime; &times; H&nbsp;
            {currentPreset.heightIn}&Prime; (actual dimensions)
          </span>
          <span className='text-xs text-amber-700/80'>
            Expanded catalog includes common face bricks, fire brick sizes,
            paver-style units, and rounded/radial choices used for firepit rims
            and curves.
          </span>
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
          <span className='text-sm font-medium'>Capstone Type</span>
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
          <span className='text-xs text-amber-700/70'>
            Includes matching units, flat cap stone, cap blocks, rowlock,
            bullnose cap, and radius wall cap options for curved edges.
          </span>
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
          <span className='text-sm font-medium'>Capstone Orientation</span>
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
          <span className='text-xs text-amber-700/70'>
            Affects cap module spacing only. Wall courses remain running bond.
          </span>
        </div>

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>
            {input.planShape === 'circular'
              ? 'Inner Diameter (in)'
              : 'Inner Width (in)'}
          </span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
              <div>
                <button
                  type='button'
                  className='rounded-full border border-amber-900/25 bg-white px-2 py-0.5 font-semibold text-amber-950'
                  onClick={() => setShowNoCutDetails((value) => !value)}
                >
                  {showNoCutDetails
                    ? 'Hide No-Cut Suggestions'
                    : 'Show No-Cut Suggestions'}
                </button>
              </div>

              {showNoCutDetails && (
                <div className='mt-1 flex flex-wrap gap-1'>
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
                    Wall no-cut:{' '}
                    {noCutGuidance.wall.minimumNoCutDiameterIn.toFixed(2)} in
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
                    Cap no-cut:{' '}
                    {noCutGuidance.cap.minimumNoCutDiameterIn.toFixed(2)} in
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
                    Both no-cut:{' '}
                    {noCutGuidance.bothMinimumNoCutDiameterIn.toFixed(2)} in
                  </button>
                </div>
              )}
            </div>
          )}
        </label>

        {input.planShape === 'rectangular' && (
          <label className='flex flex-col gap-1'>
            <span className='text-sm font-medium'>Inner Depth (in)</span>
            <input
              className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-sm font-medium'>Wall Height (in)</span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-sm font-medium'>Mortar Joint (in)</span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-sm font-medium'>Structure Proximity (ft)</span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>Fuel Type</span>
          <select
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-sm font-medium'>Thermal Liner</span>
          <select
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-sm font-medium'>Orientation</span>
          <select
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>Expansion Gap (in)</span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-xs text-amber-700/70'>
            Applies to liner geometry; effect is visible when liner is Fire
            Brick or Steel Ring.
          </span>
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>Vent Count</span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-sm font-medium'>Vent Opening Area (sq in)</span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-xs text-amber-700/70'>
            3D vent void scales with this value.
          </span>
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>Capstone Overhang (in)</span>
          <input
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
          <span className='text-sm font-medium'>Cap Placement</span>
          <select
            className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
            <span className='text-sm font-medium'>
              Gas Line Entry Angle (deg)
            </span>
            <input
              className='rounded-md border border-amber-700/30 bg-white px-3 py-2'
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
            <span className='text-xs text-amber-700/70'>
              Use this to keep gas line routing off the planned vent axes.
            </span>
          </label>
        )}
      </div>
    </section>
  );
}
