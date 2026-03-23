import type { MasonryInput, MasonryOutput } from '../types';

function formatFuelName(fuelType: MasonryInput['fuelType']): string {
  if (fuelType === 'natural-gas') {
    return 'Natural Gas';
  }
  if (fuelType === 'propane') {
    return 'Propane';
  }
  return 'Wood';
}

function formatLinerName(type: MasonryOutput['linerSpec']['type']): string {
  if (type === 'fire-brick') {
    return 'Fire Brick';
  }
  if (type === 'steel-ring') {
    return 'Steel Ring';
  }
  return 'None';
}

function formatShapeName(shape: MasonryInput['planShape']): string {
  return shape.charAt(0).toUpperCase() + shape.slice(1);
}

function getCapstoneCutMetrics(output: MasonryOutput): {
  requiresCutting: boolean;
  recommendedTaperPerUnitIn: number;
  recommendedCutPerSideIn: number;
  recommendedCutAngleDeg: number;
  minimumRecommendedPitInnerDiameterIn: number;
} {
  const requiresCutting =
    output.planShape === 'circular' && output.capstone.requiresTaperCutting;
  const capCount = Math.max(1, output.capstone.capUnitsPerCourseRounded);
  const radiusIn = output.capstone.capInnerDiameterIn / 2;
  const moduleSpacingIn =
    (Math.PI * output.capstone.capCenterlineDiameterIn) / capCount;
  const chordIn =
    radiusIn > 0
      ? 2 * radiusIn * Math.sin(moduleSpacingIn / (2 * radiusIn))
      : output.resolvedCapUnit.lengthIn;
  const chordDeficitIn = Math.max(0, output.resolvedCapUnit.lengthIn - chordIn);
  const recommendedTaperPerUnitIn = Math.max(
    0,
    -output.capstone.joint.innerJointIn,
    chordDeficitIn,
  );
  const recommendedCutPerSideIn = recommendedTaperPerUnitIn / 2;
  const capDepthIn = Math.max(0.001, output.capstone.capCourseWidthIn);
  const recommendedCutAngleDeg =
    (Math.atan(recommendedCutPerSideIn / capDepthIn) * 180) / Math.PI;
  const targetInnerJointIn = 0.125;
  const minCapInnerDiameterIn =
    (output.capstone.capUnitsPerCourseRounded *
      (output.resolvedCapUnit.lengthIn + targetInnerJointIn)) /
    Math.PI;
  const minimumRecommendedPitInnerDiameterIn =
    minCapInnerDiameterIn + output.capstone.innerExtensionIn * 2;

  return {
    requiresCutting,
    recommendedTaperPerUnitIn,
    recommendedCutPerSideIn,
    recommendedCutAngleDeg,
    minimumRecommendedPitInnerDiameterIn,
  };
}

