import { describe, expect, it } from 'vitest';
import { MasonryEngine } from '../../engine/MasonryEngine';
import type { MasonryInput } from '../../types';
import {
  buildConstructionPacketHtml,
  buildCoursePlanSvg,
  buildSafetyClearanceSvg,
} from '../constructionPacket';

const input: MasonryInput = {
  planShape: 'circular',
  innerDiameterIn: 36,
  innerWidthIn: 36,
  innerDepthIn: 30,
  wallHeightIn: 18,
  proximityToStructuresFt: 8,
  fuelType: 'propane',
  linerType: 'steel-ring',
  expansionGapIn: 0.5,
  mortarJointIn: 0.375,
  orientation: 'stretcher',
  bondPattern: 'running-bond',
  ventCount: 4,
  ventOpeningAreaSqIn: 5,
  gasLineEntryAngleDeg: 225,
  capstoneOverhangIn: 2,
  capPlacementMode: 'outward-only',
  soilType: 'clay-expansive',
  drainageCondition: 'slow-draining',
  frostClimate: true,
  capstonePresetKey: 'matching',
};

describe('construction packet export', () => {
  it('builds SVG with course labels', () => {
    const output = new MasonryEngine().calculateDesign(input);
    const svg = buildCoursePlanSvg(output);

    expect(svg).toContain('<svg');
    expect(svg).toContain('C1');
    expect(svg).toContain('CAP');
  });

  it('annotates special course strategies in SVG output', () => {
    const output = new MasonryEngine().calculateDesign({
      ...input,
      wallCourseStrategy: 'vented-accent',
      accentCycleLength: 3,
      accentCoursePosition: 2,
    });
    const svg = buildCoursePlanSvg(output);

    expect(svg).toContain('(ACCENT)');
    expect(svg).toContain('Vented accent course');
    expect(svg).toContain('Standard course units remain brown');
  });

  it('builds packet HTML with quantities and safety section', () => {
    const packetInput = { ...input, gasLineEntryAngleDeg: 0 };
    const output = new MasonryEngine().calculateDesign(packetInput);
    const html = buildConstructionPacketHtml(packetInput, output);

    expect(html).toContain('Fire Pit Build Packet');
    expect(html).toContain('Bricks To Buy');
    expect(html).toContain('Main Wall Units');
    expect(html).toContain('Spacer Units');
    expect(html).toContain('Accent Course Units');
    expect(html).toContain('Safety Review');
    expect(html).toContain('Minimum horizontal clearance is 10 ft');
    expect(html).toContain('print-break-before');
    expect(html).toContain('10 ft Clearance Ring Diagram');
    expect(html).toContain('Status = FAIL');
    expect(html).toContain('Capstone Overhang');
    expect(html).toContain('Cap Units per Course');
    expect(html).toContain('Venting And Heat Protection');
    expect(html).toContain('Liner venting note');
    expect(html).toContain('Gas Line Entry');
    expect(html).toContain('Heat Protection');
    expect(html).toContain('Plan Shape');
    expect(html).toContain('auto-adjusted');
    expect(html).toContain('Cap Placement');
    expect(html).toContain('Cap Size');
    expect(html).toContain('Cap Layout');
    expect(html).toContain('Cap Joint At Fire Opening');
    expect(html).toContain('Cap Joint At Outside Edge');
    expect(html).toContain('Capstone inner-edge overlap detected');
    expect(html).toContain(
      'Approximate pit inner diameter for no cap taper cuts',
    );
    expect(html).toContain('Cutting Notes');
    expect(html).toContain('Suggested taper');
    expect(html).toContain('Cut Schedule');
    expect(html).toContain('Main Units');
    expect(html).toContain('Spacer Units');
    expect(html).toContain('Accent Units');
    expect(html).toContain('Cut Bricks');
    expect(html).toContain('Course Start');
    expect(html).toContain('Course legend: C1 is the bottom wall course');
    expect(html).toContain('Suggested saw angle');
    expect(html).toContain('Sample Wall Brick Taper Cut');
    expect(html).toContain('Wall Brick Cut Detail');
    expect(html).toContain('Capstone Placement Detail');
    expect(html).toContain('This section covers wall brick taper cuts only');
    expect(html).toContain('Capstone taper cuts required here');
    expect(html).toContain('Cap side cut A');
    expect(html).toContain('Foundation Review');
    expect(html).toContain('High foundation review priority');
    expect(html).toContain('Freeze-thaw climate: Yes');
    expect(html).toContain('Build Sequence');
    expect(html).toContain('Call for utility locates');
    expect(html).toContain('Foundation review status');
    expect(html).toContain('Follow the mortar manufacturer');
  });

  it('uses width and depth text for rectangular plans', () => {
    const output = new MasonryEngine().calculateDesign({
      ...input,
      planShape: 'rectangular',
      innerWidthIn: 48,
      innerDepthIn: 30,
    });
    const html = buildConstructionPacketHtml(
      {
        ...input,
        planShape: 'rectangular',
        innerWidthIn: 48,
        innerDepthIn: 30,
      },
      output,
    );

    expect(html).toContain('Rectangular');
    expect(html).toContain('48.00 in x 30.00 in');
  });

  it('builds clearance diagram with pass status when distance meets code', () => {
    const output = new MasonryEngine().calculateDesign({
      ...input,
      proximityToStructuresFt: 12,
    });
    const svg = buildSafetyClearanceSvg(
      { ...input, proximityToStructuresFt: 12 },
      output,
    );

    expect(svg).toContain('10 ft Clearance Ring Diagram');
    expect(svg).toContain('Status = PASS');
  });

  it('changes clearance marker position when proximity changes', () => {
    const nearOutput = new MasonryEngine().calculateDesign({
      ...input,
      proximityToStructuresFt: 10,
    });
    const farOutput = new MasonryEngine().calculateDesign({
      ...input,
      proximityToStructuresFt: 24,
    });

    const nearSvg = buildSafetyClearanceSvg(
      { ...input, proximityToStructuresFt: 10 },
      nearOutput,
    );
    const farSvg = buildSafetyClearanceSvg(
      { ...input, proximityToStructuresFt: 24 },
      farOutput,
    );

    expect(nearSvg).not.toBe(farSvg);
    expect(nearSvg).toContain('Scale shown: 0 to');
    expect(farSvg).toContain('Scale shown: 0 to');
  });

  it('uses a shape-aware offset diagram for rectangular plans', () => {
    const rectangularInput = {
      ...input,
      planShape: 'rectangular' as const,
      innerWidthIn: 48,
      innerDepthIn: 30,
      proximityToStructuresFt: 12,
    };
    const output = new MasonryEngine().calculateDesign(rectangularInput);
    const svg = buildSafetyClearanceSvg(rectangularInput, output);

    expect(svg).toContain('10 ft Clearance Offset Diagram');
    expect(svg).toContain('Plan shape = rectangular');
    expect(svg).toContain('Outer footprint =');
    expect(svg).toContain('<rect');
  });
});
