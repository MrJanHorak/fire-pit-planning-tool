import { describe, expect, it } from 'vitest';
import { DEFAULT_MASONRY_INPUT } from '../defaultInput';
import {
  FIREPIT_PROJECT_KIND,
  FIREPIT_PROJECT_VERSION,
  buildProjectFile,
  deleteStoredProjectSnapshot,
  parseProjectFile,
  parseProjectFileContent,
  readStoredProjectSnapshots,
  writeStoredProjectSnapshot,
} from '../projectFile';

const SNAPSHOT_STORAGE_KEY = 'firepit-project-test-snapshots';

describe('projectFile utilities', () => {
  it('stores and lists browser snapshots in reverse chronological order', () => {
    window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);

    const first = writeStoredProjectSnapshot(
      SNAPSHOT_STORAGE_KEY,
      DEFAULT_MASONRY_INPUT,
      'Patio One',
    );
    const second = writeStoredProjectSnapshot(
      SNAPSHOT_STORAGE_KEY,
      { ...DEFAULT_MASONRY_INPUT, innerDiameterIn: 42 },
      'Patio Two',
    );

    const snapshots = readStoredProjectSnapshots(SNAPSHOT_STORAGE_KEY);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].id).toBe(second.id);
    expect(snapshots[1].id).toBe(first.id);
    expect(snapshots[0].projectName).toBe('Patio Two');
  });

  it('deletes a stored browser snapshot by id', () => {
    window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);

    const snapshot = writeStoredProjectSnapshot(
      SNAPSHOT_STORAGE_KEY,
      DEFAULT_MASONRY_INPUT,
      'Delete Me',
    );

    deleteStoredProjectSnapshot(SNAPSHOT_STORAGE_KEY, snapshot.id);

    expect(readStoredProjectSnapshots(SNAPSHOT_STORAGE_KEY)).toHaveLength(0);
  });

  it('overwrites a stored browser snapshot in place when the same id is reused', () => {
    window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);

    const snapshot = writeStoredProjectSnapshot(
      SNAPSHOT_STORAGE_KEY,
      DEFAULT_MASONRY_INPUT,
      'Original Name',
    );

    const updated = writeStoredProjectSnapshot(
      SNAPSHOT_STORAGE_KEY,
      { ...DEFAULT_MASONRY_INPUT, innerDiameterIn: 48 },
      'Updated Name',
      snapshot.id,
    );

    const snapshots = readStoredProjectSnapshots(SNAPSHOT_STORAGE_KEY);

    expect(updated.id).toBe(snapshot.id);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].projectName).toBe('Updated Name');
    expect(snapshots[0].input.innerDiameterIn).toBe(48);
  });

  it('builds a versioned firepit project file wrapper', () => {
    const project = buildProjectFile(
      DEFAULT_MASONRY_INPUT,
      'Back Patio Firepit',
    );

    expect(project.kind).toBe(FIREPIT_PROJECT_KIND);
    expect(project.version).toBe(FIREPIT_PROJECT_VERSION);
    expect(project.projectName).toBe('Back Patio Firepit');
    expect(project.input.innerDiameterIn).toBe(36);
    expect(project.savedAt).toMatch(/T/);
  });

  it('parses wrapped project JSON with project name metadata', () => {
    const content = JSON.stringify(
      buildProjectFile(DEFAULT_MASONRY_INPUT, 'Lake House Ring'),
    );

    const parsed = parseProjectFile(content, DEFAULT_MASONRY_INPUT);

    expect(parsed.projectName).toBe('Lake House Ring');
    expect(parsed.input.innerDiameterIn).toBe(36);
    expect(parsed.savedAt).toMatch(/T/);
  });

  it('parses wrapped project JSON into MasonryInput', () => {
    const content = JSON.stringify(
      buildProjectFile({
        ...DEFAULT_MASONRY_INPUT,
        innerDiameterIn: 42,
        fuelType: 'wood',
      }),
    );

    const parsed = parseProjectFileContent(content, DEFAULT_MASONRY_INPUT);

    expect(parsed.innerDiameterIn).toBe(42);
    expect(parsed.fuelType).toBe('wood');
  });

  it('supports raw MasonryInput JSON and merges missing fields from defaults', () => {
    const content = JSON.stringify({
      innerDiameterIn: 44,
      planShape: 'circular',
      fuelType: 'propane',
    });

    const parsed = parseProjectFileContent(content, DEFAULT_MASONRY_INPUT);

    expect(parsed.innerDiameterIn).toBe(44);
    expect(parsed.wallHeightIn).toBe(DEFAULT_MASONRY_INPUT.wallHeightIn);
    expect(parsed.brickPresetKey).toBe(DEFAULT_MASONRY_INPUT.brickPresetKey);
  });

  it('treats missing project name metadata as backward-compatible', () => {
    const content = JSON.stringify({
      kind: FIREPIT_PROJECT_KIND,
      version: FIREPIT_PROJECT_VERSION,
      savedAt: new Date().toISOString(),
      input: DEFAULT_MASONRY_INPUT,
    });

    const parsed = parseProjectFile(content, DEFAULT_MASONRY_INPUT);

    expect(parsed.projectName).toBeNull();
    expect(parsed.savedAt).toMatch(/T/);
  });

  it('rejects unsupported wrapped file types', () => {
    const content = JSON.stringify({
      kind: 'other-project',
      version: 1,
      input: DEFAULT_MASONRY_INPUT,
    });

    expect(() =>
      parseProjectFileContent(content, DEFAULT_MASONRY_INPUT),
    ).toThrow('Unsupported project file type.');
  });
});