function buildCutScheduleTable(output: MasonryOutput): string {
  const rows = output.courses
    .map((course) => {
      const ventOpenings = output.ventSpec.targetCourseIndexes.includes(
        course.courseIndex,
      )
        ? output.ventSpec.ventBrickIndexes.length
        : 0;
      const taperUnits = output.cutPlan.requiresCutting
        ? Math.max(0, course.unitCount - ventOpenings)
        : 0;
      const fullUnits = Math.max(
        0,
        course.unitCount - taperUnits - ventOpenings,
      );
      const offsetLabel =
        course.offsetIn > 0 ? 'Half-module start' : 'Standard start';

      return `<tr>
        <td>C${course.courseIndex + 1}</td>
        <td>${course.unitCount}</td>
        <td>${fullUnits}</td>
        <td>${taperUnits}</td>
        <td>${ventOpenings}</td>
        <td>${output.cutPlan.requiresCutting ? `${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in per side` : 'None'}</td>
        <td>${offsetLabel}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>Course</th>
        <th>Total Units</th>
        <th>Full Units</th>
        <th>Taper Units</th>
        <th>Vent Openings</th>
        <th>Cut Per Side</th>
        <th>Bond Start</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function buildWallBrickTaperCutSvg(output: MasonryOutput): string {
  if (!output.cutPlan.requiresCutting) {
    return '';
  }

  const angle = output.cutPlan.recommendedCutAngleDeg.toFixed(2);
  const cutPerSide = output.cutPlan.recommendedCutPerSideIn.toFixed(3);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 220" width="100%" role="img" aria-label="Wall brick taper cut diagram">
    <rect x="0" y="0" width="620" height="220" fill="#fffdf7" />
    <text x="14" y="24" font-size="16" fill="#2f2110" font-weight="700">Sample Wall Brick Taper Cut (Plan View)</text>
    <text x="14" y="44" font-size="12" fill="#4a3720">Applies to circular WALL courses only (not capstone units).</text>

    <polygon points="160,92 470,92 430,160 200,160" fill="#d7a97a" stroke="#6e4728" stroke-width="2" />

    <line x1="160" y1="92" x2="200" y2="160" stroke="#a01d1d" stroke-width="3" />
    <line x1="470" y1="92" x2="430" y2="160" stroke="#a01d1d" stroke-width="3" />

    <line x1="52" y1="116" x2="158" y2="124" stroke="#a01d1d" stroke-width="1.5" />
    <line x1="566" y1="116" x2="472" y2="124" stroke="#a01d1d" stroke-width="1.5" />
    <text x="16" y="96" font-size="12" fill="#a01d1d">Side cut A: ${cutPerSide} in</text>
    <text x="16" y="114" font-size="12" fill="#a01d1d">Angle: ${angle} deg</text>
    <text x="444" y="96" font-size="12" fill="#a01d1d">Side cut B: ${cutPerSide} in</text>
    <text x="471" y="114" font-size="12" fill="#a01d1d">Angle: ${angle} deg</text>

    <text x="274" y="78" font-size="12" fill="#4a3720">Outer face (long edge)</text>
    <text x="258" y="188" font-size="12" fill="#4a3720">Inner face (short edge)</text>

    <text x="14" y="206" font-size="12" fill="#2f2110" font-weight="700">Only 2 cuts total: one per side edge. No cuts on inner/outer faces.</text>
  </svg>`;
}

export function buildCapstonePlacementSampleSvg(output: MasonryOutput): string {
  const capCut = getCapstoneCutMetrics(output);
  if (output.planShape !== 'circular') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 220" width="100%" role="img" aria-label="Capstone placement detail diagram">
      <rect x="0" y="0" width="620" height="220" fill="#fffdf7" />
      <text x="14" y="24" font-size="16" fill="#2f2110" font-weight="700">Capstone Placement Detail (Plan View)</text>
      <text x="14" y="48" font-size="12" fill="#4a3720">Rectangular and square plans use uniform cap joints at corners and straight runs.</text>
      <rect x="140" y="78" width="140" height="70" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
      <rect x="340" y="78" width="140" height="70" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
      <rect x="280" y="78" width="60" height="70" fill="#c6b39a" stroke="#4a3a28" stroke-width="1.5" />
      <text x="246" y="172" font-size="12" fill="#4a3720">Capstone unit</text>
      <text x="355" y="172" font-size="12" fill="#4a3720">Capstone unit</text>
      <text x="278" y="66" font-size="12" fill="#4a3720">Resolved cap joint</text>
      <text x="14" y="206" font-size="12" fill="#2f2110" font-weight="700">This detail is for cap placement only; no taper saw cuts are implied here.</text>
    </svg>`;
  }

  const innerJoint = output.capstone.joint.innerJointIn.toFixed(3);
  const outerJoint = output.capstone.joint.outerJointIn.toFixed(3);
  const capCutPerSide = capCut.recommendedCutPerSideIn.toFixed(3);
  const capCutAngle = capCut.recommendedCutAngleDeg.toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 220" width="100%" role="img" aria-label="Capstone placement detail diagram">
    <rect x="0" y="0" width="620" height="220" fill="#fffdf7" />
    <text x="14" y="24" font-size="16" fill="#2f2110" font-weight="700">Capstone Placement Detail (Plan View)</text>
    <text x="14" y="44" font-size="12" fill="#4a3720">Capstone units shown in a level plan view with a wedge-shaped mortar joint between them.</text>

    <polygon points="150,95 300,95 282,165 170,165" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
    <polygon points="372,95 500,95 480,165 324,165" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
    <polygon points="300,95 372,95 324,165 282,165" fill="#c6b39a" stroke="#4a3a28" stroke-width="1.5" />

    ${
      capCut.requiresCutting
        ? `<line x1="150" y1="95" x2="170" y2="165" stroke="#a01d1d" stroke-width="3" />
    <line x1="300" y1="95" x2="282" y2="165" stroke="#a01d1d" stroke-width="3" />
    <text x="18" y="102" font-size="12" fill="#a01d1d">Cap side cut A: ${capCutPerSide} in</text>
    <text x="18" y="120" font-size="12" fill="#a01d1d">Angle: ${capCutAngle} deg</text>
    <text x="18" y="138" font-size="12" fill="#a01d1d">Cap side cut B: ${capCutPerSide} in</text>`
        : ''
    }

    <text x="188" y="184" font-size="12" fill="#4a3720">Capstone unit</text>
    <text x="392" y="184" font-size="12" fill="#4a3720">Capstone unit</text>
    <text x="296" y="80" font-size="12" fill="#4a3720">Outer cap joint: ${outerJoint} in</text>
    <text x="288" y="198" font-size="12" fill="#4a3720">Inner cap joint: ${innerJoint} in</text>

    <text x="14" y="206" font-size="12" fill="#2f2110" font-weight="700">${capCut.requiresCutting ? `Capstone taper cuts required here (about ${capCutPerSide} in per side at ${capCutAngle} deg).` : 'Capstone taper cuts are not required at this size.'}</text>
  </svg>`;
}

function buildDiyStepsHtml(input: MasonryInput, output: MasonryOutput): string {
  const capCut = getCapstoneCutMetrics(output);
  const ventCourses = output.ventSpec.targetCourseIndexes
    .map((courseIndex) => `C${courseIndex + 1}`)
    .join(', ');
  const linerStep = output.linerSpec.enabled
    ? `Install the ${formatLinerName(output.linerSpec.type).toLowerCase()} liner after the wall is stable. Maintain the specified ${output.linerSpec.expansionGapIn.toFixed(3)} in expansion gap around the liner.`
    : input.fuelType === 'wood'
      ? 'Add a refractory liner or steel fire ring before first use. Wood-burning pits should not be operated without a thermal liner.'
      : 'No dedicated liner is specified for this build. Verify your burner manufacturer requirements before operation.';
  const capDirectionNote =
    output.planShape === 'circular'
      ? capCut.requiresCutting
        ? `Capstone units at this diameter also require taper cuts. Remove approximately ${capCut.recommendedCutPerSideIn.toFixed(3)} in per side at about ${capCut.recommendedCutAngleDeg.toFixed(2)} deg off square so cap inner edges do not overlap.`
        : `When setting cap units, keep the narrow mortar edge toward the fire opening and the wider mortar edge toward the outside. This build uses an inner cap joint of ${output.capstone.joint.innerJointIn.toFixed(3)} in and an outer cap joint of ${output.capstone.joint.outerJointIn.toFixed(3)} in.`
      : `Set cap units with a target joint width of ${output.capstone.joint.actualJointIn.toFixed(3)} in and confirm corners stay square.`;
  const cutStep = output.cutPlan.requiresCutting
    ? `Cut wall bricks as wedges before installation. Remove approximately ${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in from each side of the inner face and set the saw to about ${output.cutPlan.recommendedCutAngleDeg.toFixed(2)} deg off square.`
    : 'Dry-fit the first full course and confirm joints remain consistent before mixing mortar.';

  const steps = [
    `Call for utility locates, verify the firepit location, and confirm at least 10 ft of clearance from combustible structures.`,
    `Mark the excavation using the foundation footprint of ${output.foundation.footprintWidthIn.toFixed(2)} in x ${output.foundation.footprintDepthIn.toFixed(2)} in. Mark the wall footprint and cap outline separately so layout stays centered.`,
    `Excavate for the base and install ${output.foundation.stoneDepthIn} in of compacted angular stone. Screed the surface level before starting the first masonry course.`,
    `Dry-lay Course C1 with ${output.unitsPerCourseRounded} units around the ${formatShapeName(output.planShape).toLowerCase()} centerline. Use the resolved wall unit dimensions and hold mortar joints to ${output.mortarJointIn.toFixed(3)} in.`,
    cutStep,
    `Lay the wall courses to a total of ${output.courses.length} courses. Keep running bond by starting every other course with a half-module offset of ${output.courses[1]?.offsetIn.toFixed(3) ?? '0.000'} in.`,
    `Leave vent openings in ${ventCourses} at brick indexes ${output.ventSpec.ventBrickIndexes.join(', ')}. This provides ${output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in of vent area for the selected ${formatFuelName(input.fuelType).toLowerCase()} configuration.`,
    linerStep,
    `Set the cap course with ${output.capstone.capUnitsPerCourseRounded} units on the cap centerline. Maintain a centerline cap joint of ${output.capstone.joint.actualJointIn.toFixed(3)} in.`,
    capDirectionNote,
    `Tool exposed joints, clean mortar smears before they harden, and protect the installation while mortar cures. Follow the mortar manufacturer's cure window before loading the wall or applying sustained heat.`,
    `Before first burn, verify the vent path is unobstructed, the liner is seated correctly, the cap units are stable, and the safety clearance remains unchanged at the installed location.`,
  ];

  return `<ol>${steps.map((step) => `<li>${step}</li>`).join('')}</ol>`;
}

export function buildCoursePlanSvg(output: MasonryOutput): string {
  const rowHeight = 26;
  const svgHeight = (output.courses.length + 1) * rowHeight + 28;

  const rows = output.courses
    .map((course, idx) => {
      const y = 18 + idx * rowHeight;
      const modulePx = 48;
      const offsetPx = course.offsetIn > 0 ? modulePx / 2 : 0;
      const ventCourse = output.ventSpec.targetCourseIndexes.includes(
        course.courseIndex,
      );
      const gasLineCourse =
        output.ventSpec.gasLineEntryBrickIndex !== undefined &&
        course.courseIndex === 0;

      const bricks = Array.from({ length: course.unitCount }, (_, brickIdx) => {
        const isVentBrick =
          ventCourse && output.ventSpec.ventBrickIndexes.includes(brickIdx);
        const isGasLineBrick =
          gasLineCourse && brickIdx === output.ventSpec.gasLineEntryBrickIndex;
        const fill = isGasLineBrick
          ? '#2b6f9b'
          : isVentBrick
            ? '#c13a1f'
            : '#b66a34';
        const opacity = isGasLineBrick || isVentBrick ? '0.9' : '0.72';

        return `<rect x="${52 + offsetPx + brickIdx * modulePx}" y="${y}" width="${modulePx - 4}" height="16" rx="2" fill="${fill}" opacity="${opacity}" />`;
      }).join('');

      return `<g><text x="8" y="${y + 13}" font-size="11" fill="#3c2a11">C${course.courseIndex + 1}</text>${bricks}</g>`;
    })
    .join('');

  const capY = 18 + output.courses.length * rowHeight;
  const capModulePx = 48;
  const capBricks = Array.from(
    { length: output.capstone.capUnitsPerCourseRounded },
    (_, capIdx) =>
      `<rect x="${52 + capIdx * capModulePx}" y="${capY}" width="${capModulePx - 4}" height="16" rx="2" fill="#ccb085" opacity="0.9" />`,
  ).join('');
  const capRow = `<g><text x="8" y="${capY + 13}" font-size="11" fill="#3c2a11">CAP</text>${capBricks}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 ${svgHeight}" width="940" height="${svgHeight}">${rows}${capRow}</svg>`;
}

export function buildSafetyClearanceSvg(
  input: MasonryInput,
  output: MasonryOutput,
): string {
  const requiredClearanceIn = 120;
  const actualClearanceIn = input.proximityToStructuresFt * 12;
  const pitOuterWidthIn = output.outerSpanWidthIn;
  const pitOuterDepthIn = output.outerSpanDepthIn;

  const displayRadius = 168;
  const centerX = 190;
  const centerY = 190;
  const maxExtentIn = Math.max(
    requiredClearanceIn + pitOuterWidthIn / 2,
    requiredClearanceIn + pitOuterDepthIn / 2,
    actualClearanceIn,
  );
  const ringScale = displayRadius / (maxExtentIn * 1.06);
  const pitWidthPx = Math.max(18, pitOuterWidthIn * ringScale);
  const pitDepthPx = Math.max(18, pitOuterDepthIn * ringScale);
  const pitRadiusPx = Math.max(pitWidthPx, pitDepthPx) / 2;
  const requiredOffsetPx = requiredClearanceIn * ringScale;
  const actualRadiusPx = Math.max(0, actualClearanceIn * ringScale);
  const structureX = centerX + actualRadiusPx;
  const safetyPass = input.proximityToStructuresFt >= 10;
  const maxDisplayFt = maxExtentIn / 12;
  const safeZoneFill = safetyPass ? '#2f6d3f14' : '#a01d1d14';
  const isCircular = output.planShape === 'circular';
  const footprintLabel =
    output.planShape === 'circular'
      ? `Outer pit diameter = ${output.effectiveOuterDiameterIn.toFixed(2)} in`
      : `Outer footprint = ${output.outerSpanWidthIn.toFixed(2)} in x ${output.outerSpanDepthIn.toFixed(2)} in`;

  const requiredBoundary = isCircular
    ? `<circle cx="${centerX}" cy="${centerY}" r="${requiredOffsetPx}" fill="${safeZoneFill}" stroke="none" />
       <circle cx="${centerX}" cy="${centerY}" r="${requiredOffsetPx}" fill="none" stroke="#a94d24" stroke-width="2" stroke-dasharray="7 5" />`
    : `<rect x="${centerX - (pitWidthPx + requiredOffsetPx * 2) / 2}" y="${centerY - (pitDepthPx + requiredOffsetPx * 2) / 2}" width="${pitWidthPx + requiredOffsetPx * 2}" height="${pitDepthPx + requiredOffsetPx * 2}" rx="${output.planShape === 'square' ? 6 : 3}" fill="${safeZoneFill}" stroke="none" />
       <rect x="${centerX - (pitWidthPx + requiredOffsetPx * 2) / 2}" y="${centerY - (pitDepthPx + requiredOffsetPx * 2) / 2}" width="${pitWidthPx + requiredOffsetPx * 2}" height="${pitDepthPx + requiredOffsetPx * 2}" rx="${output.planShape === 'square' ? 6 : 3}" fill="none" stroke="#a94d24" stroke-width="2" stroke-dasharray="7 5" />`;

  const pitFootprint = isCircular
    ? `<circle cx="${centerX}" cy="${centerY}" r="${pitRadiusPx}" fill="#9d5a2b" opacity="0.85" />`
    : `<rect x="${centerX - pitWidthPx / 2}" y="${centerY - pitDepthPx / 2}" width="${pitWidthPx}" height="${pitDepthPx}" rx="${output.planShape === 'square' ? 4 : 2}" fill="#9d5a2b" opacity="0.85" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" width="640" height="380">
    <rect x="0" y="0" width="640" height="380" fill="#fffdf7" />
    <text x="18" y="28" font-size="15" fill="#2f2110" font-weight="700">10 ft Clearance ${isCircular ? 'Ring' : 'Offset'} Diagram</text>
    <text x="18" y="48" font-size="12" fill="#4a3720">Required setback from combustible structures is 10 ft minimum. Diagram matches the selected plan shape.</text>

    ${requiredBoundary}
    ${pitFootprint}
    <line x1="${centerX}" y1="${centerY}" x2="${structureX}" y2="${centerY}" stroke="${safetyPass ? '#2f6d3f' : '#a01d1d'}" stroke-width="3" />
    <circle cx="${structureX}" cy="${centerY}" r="7" fill="${safetyPass ? '#2f6d3f' : '#a01d1d'}" />

    <text x="18" y="364" font-size="11" fill="#6b5033">Scale shown: 0 to ${maxDisplayFt.toFixed(1)} ft radius</text>

    <text x="390" y="138" font-size="12" fill="#4a3720">Dashed ${isCircular ? 'ring' : 'offset boundary'} = 10 ft required</text>
    <text x="390" y="160" font-size="12" fill="#4a3720">Actual distance = ${input.proximityToStructuresFt.toFixed(2)} ft</text>
    <text x="390" y="182" font-size="12" fill="#4a3720">${footprintLabel}</text>
    <text x="390" y="204" font-size="12" fill="#4a3720">Plan shape = ${output.planShape}</text>
    <text x="390" y="226" font-size="12" fill="${safetyPass ? '#2f6d3f' : '#a01d1d'}">Status = ${safetyPass ? 'PASS' : 'FAIL'}</text>
  </svg>`;
}

export function buildConstructionPacketHtml(
  input: MasonryInput,
  output: MasonryOutput,
): string {
  const capCut = getCapstoneCutMetrics(output);
  const svg = buildCoursePlanSvg(output);
  const clearanceSvg = buildSafetyClearanceSvg(input, output);
  const warnings =
    output.warnings.length > 0
      ? `<ul>${output.warnings.map((warning) => `<li>${warning.message}${warning.actualValue !== undefined ? ` Entered: ${warning.actualValue.toFixed(1)}${warning.code === 'clearance-too-low' ? ' ft' : warning.code === 'gas-line-near-vent' ? ' deg' : ''}.` : ''}</li>`).join('')}</ul>`
      : '<p>No safety clearance warnings.</p>';
  const ventRange =
    output.ventSpec.recommendedAreaMaxSqIn === undefined
      ? `${output.ventSpec.recommendedAreaMinSqIn.toFixed(1)}+`
      : `${output.ventSpec.recommendedAreaMinSqIn.toFixed(1)}-${output.ventSpec.recommendedAreaMaxSqIn.toFixed(1)}`;
  const gasLineEntry =
    output.ventSpec.gasLineEntryAngleDeg === undefined
      ? '<p>Gas Line Entry: not applicable for wood-burning configuration.</p>'
      : `<p>Gas Line Entry: ${output.ventSpec.gasLineEntryAngleDeg.toFixed(0)} deg at brick ${output.ventSpec.gasLineEntryBrickIndex} (${output.ventSpec.gasLineEntryClear ? 'clear of vents' : 'conflicts with vent layout'}${output.ventSpec.gasLineAutoAdjusted ? ', auto-adjusted' : ''}).</p>`;
  const taperCutSample = buildWallBrickTaperCutSvg(output);
  const capstonePlacementSample = buildCapstonePlacementSampleSvg(output);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Firepit Construction Packet</title>
    <style>
      body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #221707; }
      h1, h2 { margin: 0 0 10px; }
      .heading { margin-bottom: 14px; }
      .block { border: 1px solid #b9a17a; border-radius: 8px; padding: 12px; margin-bottom: 14px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      p { margin: 6px 0; }
      ul { margin: 8px 0 0 18px; }
      ol { margin: 8px 0 0 20px; padding: 0; }
      li { margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
      th, td { border: 1px solid #cbb08a; padding: 6px 8px; text-align: left; }
      th { background: #f6ebda; }
      .print-break-before { page-break-before: always; break-before: page; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
      @media print {
        @page { size: letter portrait; margin: 0.45in; }
        body { margin: 0; }
        .block { border-color: #8d7350; }
      }
    </style>
  </head>
  <body>
    <div class="heading avoid-break">
      <h1>Parametric Masonry Designer - Construction Packet</h1>
      <p>Generated for a ${formatShapeName(input.planShape)} plan with ${output.innerSpanWidthIn.toFixed(2)} in x ${output.innerSpanDepthIn.toFixed(2)} in inner dimensions.</p>
    </div>

    <section class="block avoid-break">
      <h2>Engineering Inputs</h2>
      <div class="grid">
        <p>Fuel Type: ${formatFuelName(input.fuelType)}</p>
        <p>Plan Shape: ${formatShapeName(input.planShape)}</p>
        <p>Resolved Unit: ${output.resolvedUnit.name} ${output.resolvedUnit.lengthIn.toFixed(3)} in x ${output.resolvedUnit.widthIn.toFixed(3)} in x ${output.resolvedUnit.heightIn.toFixed(3)} in</p>
        <p>Mortar Joint: ${input.mortarJointIn.toFixed(3)} in</p>
        <p>Wall Height: ${input.wallHeightIn.toFixed(2)} in</p>
        <p>Structure Proximity: ${input.proximityToStructuresFt.toFixed(2)} ft</p>
        <p>Capstone Overhang: ${input.capstoneOverhangIn.toFixed(2)} in</p>
        <p>Cap Placement Mode: ${input.capPlacementMode}</p>
        <p>Capstone Unit: ${output.resolvedCapUnit.name} ${output.resolvedCapUnit.lengthIn.toFixed(3)} in x ${output.resolvedCapUnit.widthIn.toFixed(3)} in x ${output.resolvedCapUnit.heightIn.toFixed(3)} in</p>
        <p>Thermal Liner: ${formatLinerName(output.linerSpec.type)}</p>
        <p>Expansion Gap: ${output.linerSpec.expansionGapIn.toFixed(3)} in</p>
      </div>
    </section>

    <section class="block avoid-break">
      <h2>Quantities</h2>
      <div class="grid">
        <p>Units per Course: ${output.unitsPerCourseRounded}</p>
        <p>Total Units: ${output.totalUnits}</p>
        <p>Purchased Units (${output.logistics.wasteFactorPct}% waste): ${output.logistics.purchasedUnits}</p>
        <p>Cap Units: ${output.capstone.capUnitsPerCourseRounded}</p>
        <p>Purchased Cap Units: ${output.logistics.purchasedCapUnits}</p>
        <p>Capstone Outer Diameter: ${output.capstone.capOuterDiameterIn.toFixed(2)} in</p>
        <p>Capstone Weight: ${output.logistics.estimatedCapWeightLb.toFixed(1)} lb</p>
        <p>Mortar Volume: ${output.logistics.estimatedMortarVolumeCubicFeet.toFixed(2)} ft3</p>
        <p>Foundation Stone: ${output.foundation.stoneVolumeCubicYards.toFixed(3)} yd3</p>
        <p>Footprint: ${output.foundation.footprintWidthIn.toFixed(2)} in x ${output.foundation.footprintDepthIn.toFixed(2)} in</p>
      </div>
    </section>

    <section class="block avoid-break">
      <h2>Capstone Joint Plan</h2>
      <div class="grid">
        <p>Cap centerline joint: ${output.capstone.joint.actualJointIn.toFixed(3)} in</p>
        <p>Cap module spacing: ${output.capstone.joint.actualModuleSpacingIn.toFixed(3)} in</p>
        <p>Inner cap joint: ${output.capstone.joint.innerJointIn.toFixed(3)} in</p>
        <p>Outer cap joint: ${output.capstone.joint.outerJointIn.toFixed(3)} in</p>
      </div>
      <p>${output.planShape === 'circular' ? (capCut.requiresCutting ? `Capstone inner-edge overlap detected. Taper each cap unit by about ${capCut.recommendedCutPerSideIn.toFixed(3)} in per side at ${capCut.recommendedCutAngleDeg.toFixed(2)} deg.` : 'Capstone joints are buildable without taper cuts at this current diameter.') : 'Cap joints are shown at their resolved installed width.'}</p>
      ${output.planShape === 'circular' ? `<p>Approximate pit inner diameter for no cap taper cuts at this cap count: ${capCut.minimumRecommendedPitInnerDiameterIn.toFixed(2)} in.</p>` : ''}
      <h3>Capstone Placement Detail</h3>
      ${capstonePlacementSample}
    </section>

    <section class="block avoid-break">
      <h2>Vent and Liner Plan</h2>
      <div class="grid">
        <p>Vent Layout: ${output.ventSpec.layout}</p>
        <p>Vent Placement: ${output.ventSpec.placement}</p>
        <p>Vent Count: ${output.ventSpec.ventCount}</p>
        <p>Open Area: ${output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in</p>
        <p>Recommended Gas Range: ${ventRange} sq in</p>
        <p>Vent Brick Indexes: ${output.ventSpec.ventBrickIndexes.join(', ')}</p>
      </div>
      ${gasLineEntry}
      <p>Liner Detail: ${output.linerSpec.description}</p>
      ${output.linerSpec.enabled ? `<p>Liner Outer Diameter: ${output.linerSpec.linerOuterDiameterIn.toFixed(2)} in. Liner Inner Diameter: ${output.linerSpec.linerInnerDiameterIn.toFixed(2)} in.</p>` : ''}
    </section>

    <section class="block avoid-break">
      <h2>Cut Guidance</h2>
      <p>This section covers wall brick taper cuts only. Capstones are documented in the Capstone Joint Plan section.</p>
      <p>Centerline spacing per unit: ${output.cutPlan.centerlineModuleSpacingIn.toFixed(3)} in</p>
      <p>Inner-face joint estimate: ${output.cutPlan.innerJointIn.toFixed(3)} in</p>
      <p>Cutting required: ${output.cutPlan.requiresCutting ? 'Yes' : 'No'}</p>
      <p>Recommended cut angle: ${output.cutPlan.recommendedCutAngleDeg.toFixed(2)} deg</p>
      ${output.cutPlan.requiresCutting ? `<p>Recommended taper: ${output.cutPlan.recommendedTaperPerBrickIn.toFixed(3)} in per unit (${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in per side at the inner face).</p><p>Suggested minimum inner diameter without taper cuts: ${output.cutPlan.minimumRecommendedInnerDiameterIn.toFixed(2)} in.</p>` : ''}
      <ul>${output.cutPlan.notes.map((note) => `<li>${note}</li>`).join('')}</ul>
      <h3>Wall Brick Cut Detail</h3>
      ${taperCutSample}
      <h3>Cut Schedule</h3>
      ${buildCutScheduleTable(output)}
    </section>

    <section class="block avoid-break">
      <h2>Safety Check</h2>
      ${warnings}
      ${clearanceSvg}
    </section>

    <section class="block print-break-before">
      <h2>DIY Build Sequence</h2>
      <p>Follow this sequence in order. Dry-fit critical components before mortar is placed, and confirm all field dimensions match the packet before cutting material.</p>
      ${buildDiyStepsHtml(input, output)}
    </section>

    <section class="block print-break-before">
      <h2>Layer-by-Layer Plan</h2>
      <p>Course legend: C1 is the bottom wall course, numbering increases upward, and CAP is the top capstone layer.</p>
      <p>Red highlights indicate planned vent openings. Blue highlights indicate gas line entry.</p>
      ${svg}
    </section>
  </body>
</html>`;
}
