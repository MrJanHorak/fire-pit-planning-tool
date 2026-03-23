import type { MasonryInput } from '../types';

export const FIREPIT_PROJECT_KIND = 'firepit-project';
export const FIREPIT_PROJECT_VERSION = 1;

export interface FirepitProjectFile {
  kind: typeof FIREPIT_PROJECT_KIND;
  version: typeof FIREPIT_PROJECT_VERSION;
  savedAt: string;
  projectName?: string;
  input: MasonryInput;
}

export interface ParsedFirepitProject {
  input: MasonryInput;
  projectName: string | null;
  savedAt: string | null;
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function normalizeMasonryInput(
  candidate: unknown,
  defaults: MasonryInput,
): MasonryInput {
  if (!candidate || typeof candidate !== 'object') {
    return defaults;
  }

  const value = candidate as Record<string, unknown>;

  return {
    planShape: coerceString(
      value.planShape,
      defaults.planShape,
    ) as MasonryInput['planShape'],
    innerDiameterIn: coerceNumber(
      value.innerDiameterIn,
      defaults.innerDiameterIn,
    ),
    innerWidthIn: coerceNumber(value.innerWidthIn, defaults.innerWidthIn),
    innerDepthIn: coerceNumber(value.innerDepthIn, defaults.innerDepthIn),
    wallHeightIn: coerceNumber(value.wallHeightIn, defaults.wallHeightIn),
    proximityToStructuresFt: coerceNumber(
      value.proximityToStructuresFt,
      defaults.proximityToStructuresFt,
    ),
    fuelType: coerceString(
      value.fuelType,
      defaults.fuelType,
    ) as MasonryInput['fuelType'],
    linerType: coerceString(
      value.linerType,
      defaults.linerType,
    ) as MasonryInput['linerType'],
    expansionGapIn: coerceNumber(value.expansionGapIn, defaults.expansionGapIn),
    mortarJointIn: coerceNumber(value.mortarJointIn, defaults.mortarJointIn),
    orientation: coerceString(
      value.orientation,
      defaults.orientation,
    ) as MasonryInput['orientation'],
    capOrientation: coerceString(
      value.capOrientation,
      defaults.capOrientation ?? 'match-wall',
    ) as MasonryInput['capOrientation'],
    bondPattern: coerceString(
      value.bondPattern,
      defaults.bondPattern,
    ) as MasonryInput['bondPattern'],
    ventCount: coerceNumber(value.ventCount, defaults.ventCount),
    ventOpeningAreaSqIn: coerceNumber(
      value.ventOpeningAreaSqIn,
      defaults.ventOpeningAreaSqIn,
    ),
    gasLineEntryAngleDeg: coerceNumber(
      value.gasLineEntryAngleDeg,
      defaults.gasLineEntryAngleDeg,
    ),
    capstoneOverhangIn: coerceNumber(
      value.capstoneOverhangIn,
      defaults.capstoneOverhangIn,
    ),
    capPlacementMode: coerceString(
      value.capPlacementMode,
      defaults.capPlacementMode,
    ) as MasonryInput['capPlacementMode'],
    soilType: coerceString(
      value.soilType,
      defaults.soilType ?? 'unknown',
    ) as MasonryInput['soilType'],
    drainageCondition: coerceString(
      value.drainageCondition,
      defaults.drainageCondition ?? 'unknown',
    ) as MasonryInput['drainageCondition'],
    frostClimate: coerceBoolean(
      value.frostClimate,
      defaults.frostClimate ?? false,
    ),
    capstonePresetKey: coerceString(
      value.capstonePresetKey,
      defaults.capstonePresetKey ?? 'matching',
    ),
    brickPresetKey: coerceString(
      value.brickPresetKey,
      defaults.brickPresetKey ?? 'modular',
    ),
    customBrickLengthIn: coerceNumber(
      value.customBrickLengthIn,
      defaults.customBrickLengthIn ?? 7.625,
    ),
    customBrickWidthIn: coerceNumber(
      value.customBrickWidthIn,
      defaults.customBrickWidthIn ?? 3.625,
    ),
    customBrickHeightIn: coerceNumber(
      value.customBrickHeightIn,
      defaults.customBrickHeightIn ?? 2.25,
    ),
    customBrickInnerLengthIn: coerceNumber(
      value.customBrickInnerLengthIn,
      defaults.customBrickInnerLengthIn ?? 7.25,
    ),
    customBrickOuterLengthIn: coerceNumber(
      value.customBrickOuterLengthIn,
      defaults.customBrickOuterLengthIn ?? 8,
    ),
    customCapLengthIn: coerceNumber(
      value.customCapLengthIn,
      defaults.customCapLengthIn ?? 14,
    ),
    customCapWidthIn: coerceNumber(
      value.customCapWidthIn,
      defaults.customCapWidthIn ?? 10,
    ),
    customCapHeightIn: coerceNumber(
      value.customCapHeightIn,
      defaults.customCapHeightIn ?? 2,
    ),
    customCapInnerLengthIn: coerceNumber(
      value.customCapInnerLengthIn,
      defaults.customCapInnerLengthIn ?? 13.5,
    ),
    customCapOuterLengthIn: coerceNumber(
      value.customCapOuterLengthIn,
      defaults.customCapOuterLengthIn ?? 14.5,
    ),
  };
}

export function buildProjectFile(
  input: MasonryInput,
  projectName?: string,
): FirepitProjectFile {
  return {
    kind: FIREPIT_PROJECT_KIND,
    version: FIREPIT_PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    projectName,
    input,
  };
}

export function parseProjectFile(
  content: string,
  defaults: MasonryInput,
): ParsedFirepitProject {
  const parsed = JSON.parse(content) as unknown;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Project file must be a JSON object.');
  }

  const project = parsed as Record<string, unknown>;
  const candidate = project.input ?? parsed;

  if ('kind' in project && project.kind !== FIREPIT_PROJECT_KIND) {
    throw new Error('Unsupported project file type.');
  }

  return {
    input: normalizeMasonryInput(candidate, defaults),
    projectName:
      typeof project.projectName === 'string' && project.projectName.trim()
        ? project.projectName.trim()
        : null,
    savedAt:
      typeof project.savedAt === 'string' && project.savedAt.trim()
        ? project.savedAt
        : null,
  };
}

export function parseProjectFileContent(
  content: string,
  defaults: MasonryInput,
): MasonryInput {
  return parseProjectFile(content, defaults).input;
}

export function readStoredProject(
  storageKey: string,
  defaults: MasonryInput,
): ParsedFirepitProject | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return parseProjectFile(raw, defaults);
  } catch {
    return null;
  }
}

export function readStoredProjectInput(
  storageKey: string,
  defaults: MasonryInput,
): MasonryInput | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return readStoredProject(storageKey, defaults)?.input ?? null;
}

export function writeStoredProject(
  storageKey: string,
  input: MasonryInput,
  projectName?: string,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify(buildProjectFile(input, projectName)),
  );
}

export function writeStoredProjectInput(
  storageKey: string,
  input: MasonryInput,
) {
  writeStoredProject(storageKey, input);
}
