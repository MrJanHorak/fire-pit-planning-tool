import { buildProjectFile, parseProjectFile } from './projectFile';
import type { MasonryInput } from '../types';

const SHARE_VERSION = '2';

const SHARE_FIELD_MAP: Array<[keyof MasonryInput, string]> = [
  ['planShape', 'ps'],
  ['innerDiameterIn', 'id'],
  ['innerWidthIn', 'iw'],
  ['innerDepthIn', 'dp'],
  ['wallHeightIn', 'wh'],
  ['proximityToStructuresFt', 'pc'],
  ['fuelType', 'fu'],
  ['linerType', 'ln'],
  ['expansionGapIn', 'eg'],
  ['mortarJointIn', 'mj'],
  ['orientation', 'or'],
  ['capOrientation', 'co'],
  ['bondPattern', 'bp'],
  ['ventCount', 'vc'],
  ['ventOpeningAreaSqIn', 'va'],
  ['gasLineEntryAngleDeg', 'ga'],
  ['capstoneOverhangIn', 'ov'],
  ['capPlacementMode', 'cp'],
  ['soilType', 'so'],
  ['drainageCondition', 'dr'],
  ['frostClimate', 'fc'],
  ['frostLineDepthIn', 'fd'],
  ['overheadClearanceFt', 'oc'],
  ['regionalCodeProfile', 'rc'],
  ['hoaConstraintLevel', 'ho'],
  ['gasHardwareTemplate', 'gh'],
  ['capstonePresetKey', 'ck'],
  ['brickPresetKey', 'bk'],
  ['customBrickLengthIn', 'bl'],
  ['customBrickWidthIn', 'bw'],
  ['customBrickHeightIn', 'bh'],
  ['customBrickInnerLengthIn', 'bil'],
  ['customBrickOuterLengthIn', 'bol'],
  ['customCapLengthIn', 'cl'],
  ['customCapWidthIn', 'cw'],
  ['customCapHeightIn', 'ch'],
  ['customCapInnerLengthIn', 'cil'],
  ['customCapOuterLengthIn', 'col'],
  ['wallCourseStrategy', 'ws'],
  ['shimUnitLengthIn', 'sl'],
  ['shimUnitWidthIn', 'sw'],
  ['shimUnitHeightIn', 'sh'],
  ['shimFrequency', 'sf'],
  ['shimMaxSharePct', 'sm'],
  ['accentJointMultiplier', 'aj'],
  ['accentCycleLength', 'ac'],
  ['accentCoursePosition', 'ap'],
  ['accentCourseOrientation', 'ao'],
  ['seatingGroundType', 'sg'],
  ['seatingAreaShape', 'ss'],
  ['seatingFurnitureStyle', 'st'],
  ['seatingDensity', 'sd'],
  ['seatingFurnitureCount', 'sn'],
  ['seatingAreaRadiusFt', 'sr'],
  ['naturalStoneType', 'nt'],
  ['stoneBuildMethod', 'sb'],
];

const NUMBER_SHARE_FIELDS = new Set<keyof MasonryInput>([
  'innerDiameterIn',
  'innerWidthIn',
  'innerDepthIn',
  'wallHeightIn',
  'proximityToStructuresFt',
  'expansionGapIn',
  'mortarJointIn',
  'ventCount',
  'ventOpeningAreaSqIn',
  'gasLineEntryAngleDeg',
  'capstoneOverhangIn',
  'frostLineDepthIn',
  'overheadClearanceFt',
  'customBrickLengthIn',
  'customBrickWidthIn',
  'customBrickHeightIn',
  'customBrickInnerLengthIn',
  'customBrickOuterLengthIn',
  'customCapLengthIn',
  'customCapWidthIn',
  'customCapHeightIn',
  'customCapInnerLengthIn',
  'customCapOuterLengthIn',
  'shimUnitLengthIn',
  'shimUnitWidthIn',
  'shimUnitHeightIn',
  'shimFrequency',
  'shimMaxSharePct',
  'accentJointMultiplier',
  'accentCycleLength',
  'accentCoursePosition',
  'seatingFurnitureCount',
  'seatingAreaRadiusFt',
]);

const BOOLEAN_SHARE_FIELDS = new Set<keyof MasonryInput>(['frostClimate']);

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeProjectForShare(
  input: MasonryInput,
  projectName: string,
): string {
  const payload = buildProjectFile(input, projectName);
  const json = JSON.stringify(payload);
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeSharedProject(
  token: string,
  defaults: MasonryInput,
): ReturnType<typeof parseProjectFile> {
  const bytes = base64UrlToBytes(token);
  const json = new TextDecoder().decode(bytes);
  return parseProjectFile(json, defaults);
}

export function buildCompactShareParams(
  input: MasonryInput,
  projectName: string,
  defaults: MasonryInput,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('sv', SHARE_VERSION);

  const trimmedProjectName = projectName.trim();
  if (trimmedProjectName) {
    params.set('n', trimmedProjectName.slice(0, 80));
  }

  SHARE_FIELD_MAP.forEach(([field, shortKey]) => {
    const value = input[field];
    const defaultValue = defaults[field];

    if (value === undefined || value === null) {
      return;
    }

    if (value === defaultValue) {
      return;
    }

    if (BOOLEAN_SHARE_FIELDS.has(field)) {
      params.set(shortKey, value ? '1' : '0');
      return;
    }

    params.set(shortKey, String(value));
  });

  return params;
}

export function decodeCompactSharedProjectFromParams(
  params: URLSearchParams,
  defaults: MasonryInput,
): ReturnType<typeof parseProjectFile> | null {
  if (params.get('sv') !== SHARE_VERSION) {
    return null;
  }

  const nextInput: MasonryInput = { ...defaults };
  const setField = <K extends keyof MasonryInput>(
    key: K,
    value: MasonryInput[K],
  ) => {
    nextInput[key] = value;
  };

  SHARE_FIELD_MAP.forEach(([field, shortKey]) => {
    if (!params.has(shortKey)) {
      return;
    }

    const raw = params.get(shortKey);
    if (raw === null) {
      return;
    }

    if (BOOLEAN_SHARE_FIELDS.has(field)) {
      setField(field, (raw === '1') as MasonryInput[typeof field]);
      return;
    }

    if (NUMBER_SHARE_FIELDS.has(field)) {
      const value = Number(raw);
      if (!Number.isNaN(value) && Number.isFinite(value)) {
        setField(field, value as MasonryInput[typeof field]);
      }
      return;
    }

    setField(field, raw as MasonryInput[typeof field]);
  });

  return {
    input: nextInput,
    projectName: params.get('n'),
    savedAt: null,
  };
}
