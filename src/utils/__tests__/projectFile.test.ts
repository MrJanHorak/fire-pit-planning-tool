import { describe, expect, it } from 'vitest';
import { DEFAULT_MASONRY_INPUT } from '../defaultInput';
import {
  FIREPIT_PROJECT_KIND,
  FIREPIT_PROJECT_VERSION,
  buildProjectFile,
  parseProjectFile,
  parseProjectFileContent,
} from '../projectFile';

describe('projectFile utilities', () => {
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
