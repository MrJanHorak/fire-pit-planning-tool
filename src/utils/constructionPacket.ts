import type { MasonryInput, MasonryOutput } from '../types';
import { buildFoundationAdvisory } from './foundationAdvisory';
import { buildRegionalCodeReview } from './regionalCodeReview';

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

function isRectangularPlan(shape: MasonryOutput['planShape']): boolean {
  return shape === 'square' || shape === 'rectangular';
}

function usesButtJointCapCorners(output: MasonryOutput): boolean {
  return (
    isRectangularPlan(output.planShape) &&
    (output.capstone.cutStrategy ?? 'full-fit') === 'corner-only'
  );
}

function formatSeatingGroundTypeName(
  groundType: NonNullable<MasonryInput['seatingGroundType']>,
): string {
  if (groundType === 'decomposed-granite') {
    return 'Decomposed granite';
  }
  if (groundType === 'permeable-paver') {
    return 'Permeable paver + grass';
  }
  if (groundType === 'hardscape') {
    return 'Hardscape';
  }
  if (groundType === 'mulch') {
    return 'Mulch / wood chips';
  }
  return 'Compacted gravel';
}

function buildSmokelessCutGuideSvg(output: MasonryOutput): string {
  if (!output.smokelessSpec?.enabled) {
    return '';
  }

  const spec = output.smokelessSpec;
  const viewBoxSize = 320;
  const center = 160;
  const requiredRadius = Math.min(84, (spec.requiredMasonryID / 2) * 2.1);
  const baseRadius = Math.min(70, (spec.insertBaseOD / 2) * 2.1);
  const flangeRadius = Math.min(88, (spec.insertFlangeOD / 2) * 2.1);

  const isCustom = spec.insertPreset === 'custom-diy';
  const title = isCustom
    ? 'Custom DIY sheet-metal insert'
    : 'Commercial insert reference only';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="100%" role="img" aria-label="Smokeless insert cutting guide">
    <rect x="0" y="0" width="${viewBoxSize}" height="${viewBoxSize}" fill="#fffdf7" />
    <text x="14" y="24" font-size="15" fill="#2f2110" font-weight="700">Smokeless Insert Guide</text>
    <text x="14" y="42" font-size="11" fill="#4a3720">${title}</text>

    <circle cx="${center}" cy="${center}" r="${flangeRadius}" fill="none" stroke="#8a5a13" stroke-width="3" stroke-dasharray="7 4" />
    <circle cx="${center}" cy="${center}" r="${requiredRadius}" fill="none" stroke="#2f6d3f" stroke-width="3" />
    <circle cx="${center}" cy="${center}" r="${baseRadius}" fill="#c7a06d" opacity="0.9" stroke="#6e4728" stroke-width="2" />

    <text x="16" y="76" font-size="11" fill="#2f2110">Base OD: ${spec.insertBaseOD.toFixed(2)} in</text>
    <text x="16" y="94" font-size="11" fill="#2f2110">Flange OD: ${spec.insertFlangeOD.toFixed(2)} in</text>
    <text x="16" y="112" font-size="11" fill="#2f2110">Required masonry ID: ${spec.requiredMasonryID.toFixed(2)} in</text>
    <text x="16" y="130" font-size="11" fill="#2f2110">Air gap: ${spec.airGapIn.toFixed(2)} in</text>
    <text x="16" y="148" font-size="11" fill="#2f2110">Primary intake: ${spec.primaryVentCount} holes @ ${spec.primaryVentDiameterIn.toFixed(2)} in</text>
    <text x="16" y="166" font-size="11" fill="#2f2110">Secondary jets: ${spec.secondaryVentCount} holes @ ${spec.secondaryVentDiameterIn.toFixed(2)} in</text>
    <text x="16" y="184" font-size="11" fill="#2f2110">Base vent omissions: ${spec.baseVentBlockOmissions} blocks</text>
    <text x="16" y="202" font-size="11" fill="#2f2110">Flange overlap: ${spec.flangeOverlapStatus}</text>

    <text x="208" y="76" font-size="10" fill="#8a5a13">Flange OD</text>
    <text x="200" y="96" font-size="10" fill="#2f6d3f">Required ID</text>
    <text x="212" y="116" font-size="10" fill="#6e4728">Base OD</text>
    <text x="208" y="232" font-size="11" fill="#4a3720">${isCustom ? 'Cut / roll the sheet metal to these diameters, then drill the hole pattern.' : 'Use manufacturer dimensions; no sheet-metal cut list needed.'}</text>
  </svg>`;
}

export function buildSmokelessHoleGuideHtml(output: MasonryOutput): string {
  if (!output.smokelessSpec?.enabled) {
    return '';
  }

  const spec = output.smokelessSpec;

  // Both hole rows are drilled into the vertical cylinder wall, so both must be spaced
  // off the base OD circumference - the flange is a flat horizontal lip, not part of
  // the wall circumference, and must never be used for hole-spacing math.
  const primaryArcSpacingIn =
    spec.primaryVentCount > 0 ? (Math.PI * spec.insertBaseOD) / spec.primaryVentCount : 0;
  const secondaryArcSpacingIn =
    spec.secondaryVentCount > 0 ? (Math.PI * spec.insertBaseOD) / spec.secondaryVentCount : 0;

  // Chord spacing: straight-line, center-to-center distance for calipers/rigid tape,
  // as opposed to arc spacing measured with a flexible tape wrapped around the curve.
  const primaryChordSpacingIn =
    spec.primaryVentCount > 0
      ? spec.insertBaseOD * Math.sin(Math.PI / spec.primaryVentCount)
      : 0;
  const secondaryChordSpacingIn =
    spec.secondaryVentCount > 0
      ? spec.insertBaseOD * Math.sin(Math.PI / spec.secondaryVentCount)
      : 0;

  return `<h3>Hole Cutting Guide</h3>
    <table>
      <thead>
        <tr>
          <th>Hole Row</th>
          <th>Count</th>
          <th>Diameter</th>
          <th>Height</th>
          <th>Arc Spacing</th>
          <th>Chord Spacing</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Primary intake holes</td>
          <td>${spec.primaryVentCount}</td>
          <td>${spec.primaryVentDiameterIn.toFixed(2)} in</td>
          <td>${spec.primaryHeightFromBottomIn.toFixed(2)} in up from the bottom edge</td>
          <td>${primaryArcSpacingIn.toFixed(2)} in</td>
          <td>${primaryChordSpacingIn.toFixed(2)} in</td>
        </tr>
        <tr>
          <td>Secondary jet holes</td>
          <td>${spec.secondaryVentCount}</td>
          <td>${spec.secondaryVentDiameterIn.toFixed(2)} in</td>
          <td>${spec.secondaryHeightFromTopIn.toFixed(2)} in down from the top rim</td>
          <td>${secondaryArcSpacingIn.toFixed(2)} in</td>
          <td>${secondaryChordSpacingIn.toFixed(2)} in</td>
        </tr>
      </tbody>
    </table>
    <ul>
      <li>Mark all hole centers evenly around the insert shell before drilling.</li>
      <li>Both rows are drilled on the vertical cylinder wall - always space holes off the base OD, never the flange OD (the flange is a flat lip, not part of the wall circumference).</li>
      <li>Arc spacing = distance measured with a flexible tape wrapped around the curve. Chord spacing = straight-line, center-to-center distance for calipers or a rigid ruler. Either works; use whichever tool you have.</li>
      <li>For custom DIY inserts, drill pilot holes first, then open them to the final diameters listed above.</li>
    </ul>`;
}

function buildSmokelessPlanningHtml(output: MasonryOutput): string {
  if (!output.smokelessSpec?.enabled) {
    return '';
  }

  const spec = output.smokelessSpec;
  const rows: Array<[string, string]> = [
    ['Insert', spec.insertLabel],
    ['Required masonry ID', `${spec.requiredMasonryID.toFixed(2)} in`],
    ['Air gap', `${spec.airGapIn.toFixed(2)} in`],
    ['Base OD', `${spec.insertBaseOD.toFixed(2)} in`],
    ['Flange OD', `${spec.insertFlangeOD.toFixed(2)} in`],
    ['Minimum depth', `${spec.insertMinDepthIn.toFixed(2)} in`],
    ['Primary intake holes', `${spec.primaryVentCount} × ${spec.primaryVentDiameterIn.toFixed(2)} in`],
    ['Secondary jet holes', `${spec.secondaryVentCount} × ${spec.secondaryVentDiameterIn.toFixed(2)} in`],
    ['Intake / outlet ratio', `${spec.intakeOutletRatio.toFixed(2)} (${spec.intakeOutletRatioStatus})`],
    ['Base vent omissions', `${spec.baseVentBlockOmissions} blocks`],
    ['Flange overlap', spec.flangeOverlapStatus],
    ['Draft pressure', `~${spec.draftPressurePa.toFixed(1)} Pa`],
  ];

  const guideNotes = spec.insertPreset === 'custom-diy'
    ? [
        `Cut / roll the sheet metal to a base OD of ${spec.insertBaseOD.toFixed(2)} in and a flange OD of ${spec.insertFlangeOD.toFixed(2)} in.`,
        `Lay out ${spec.primaryVentCount} primary intake holes at ${spec.primaryVentDiameterIn.toFixed(2)} in diameter near the lower shell.`,
        `Lay out ${spec.secondaryVentCount} secondary jet holes at ${spec.secondaryVentDiameterIn.toFixed(2)} in diameter near the upper rim.`,
        `Keep at least ${Math.max(1, (spec.insertFlangeOD - spec.requiredMasonryID) / 2).toFixed(2)} in of overlap per side so the insert seats securely.`,
      ]
    : [
        'No sheet-metal fabrication cut list is needed for the selected commercial insert.',
        'Use the dimensions above to verify the manufacturer template, seating depth, and vent count.',
      ];

  return `<section class="block avoid-break">
      <h2>Smokeless Insert Planning</h2>
      <p>${spec.insertPreset === 'custom-diy' ? 'This build uses the custom DIY insert path, so the packet includes a simple sheet-metal cutting guide and vent layout summary.' : 'This build uses a commercial smokeless insert preset; the packet records the geometry and vent requirements for layout verification.'}</p>
      ${buildKeyValueTable(rows, 'Smokeless Parameter', 'Value')}
      <h3>Sheet Metal Cutting Guide</h3>
      <ul>${guideNotes.map((note) => `<li>${note}</li>`).join('')}</ul>
      ${buildSmokelessHoleGuideHtml(output)}
      ${buildSmokelessCutGuideSvg(output)}
    </section>`;
}

function getCapstoneCutMetrics(output: MasonryOutput): {
  requiresCutting: boolean;
  recommendedTaperPerUnitIn: number;
  recommendedCutPerSideIn: number;
  recommendedCutAngleDeg: number;
  minimumRecommendedPitInnerDiameterIn: number;
} {
  const polygonSides =
    output.planShape === 'hexagonal'
      ? 6
      : output.planShape === 'octagonal'
        ? 8
        : output.planShape === 'square' || output.planShape === 'rectangular'
          ? 4
          : 0;
  const requiresCutting =
    output.planShape === 'circular'
      ? output.capstone.requiresTaperCutting
      : polygonSides > 0 && !usesButtJointCapCorners(output);
  const capCount = Math.max(1, output.capstone.capUnitsPerCourseRounded);
  const radiusIn = output.capstone.capInnerDiameterIn / 2;
  const moduleSpacingIn = polygonSides > 0
    ? (polygonSides *
        output.capstone.capCenterlineDiameterIn *
        Math.tan(Math.PI / polygonSides)) /
      capCount
    : (Math.PI * output.capstone.capCenterlineDiameterIn) / capCount;
  const chordIn =
    radiusIn > 0
      ? 2 * radiusIn * Math.sin(moduleSpacingIn / (2 * radiusIn))
      : output.resolvedCapUnit.lengthIn;
  const chordDeficitIn = Math.max(0, output.resolvedCapUnit.lengthIn - chordIn);
  const recommendedTaperPerUnitIn = Math.max(
    0,
    -output.capstone.joint.innerJointIn,
    chordDeficitIn,
    polygonSides > 0
      ? Math.abs(
          output.capstone.joint.outerJointIn -
            output.capstone.joint.innerJointIn,
        )
      : 0,
  );
  const recommendedCutPerSideIn = recommendedTaperPerUnitIn / 2;
  const capDepthIn = Math.max(0.001, output.capstone.capCourseWidthIn);
  const recommendedCutAngleDeg =
    polygonSides > 0
      ? 180 / polygonSides
      : (Math.atan(recommendedCutPerSideIn / capDepthIn) * 180) / Math.PI;
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

function countCornerCutUnits(
  unitCount: number,
  shape: MasonryOutput['planShape'],
  widthIn: number,
  depthIn: number,
): number {
  if (getPlanCornerSideCount(shape) === 0) return 0;
  return Array.from({ length: unitCount }, (_, unitIdx) =>
    isCornerPiece(unitIdx, unitCount, shape, widthIn, depthIn),
  ).filter(Boolean).length;
}

function wallCutSummaryForCourse(
  output: MasonryOutput,
  unitCount: number,
  ventOpenings: number,
): { fullUnits: number; taperUnits: number; cornerUnits: number; cutGuide: string } {
  const sideCount = getPlanCornerSideCount(output.planShape);
  const activeUnits = Math.max(0, unitCount - ventOpenings);

  if (output.planShape === 'circular') {
    const taperUnits = output.cutPlan.requiresCutting ? activeUnits : 0;
    return {
      fullUnits: Math.max(0, activeUnits - taperUnits),
      taperUnits,
      cornerUnits: 0,
      cutGuide: output.cutPlan.requiresCutting
        ? `${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in per side`
        : 'None',
    };
  }

  if (sideCount > 0) {
    const cornerUnits = countCornerCutUnits(
      unitCount,
      output.planShape,
      output.centerlineSpanWidthIn,
      output.centerlineSpanDepthIn,
    );
    return {
      fullUnits: 0,
      taperUnits: activeUnits,
      cornerUnits: Math.min(activeUnits, cornerUnits),
      cutGuide:
        sideCount > 4
          ? `Taper all active units; miter ${Math.min(activeUnits, cornerUnits)} corner units @ ${(180 / sideCount).toFixed(1)} deg`
          : `Taper/trim all active units; miter ${Math.min(activeUnits, cornerUnits)} corner units @ 45.0 deg`,
    };
  }

  return {
    fullUnits: activeUnits,
    taperUnits: 0,
    cornerUnits: 0,
    cutGuide: 'None',
  };
}

function buildWallCutScheduleTable(output: MasonryOutput): string {
  const rows = output.courses
    .map((course) => {
      const spacerUnits =
        course.specialCourse === 'shim-spacer' ? (course.spacerCount ?? 0) : 0;
      const mainUnits = Math.max(0, course.unitCount - spacerUnits);
      const accentUnits =
        course.specialCourse === 'vented-accent' ? course.unitCount : 0;
      const ventOpenings = output.ventSpec.targetCourseIndexes.includes(
        course.courseIndex,
      )
        ? output.ventSpec.ventBrickIndexes.length
        : 0;
      const cutSummary = wallCutSummaryForCourse(
        output,
        mainUnits,
        ventOpenings,
      );
      const offsetLabel =
        course.offsetIn > 0 ? 'Half-module start' : 'Standard start';

      return `<tr>
        <td>C${course.courseIndex + 1}</td>
        <td>${course.unitCount}</td>
        <td>${mainUnits}</td>
        <td>${spacerUnits}</td>
        <td>${accentUnits}</td>
        <td>${cutSummary.fullUnits}</td>
        <td>${cutSummary.taperUnits}</td>
        <td>${cutSummary.cornerUnits}</td>
        <td>${ventOpenings}</td>
        <td>${cutSummary.cutGuide}</td>
        <td>${offsetLabel}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>Course</th>
        <th>Total Bricks</th>
        <th>Main Units</th>
        <th>Spacer Units</th>
        <th>Accent Units</th>
        <th>Full Bricks</th>
        <th>Cut Bricks (Taper / Trim Units)</th>
        <th>Corner / Miter Units</th>
        <th>Vent Gaps</th>
        <th>Cut Guide</th>
        <th>Course Start</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildCapstoneCutScheduleTable(
  output: MasonryOutput,
  capCut: ReturnType<typeof getCapstoneCutMetrics>,
): string {
  const rowCounts =
    output.thermalAssembly.mode === 'double-wall' &&
    output.thermalAssembly.capBridgeCourseUnitCounts.length > 0
      ? output.thermalAssembly.capBridgeCourseUnitCounts
      : [output.capstone.capUnitsPerCourseRounded];
  const sideCount = getPlanCornerSideCount(output.planShape);

  const rows = rowCounts
    .map((unitCount, rowIndex) => {
      const rowOffsetIn =
        rowIndex * (output.resolvedCapUnit.widthIn + output.mortarJointIn);
      const rowWidthIn = output.capstone.capCenterlineWidthIn + rowOffsetIn * 2;
      const rowDepthIn = output.capstone.capCenterlineDepthIn + rowOffsetIn * 2;
      const capCutStrategy = output.capstone.cutStrategy ?? 'full-fit';
      const buttJointCorners = usesButtJointCapCorners(output);
      const taperUnits =
        output.planShape === 'circular'
          ? capCut.requiresCutting
            ? unitCount
            : 0
          : sideCount > 0
            ? capCutStrategy === 'corner-only'
              ? 0
              : unitCount
            : 0;
      const miterUnits =
        sideCount > 0 && !buttJointCorners
          ? countCornerCutUnits(
              unitCount,
              output.planShape,
              rowWidthIn,
              rowDepthIn,
            )
          : 0;
      const fullUnits = Math.max(
        0,
        unitCount -
          taperUnits -
          (capCutStrategy === 'corner-only' ? miterUnits : 0),
      );
      const cutGuide =
        buttJointCorners
          ? 'No miter cuts in DIY butt-joint mode; extend one run and butt the crossing run into it'
          : capCutStrategy === 'corner-only' && miterUnits > 0
          ? `${miterUnits} corner units only @ ${capCut.recommendedCutAngleDeg.toFixed(1)} deg; face units remain full`
          : taperUnits > 0
          ? output.planShape === 'circular'
            ? `${capCut.recommendedCutPerSideIn.toFixed(3)} in per side taper`
            : `${capCut.recommendedCutPerSideIn.toFixed(3)} in per side taper; ${miterUnits} M units @ ${capCut.recommendedCutAngleDeg.toFixed(1)} deg`
          : 'None';

      return `<tr>
        <td>${rowCounts.length > 1 ? `R${rowIndex + 1}` : 'CAP'}</td>
        <td>${unitCount}</td>
        <td>${fullUnits}</td>
        <td>${taperUnits}</td>
        <td>${miterUnits}</td>
        <td>${cutGuide}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>Cap Row</th>
        <th>Total Cap Units</th>
        <th>Full Units</th>
        <th>Taper Units (T)</th>
        <th>Miter + Taper Units (M)</th>
        <th>Cut Guide</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function buildCutScheduleTablesHtml(output: MasonryOutput): string {
  const capCut = getCapstoneCutMetrics(output);
  const capCutNote = usesButtJointCapCorners(output)
    ? 'Square/rectangle DIY corner-only mode uses butt-joint cap corners: one straight cap run extends through the corner and the crossing run butts into it, so no M corner miter cuts are scheduled.'
    : 'T units match the cap taper markers in the course layout. M units are corner capstones that need both taper and miter cuts.';
  return `<h3>Wall Cut Schedule</h3>
    ${buildWallCutScheduleTable(output)}
    <h3>Capstone Cut Schedule</h3>
    <p>${capCutNote}</p>
    ${buildCapstoneCutScheduleTable(output, capCut)}`;
}

function buildCapBridgeRowScheduleTable(
  output: MasonryOutput,
  capCut: ReturnType<typeof getCapstoneCutMetrics>,
): string {
  if (output.thermalAssembly.mode !== 'double-wall') {
    return '';
  }

  const rowCounts = output.thermalAssembly.capBridgeCourseUnitCounts;
  if (rowCounts.length === 0) {
    return '<p>No cap bridge row schedule available.</p>';
  }

  const rows = rowCounts
    .map((unitCount, rowIndex) => {
      const rowOffsetIn =
        rowIndex * (output.resolvedCapUnit.widthIn + output.mortarJointIn);
      const rowCenterlineWidthIn = output.capstone.capCenterlineWidthIn + rowOffsetIn * 2;
      const rowCenterlineDepthIn = output.capstone.capCenterlineDepthIn + rowOffsetIn * 2;
      const sideCount = getPlanCornerSideCount(output.planShape);
      const rowPerimeterIn =
        output.planShape === 'circular'
          ? Math.PI * Math.max(rowCenterlineWidthIn, rowCenterlineDepthIn)
          : sideCount > 4
            ? sideCount *
              rowCenterlineWidthIn *
              Math.tan(Math.PI / sideCount)
            : 2 * (rowCenterlineWidthIn + rowCenterlineDepthIn);
      const moduleSpacingIn = rowPerimeterIn / Math.max(1, unitCount);
      const rowJointIn = Math.max(0, moduleSpacingIn - output.resolvedCapUnit.lengthIn);
      const taperRequired =
        output.planShape === 'circular'
          ? rowIndex === 0 && capCut.requiresCutting
          : sideCount > 0 && !usesButtJointCapCorners(output);
      const rowCutGuide = taperRequired
        ? `${capCut.recommendedCutPerSideIn.toFixed(3)} in per side @ ${capCut.recommendedCutAngleDeg.toFixed(2)} deg; corner units marked in layout`
        : usesButtJointCapCorners(output)
          ? 'DIY butt-joint corners: extend one straight run and butt the crossing run into it'
        : 'Not required';

      return `<tr>
        <td>R${rowIndex + 1}</td>
        <td>${unitCount}</td>
        <td>${rowPerimeterIn.toFixed(2)} in</td>
        <td>${rowJointIn.toFixed(3)} in</td>
        <td>${taperRequired ? 'Yes' : 'No'}</td>
        <td>${rowCutGuide}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>Cap Row</th>
        <th>Units</th>
        <th>Centerline Perimeter</th>
        <th>Expected Joint</th>
        <th>Taper Cut</th>
        <th>Cut Guide</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildKeyValueTable(
  rows: Array<[string, string]>,
  keyHeader = 'Item',
  valueHeader = 'Value',
): string {
  const body = rows
    .map(([item, value]) => `<tr><td>${item}</td><td>${value}</td></tr>`)
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>${keyHeader}</th>
        <th>${valueHeader}</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildPermitChecklistTable(
  rows: Array<{ item: string; status: string; detail: string }>,
): string {
  return `<table>
    <thead>
      <tr>
        <th>Permit / Inspection Item</th>
        <th>Status</th>
        <th>Detail</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr><td>${row.item}</td><td>${row.status}</td><td>${row.detail}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

export function buildWallBrickTaperCutSvg(output: MasonryOutput): string {
  if (!output.cutPlan.requiresCutting) {
    return '';
  }

  const angle = output.cutPlan.recommendedCutAngleDeg.toFixed(2);
  const cutPerSide = output.cutPlan.recommendedCutPerSideIn.toFixed(3);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 220" width="100%" role="img" aria-label="Wall brick taper cut diagram">
    <rect x="0" y="0" width="620" height="250" fill="#fffdf7" />
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
    const polygonSides =
      output.planShape === 'hexagonal'
        ? 6
        : output.planShape === 'octagonal'
          ? 8
          : 4;
    const angleLabel =
      output.planShape === 'hexagonal' || output.planShape === 'octagonal'
        ? `${(180 / polygonSides).toFixed(1)} deg corner miter`
        : '45.0 deg corner miter';
    const taperLabel = capCut.recommendedCutPerSideIn.toFixed(3);
    const buttJointCorners = usesButtJointCapCorners(output);
    const capRows =
      output.thermalAssembly.mode === 'double-wall' &&
      output.thermalAssembly.capBridgeCourseUnitCounts.length > 0
        ? output.thermalAssembly.capBridgeCourseUnitCounts
        : [output.capstone.capUnitsPerCourseRounded];
    const rowSummary = capRows
      .map((count, idx) => `R${idx + 1}: ${count}`)
      .join('  ');
    const cutStrategy = output.capstone.cutStrategy ?? 'full-fit';
    if (buttJointCorners) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 250" width="100%" role="img" aria-label="Butt-joint capstone placement detail diagram">
        <rect x="0" y="0" width="620" height="244" fill="#fffdf7" />
        <text x="14" y="24" font-size="16" fill="#2f2110" font-weight="700">Capstone Placement Detail (DIY Butt-Joint Mode)</text>
        <text x="14" y="48" font-size="12" fill="#4a3720">Square/rectangle capstones stay full length: top and bottom runs pass through the corners; side runs butt into them.</text>
        <rect x="128" y="76" width="168" height="48" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <rect x="296" y="76" width="168" height="48" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <rect x="448" y="124" width="48" height="92" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <rect x="96" y="124" width="48" height="92" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <rect x="144" y="140" width="304" height="60" fill="#2f2110" opacity="0.16" />
        <line x1="448" y1="124" x2="448" y2="216" stroke="#4a3720" stroke-width="2" stroke-dasharray="5 4" />
        <line x1="144" y1="124" x2="144" y2="216" stroke="#4a3720" stroke-width="2" stroke-dasharray="5 4" />
        <text x="18" y="92" font-size="12" fill="#2f2110">Cap saw cuts: none scheduled</text>
        <text x="18" y="112" font-size="12" fill="#4a3720">Set one straight run first, then butt the perpendicular run into it.</text>
        <text x="184" y="70" font-size="12" fill="#4a3720">Through run continues past corner</text>
        <text x="410" y="232" font-size="12" fill="#4a3720">Butt-joint end</text>
        <text x="14" y="206" font-size="12" fill="#2f2110" font-weight="700">No cap taper or miter cuts are required for this DIY square/rectangle cap strategy.</text>
        <text x="14" y="228" font-size="12" fill="#4a3720">Cap course rows shown in Course Layout: ${rowSummary}. Dry-fit corners to choose which run passes through on each side.</text>
      </svg>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 250" width="100%" role="img" aria-label="Capstone placement detail diagram">
      <rect x="0" y="0" width="620" height="244" fill="#fffdf7" />
      <text x="14" y="24" font-size="16" fill="#2f2110" font-weight="700">Capstone Placement Detail (Plan View)</text>
      <text x="14" y="48" font-size="12" fill="#4a3720">${buttJointCorners ? 'DIY butt-joint mode: square/rectangle capstones stay rectangular; one run extends through each corner.' : cutStrategy === 'corner-only' ? 'DIY corner-only mode: face capstones stay rectangular; only polygon corner capstones are miter/cut.' : 'Full-fit mode: non-circular capstones are clipped to the ring; side pieces taper and corner pieces miter.'}</text>
      <polygon points="126,88 274,76 292,158 146,170" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
      <polygon points="324,76 494,88 474,170 306,158" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
      <polygon points="274,76 324,76 306,158 292,158" fill="#c6b39a" stroke="#4a3a28" stroke-width="1.5" />
      <line x1="126" y1="88" x2="146" y2="170" stroke="#a01d1d" stroke-width="3" />
      <line x1="274" y1="76" x2="292" y2="158" stroke="#a01d1d" stroke-width="3" />
      <line x1="324" y1="76" x2="306" y2="158" stroke="#a01d1d" stroke-width="3" />
      <text x="18" y="92" font-size="12" fill="#a01d1d">${buttJointCorners ? 'No miter cuts scheduled in this DIY mode' : `Side taper: about ${taperLabel} in per side`}</text>
      <text x="18" y="112" font-size="12" fill="#a01d1d">${buttJointCorners ? 'Use butt joints: long run passes corner; crossing run butts in.' : `Corner miter: ${angleLabel}`}</text>
      <text x="18" y="132" font-size="12" fill="#a01d1d">Dry-fit each face; do not force rectangular caps through vertices.</text>
      <text x="206" y="188" font-size="12" fill="#4a3720">Cut capstone unit</text>
      <text x="386" y="188" font-size="12" fill="#4a3720">Cut capstone unit</text>
      <text x="278" y="66" font-size="12" fill="#4a3720">Mortar joint between cut edges</text>
      <text x="14" y="206" font-size="12" fill="#2f2110" font-weight="700">${buttJointCorners ? 'Square/rectangle DIY mode trades perfect clipped coverage for no corner miter cuts.' : `Capstone cuts are required for clean ${formatShapeName(output.planShape).toLowerCase()} coverage.`}</text>
      <text x="14" y="228" font-size="12" fill="#4a3720">Cap course rows shown in Course Layout: ${rowSummary}. ${buttJointCorners ? 'Rows use full rectangular units with butt-joint corners.' : 'Each row has its own count and corner/miter units.'}</text>
    </svg>`;
  }

  const innerJoint = output.capstone.joint.innerJointIn.toFixed(3);
  const outerJoint = output.capstone.joint.outerJointIn.toFixed(3);
  const capCutPerSide = capCut.recommendedCutPerSideIn.toFixed(3);
  const capCutAngle = capCut.recommendedCutAngleDeg.toFixed(2);

  const circularCapRows =
    output.thermalAssembly.mode === 'double-wall' &&
    output.thermalAssembly.capBridgeCourseUnitCounts.length > 0
      ? output.thermalAssembly.capBridgeCourseUnitCounts
      : [output.capstone.capUnitsPerCourseRounded];
  const circularRowSummary = circularCapRows
    .map((count, idx) => `R${idx + 1}: ${count}`)
    .join('  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 244" width="100%" role="img" aria-label="Capstone placement detail diagram">
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
    <text x="14" y="228" font-size="12" fill="#4a3720">Cap course rows shown in Course Layout: ${circularRowSummary}. Each bridge row has its own count.</text>
  </svg>`;
}

export function buildCapstoneCutTypeDiagramsSvg(output: MasonryOutput): string {
  const capCut = getCapstoneCutMetrics(output);
  const sideCount = getPlanCornerSideCount(output.planShape);
  const cutStrategy = output.capstone.cutStrategy ?? 'full-fit';
  const miterAngle =
    sideCount > 0 ? capCut.recommendedCutAngleDeg.toFixed(1) : 'n/a';
  const taperPerSide = capCut.recommendedCutPerSideIn.toFixed(3);
  const buttJointCorners = usesButtJointCapCorners(output);
  const strategyNote =
    buttJointCorners
      ? 'DIY butt-joint mode: square/rectangle capstones remain full units; no M corner miter cuts are scheduled.'
      : cutStrategy === 'corner-only'
      ? 'DIY corner-only mode: only M corner units are cut; face capstones remain full rectangular units.'
      : 'Full-fit mode: T face units are tapered; M corner units receive both taper and miter cuts.';

  if (buttJointCorners) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 250" width="100%" role="img" aria-label="Butt-joint capstone no-cut diagram">
      <rect x="0" y="0" width="760" height="250" fill="#fffdf7" />
      <text x="16" y="26" font-size="16" fill="#2f2110" font-weight="700">Capstone Cut Type Diagrams</text>
      <text x="16" y="48" font-size="12" fill="#4a3720">${strategyNote}</text>

      <g transform="translate(36 78)">
        <text x="0" y="-12" font-size="13" fill="#2f2110" font-weight="700">Full cap unit — through run</text>
        <rect x="18" y="22" width="198" height="76" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <text x="12" y="126" font-size="11" fill="#4a3720">No taper. No miter.</text>
        <text x="12" y="144" font-size="11" fill="#4a3720">Runs straight through the corner.</text>
      </g>

      <g transform="translate(292 78)">
        <text x="0" y="-12" font-size="13" fill="#2f2110" font-weight="700">Butt-joint corner</text>
        <rect x="18" y="22" width="182" height="58" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <rect x="142" y="80" width="58" height="94" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <line x1="142" y1="80" x2="200" y2="80" stroke="#4a3720" stroke-width="2" stroke-dasharray="5 4" />
        <text x="12" y="204" font-size="11" fill="#4a3720">Perpendicular run butts into through run.</text>
      </g>

      <g transform="translate(560 78)">
        <text x="0" y="-12" font-size="13" fill="#2f2110" font-weight="700">Saw setup</text>
        <rect x="18" y="22" width="136" height="76" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
        <text x="12" y="126" font-size="11" fill="#4a3720">Cap cuts: 0</text>
        <text x="12" y="144" font-size="11" fill="#4a3720">Use dry-fit layout only.</text>
      </g>

      <text x="16" y="232" font-size="12" fill="#2f2110" font-weight="700">This mode reduces cutting; the tradeoff is that joints at the corners are butt joints instead of mitered/clipped cap corners.</text>
    </svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 270" width="100%" role="img" aria-label="Capstone cut type diagrams">
    <rect x="0" y="0" width="760" height="270" fill="#fffdf7" />
    <text x="16" y="26" font-size="16" fill="#2f2110" font-weight="700">Capstone Cut Type Diagrams</text>
    <text x="16" y="48" font-size="12" fill="#4a3720">${strategyNote}</text>

    <g transform="translate(24 76)">
      <text x="0" y="-12" font-size="13" fill="#2f2110" font-weight="700">T — taper-cut face unit</text>
      <polygon points="18,22 202,36 184,104 36,118" fill="#e2cfa6" stroke="#6e4728" stroke-width="2" />
      <line x1="18" y1="22" x2="36" y2="118" stroke="#a01d1d" stroke-width="3" />
      <line x1="202" y1="36" x2="184" y2="104" stroke="#a01d1d" stroke-width="3" />
      <text x="12" y="146" font-size="11" fill="#4a3720">Side taper: ${taperPerSide} in/side</text>
      <text x="12" y="164" font-size="11" fill="#4a3720">Used for full-fit face caps</text>
    </g>

    <g transform="translate(278 76)">
      <text x="0" y="-12" font-size="13" fill="#2f2110" font-weight="700">${buttJointCorners ? 'B — butt-joint corner (no miter cut)' : 'M — corner miter + taper unit'}</text>
      <polygon points="36,24 204,42 166,116 20,116" fill="#9f8050" stroke="#6e4728" stroke-width="2" />
      <line x1="36" y1="24" x2="20" y2="116" stroke="#a01d1d" stroke-width="3" />
      <line x1="204" y1="42" x2="166" y2="116" stroke="#a01d1d" stroke-width="3" />
      <line x1="166" y1="116" x2="204" y2="42" stroke="#a01d1d" stroke-width="3" stroke-dasharray="5 4" />
      <text x="12" y="146" font-size="11" fill="#4a3720">${buttJointCorners ? 'Miter angle: none' : `Miter angle: ${miterAngle} deg`}</text>
      <text x="12" y="164" font-size="11" fill="#4a3720">${buttJointCorners ? 'One straight run extends; crossing run butts in' : 'Also receives taper in full-fit mode'}</text>
    </g>

    <g transform="translate(532 76)">
      <text x="0" y="-12" font-size="13" fill="#2f2110" font-weight="700">Full face unit — DIY mode</text>
      <rect x="26" y="28" width="168" height="82" rx="2" fill="#ccb085" stroke="#6e4728" stroke-width="2" />
      <text x="12" y="146" font-size="11" fill="#4a3720">No taper on face units</text>
      <text x="12" y="164" font-size="11" fill="#4a3720">Tradeoff: less perfect coverage / joints</text>
    </g>

    <text x="16" y="248" font-size="12" fill="#2f2110" font-weight="700">Always dry-fit one full side plus both corners before batch cutting.</text>
  </svg>`;
}

function buildDiyStepsHtml(input: MasonryInput, output: MasonryOutput): string {
  const capCut = getCapstoneCutMetrics(output);
  const foundationAdvisory = buildFoundationAdvisory(input, output);
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
  const capBridgeStep =
    output.thermalAssembly.mode === 'double-wall' &&
    output.thermalAssembly.capBridgeRows > 1
      ? `Double-wall cap closure: build ${output.thermalAssembly.capBridgeRows} cap rows total. Install ${output.capstone.capUnitsPerCourseRounded} primary cap units plus ${output.thermalAssembly.capBridgeAdditionalUnits} closure units (before waste) so the cap fully bridges the cavity and outer shell.`
      : null;
  const smokelessStep =
    output.smokelessSpec?.enabled && input.fuelType === 'wood'
      ? output.smokelessSpec.insertPreset === 'custom-diy'
        ? `Smokeless insert fabrication: cut or roll the DIY insert to ${output.smokelessSpec.insertBaseOD.toFixed(2)} in base OD with a ${output.smokelessSpec.insertFlangeOD.toFixed(2)} in flange OD, then drill ${output.smokelessSpec.primaryVentCount} primary intake holes and ${output.smokelessSpec.secondaryVentCount} secondary jet holes to the listed diameters.`
        : `Smokeless insert fit-up: dry-fit the ${output.smokelessSpec.insertLabel} to confirm its ${output.smokelessSpec.requiredMasonryID.toFixed(2)} in masonry ID requirement, flange overlap, and ${output.smokelessSpec.insertMinDepthIn.toFixed(2)} in minimum depth before final assembly.`
      : null;
  const doubleWallStep =
    output.thermalAssembly.mode === 'double-wall'
      ? `Double-wall shell layout: build the inner firebox courses first, then dry-lay the outer decorative shell on its larger centerline. Keep the ${output.thermalAssembly.cavityWidthIn.toFixed(2)} in ${output.thermalAssembly.cavityVentMode} cavity clear, align outer-shell vents with the planned vent angles, and install ties at the configured spacing.`
      : null;
  const ashCleanoutStep =
    input.ashCleanoutType && input.ashCleanoutType !== 'none'
      ? `Ash cleanout: reserve the marked C1 cleanout location before mortaring the base course. For ${input.ashCleanoutType.replace('-', ' ')}, keep it clear of vent openings and gas-line routing, then frame or screen it according to the cut notes.`
      : null;
  const polygonVentStep =
    getPlanCornerSideCount(output.planShape) > 4
      ? 'For polygon layouts, vent openings are centered on flat side faces. Do not use corner/cut units as vents; those units are mitred closures that would block or distort airflow.'
      : null;
  const cutStep = output.cutPlan.requiresCutting
    ? `Cut wall bricks as wedges before installation. Remove approximately ${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in from each side of the inner face and set the saw to about ${output.cutPlan.recommendedCutAngleDeg.toFixed(2)} deg off square.`
    : 'Dry-fit the first full course and confirm joints remain consistent before mixing mortar.';
  const strategyStep =
    output.courseStrategy.strategy === 'shim-spacer'
      ? `Course strategy note: Shim Spacer is enabled. Insert approximately ${output.courseStrategy.shimUnitCount} thin spacer units across the wall build while keeping each course in running bond.`
      : output.courseStrategy.strategy === 'vented-accent'
        ? `Course strategy note: Vented Accent is enabled. Accent courses occur at ${
            output.courseStrategy.accentCourseIndexes.length > 0
              ? output.courseStrategy.accentCourseIndexes
                  .map((index) => `C${index + 1}`)
                  .join(', ')
              : 'the configured cycle position'
          } and use wider joints. Return to standard coursing above each accent course.`
        : 'Course strategy note: Uniform running bond is used on all wall courses.';
  const smokelessHoleGuide =
    output.smokelessSpec?.enabled && input.fuelType === 'wood'
      ? `<h3>Smokeless Insert Hole Guide</h3>${buildSmokelessHoleGuideHtml(output)}`
      : '';

  const firePitSteps = [
    `Call for utility locates, verify the firepit location, and confirm at least 10 ft of clearance from combustible structures.`,
    `Mark the excavation using the foundation footprint of ${output.foundation.footprintWidthIn.toFixed(2)} in x ${output.foundation.footprintDepthIn.toFixed(2)} in. Mark the wall footprint and cap outline separately so layout stays centered.`,
    `Excavate for the base and install ${output.foundation.stoneDepthIn} in of compacted angular stone. Screed the surface level before starting the first masonry course.`,
    `Foundation review status: ${foundationAdvisory.heading.toLowerCase()}. ${foundationAdvisory.checks[0]}`,
    `Dry-lay Course C1 with ${output.unitsPerCourseRounded} units around the ${formatShapeName(output.planShape).toLowerCase()} centerline. Use the resolved wall unit dimensions and hold mortar joints to ${output.mortarJointIn.toFixed(3)} in.`,
    cutStep,
    `Lay the wall courses to a total of ${output.courses.length} courses. Keep running bond by starting every other course with a half-module offset of ${output.courses[1]?.offsetIn.toFixed(3) ?? '0.000'} in.`,
    strategyStep,
    ...(doubleWallStep ? [doubleWallStep] : []),
    ...(smokelessStep ? [smokelessStep] : []),
    `Leave vent openings in ${ventCourses} at brick indexes ${output.ventSpec.ventBrickIndexes.join(', ')}. This provides ${output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in of vent area for the selected ${formatFuelName(input.fuelType).toLowerCase()} configuration.`,
    ...(polygonVentStep ? [polygonVentStep] : []),
    ...(ashCleanoutStep ? [ashCleanoutStep] : []),
    linerStep,
    `Set the primary cap ring with ${output.capstone.capUnitsPerCourseRounded} units on the cap centerline. Maintain a centerline cap joint of ${output.capstone.joint.actualJointIn.toFixed(3)} in.`,
    ...(capBridgeStep ? [capBridgeStep] : []),
    capDirectionNote,
    input.mortarJointIn > 0
      ? `Tool exposed joints, clean mortar smears before they harden, and protect the installation from rain and freezing while mortar cures. Allow a minimum 28-day curing period before lighting the first fire. Do not apply sustained heat until the mortar has reached full strength.`
      : `Clean any joint debris and protect the dry-stacked installation from displacement while it settles.`,
    `Before first burn, verify the vent path is unobstructed, the liner is seated correctly, the cap units are stable, and the safety clearance remains unchanged at the installed location.`,
  ];

  const seating = output.logistics.seatingAreaMaterials;
  const seatingSteps = seating
    ? [
        `Confirm seating area layout as a ${seating.shape} zone with ${seating.shape === 'square' ? `${seating.overallWidthFt.toFixed(1)} ft x ${seating.overallDepthFt.toFixed(1)} ft` : `${seating.radiusFt.toFixed(1)} ft radius`} centered on the firepit.`,
        `Set perimeter control and grade for the seating finish. Keep the seating surface pitched away from the firepit for drainage and preserve the minimum 10 ft clearance around combustible elements.`,
        `Install the selected seating surface system (${seating.groundType}) and verify final quantities against the seating material list in this packet before purchase.`,
        `Complete final compaction or finish treatment for the seating surface, then verify clear circulation paths around the firepit.`,
      ]
    : [
        'No seating area material plan is configured. Set Seating Ground Type and Seating Radius in Design Inputs to generate a seating build checklist and quantities.',
      ];

  return `${smokelessHoleGuide}<h3>Fire Pit Steps</h3><ol>${firePitSteps.map((step) => `<li>${step}</li>`).join('')}</ol><h3>Seating Area Steps</h3><ol>${seatingSteps.map((step) => `<li>${step}</li>`).join('')}</ol>`;
}

function buildCutMethodGuidanceHtml(output: MasonryOutput): string {
  const capCut = getCapstoneCutMetrics(output);
  const capCutsRequired = capCut.requiresCutting && !usesButtJointCapCorners(output);
  const wallRows: Array<[string, string]> = [
    ['Wall taper required', output.cutPlan.requiresCutting ? 'Yes' : 'No'],
    [
      'Wall taper per side',
      output.cutPlan.requiresCutting
        ? `${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in`
        : '0.000 in',
    ],
    [
      'Wall saw angle setting',
      `${output.cutPlan.recommendedCutAngleDeg.toFixed(2)} deg off square`,
    ],
  ];
  const capRows: Array<[string, string]> = [
    ['Cap taper required', capCutsRequired ? 'Yes' : 'No'],
    [
      'Cap taper per side',
      capCutsRequired
        ? `${capCut.recommendedCutPerSideIn.toFixed(3)} in`
        : '0.000 in',
    ],
    [
      'Cap saw angle setting',
      capCutsRequired
        ? `${capCut.recommendedCutAngleDeg.toFixed(2)} deg off square`
        : 'Not required',
    ],
  ];
  const markingGuidance = usesButtJointCapCorners(output)
    ? `<ul>
      <li>Cap workflow: no cap saw cuts are scheduled. Dry-fit the through runs first, then butt the perpendicular cap runs into them at the corners.</li>
      <li>Wall workflow: use the wall cut settings only if the wall schedule lists cuts for the selected wall shape/material.</li>
      <li>Quality check: Dry-fit a full side plus both corners before setting mortar so the butt-joint choice is consistent around the ring.</li>
      <li>Cap and wall settings are independent. This DIY cap mode changes cap placement only; it does not remove any wall cuts required by the wall layout.</li>
    </ul>`
    : `<ul>
      <li>Manual marking workflow: Mark the centerline of the brick first, then mark equal cut lines on both side edges from the inner face using the listed per-side taper value. Keep both marks symmetric to preserve unit center alignment.</li>
      <li>Saw workflow: Set fence or miter to the listed angle off square, perform one side cut, then flip and repeat for the opposite side so taper remains centered.</li>
      <li>Quality check: Dry-fit three to five cut units before batch cutting. The inner edges should close without overlap, and outer joints should stay within your target mortar range.</li>
      <li>Cap and wall settings are independent. Use wall values for wall bricks and cap values for capstones; do not interchange them.</li>
    </ul>`;

  return `<h3>Wall And Cap Cut Settings</h3>
    <div class="grid split-grid">
      <div>
        ${buildKeyValueTable(wallRows, 'Wall Cut Parameter', 'Setting')}
      </div>
      <div>
        ${buildKeyValueTable(capRows, 'Cap Cut Parameter', 'Setting')}
      </div>
    </div>
    <h3>Marking And Saw Setup</h3>
    ${markingGuidance}`;
}

function buildFirePitMaterialsTable(output: MasonryOutput): string {
  const mainWallUnits = output.courses.reduce(
    (sum, course) =>
      sum +
      Math.max(
        0,
        course.unitCount -
          (course.specialCourse === 'shim-spacer'
            ? (course.spacerCount ?? 0)
            : 0),
      ),
    0,
  );
  const accentUnits = output.courses.reduce(
    (sum, course) =>
      sum + (course.specialCourse === 'vented-accent' ? course.unitCount : 0),
    0,
  );

  const rows: Array<[string, string]> = [
    ['Wall Units per Course', `${output.unitsPerCourseRounded}`],
    ['Total Wall Units', `${output.totalUnits}`],
    ['Main Wall Units', `${mainWallUnits}`],
    ['Spacer Units', `${output.courseStrategy.shimUnitCount}`],
    ['Accent Course Units', `${accentUnits}`],
    [
      `Wall Units To Buy (${output.logistics.wasteFactorPct}% waste)`,
      `${output.logistics.purchasedUnits}`,
    ],
    ['Cap Units per Course', `${output.capstone.capUnitsPerCourseRounded}`],
    ['Cap Units To Buy', `${output.logistics.purchasedCapUnits}`],
    [
      'Cap Outside Diameter',
      `${output.capstone.capOuterDiameterIn.toFixed(2)} in`,
    ],
    [
      'Capstone Weight',
      `${output.logistics.estimatedCapWeightLb.toFixed(1)} lb`,
    ],
    [
      'Mortar Volume',
      `${output.logistics.estimatedMortarVolumeCubicFeet.toFixed(2)} ft<sup>3</sup>`,
    ],
    [
      'Foundation Stone (Compacted Angular, 3/4 in minus)',
      `${output.foundation.stoneVolumeCubicYards.toFixed(3)} yd<sup>3</sup>`,
    ],
    [
      'Base Footprint',
      `${output.foundation.footprintWidthIn.toFixed(2)} in x ${output.foundation.footprintDepthIn.toFixed(2)} in`,
    ],
  ];
  if (output.thermalAssembly.mode === 'double-wall') {
    const capBridgeRowDetail =
      output.thermalAssembly.capBridgeCourseUnitCounts.length > 0
        ? output.thermalAssembly.capBridgeCourseUnitCounts
            .map((units, idx) => `R${idx + 1}: ${units}`)
            .join(', ')
        : 'n/a';
    rows.push(
      [
        'Double-Wall Assembly',
        `${output.thermalAssembly.totalWallDepthIn.toFixed(2)} in total depth`,
      ],
      [
        'Extra Wall Units (estimate)',
        `${output.logistics.thermalAssemblyAdditionalUnits ?? 0} units`,
      ],
      [
        'Cap Bridge Coverage',
        `${output.thermalAssembly.capBridgeRequiredWidthIn.toFixed(2)} in required depth`,
      ],
      [
        'Cap Bridge Rows',
        `${output.thermalAssembly.capBridgeRows} row(s)`,
      ],
      [
        'Cap Closure Units (estimate)',
        `${output.logistics.thermalCapBridgeAdditionalUnits ?? 0} units`,
      ],
      ['Cap Bridge Row Detail', capBridgeRowDetail],
    );
  }

  if (output.logistics.naturalStoneEstimate) {
    const estimate = output.logistics.naturalStoneEstimate;
    rows.push(
      [
        'Natural Stone Face Area',
        `${estimate.faceAreaSquareFeet.toFixed(2)} sq ft`,
      ],
      [
        'Natural Stone Outer Perimeter',
        `${estimate.outerPerimeterFeet.toFixed(2)} ft`,
      ],
      [
        '8 in Wall Stone (10-15% waste)',
        `${estimate.tonsAt8InDepthWithWaste10Pct.toFixed(2)} to ${estimate.tonsAt8InDepthWithWaste15Pct.toFixed(2)} tons`,
      ],
      [
        '4 in Building Stone (10-15% waste)',
        `${estimate.tonsAt4InDepthWithWaste10Pct.toFixed(2)} to ${estimate.tonsAt4InDepthWithWaste15Pct.toFixed(2)} tons`,
      ],
      [
        'Typical Stone Wall Weight',
        `${estimate.typicalWallWeightLbMin.toFixed(0)} to ${estimate.typicalWallWeightLbMax.toFixed(0)} lb`,
      ],
    );
  }

  if (output.smokelessSpec?.enabled) {
    const spec = output.smokelessSpec;
    rows.push(
      [
        'Smokeless Insert / Liner',
        `${spec.insertLabel} (${spec.insertPreset === 'custom-diy' ? 'custom DIY sheet metal blank' : 'commercial insert'})`,
      ],
      [
        'Smokeless Insert Base OD',
        `${spec.insertBaseOD.toFixed(2)} in`,
      ],
      [
        'Smokeless Insert Flange OD',
        `${spec.insertFlangeOD.toFixed(2)} in`,
      ],
      [
        'Primary Intake Holes',
        `${spec.primaryVentCount} holes @ ${spec.primaryVentDiameterIn.toFixed(2)} in`,
      ],
      [
        'Secondary Jet Holes',
        `${spec.secondaryVentCount} holes @ ${spec.secondaryVentDiameterIn.toFixed(2)} in`,
      ],
      [
        'Hole Layout Spacing',
        `${((Math.PI * spec.insertBaseOD) / Math.max(1, spec.primaryVentCount)).toFixed(2)} in primary / ${((Math.PI * spec.insertFlangeOD) / Math.max(1, spec.secondaryVentCount)).toFixed(2)} in secondary`,
      ],
    );
  }

  return buildKeyValueTable(rows, 'Fire Pit Material Item', 'Quantity');
}

function buildSeatingMaterialsSection(output: MasonryOutput): string {
  const seating = output.logistics.seatingAreaMaterials;
  if (!seating) {
    return '<p>No seating area materials are configured. Add seating inputs to include quantities in this packet.</p>';
  }

  const rows = seating.materials
    .map((material) => {
      const quantityText =
        material.unit === 'units' || material.unit === 'lbs'
          ? material.quantity.toFixed(0)
          : material.quantity.toFixed(1);
      const estimatedWeightLb =
        material.estimatedWeightLb ??
        (material.unit === 'lbs' ? material.quantity : undefined);

      return `<tr>
        <td>${material.name}</td>
        <td>${quantityText}</td>
        <td>${material.unit}</td>
        <td>${estimatedWeightLb !== undefined ? `${estimatedWeightLb.toFixed(0)} lb` : 'n/a'}</td>
      </tr>`;
    })
    .join('');

  return `<div class="grid">
      <p>Ground Type: ${formatSeatingGroundTypeName(seating.groundType)}</p>
      <p>Shape: ${seating.shape}</p>
      <p>Area: ${seating.areaSquareFeet.toFixed(1)} sq ft</p>
      <p>Layout: ${seating.shape === 'square' ? `${seating.overallWidthFt.toFixed(1)} ft x ${seating.overallDepthFt.toFixed(1)} ft` : `${seating.radiusFt.toFixed(1)} ft radius`}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Seating Material</th>
          <th>Quantity</th>
          <th>Unit</th>
          <th>Estimated Weight</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <ul>${seating.notes.map((note) => `<li>${note}</li>`).join('')}</ul>`;
}

function getPlanCornerSideCount(shape: MasonryOutput['planShape']): number {
  if (shape === 'hexagonal') return 6;
  if (shape === 'octagonal') return 8;
  if (shape === 'square' || shape === 'rectangular') return 4;
  return 0;
}

function calculatePlanPerimeterIn(
  shape: MasonryOutput['planShape'],
  widthIn: number,
  depthIn: number,
): number {
  const sideCount = getPlanCornerSideCount(shape);
  if (shape === 'circular') {
    return Math.PI * Math.max(widthIn, depthIn);
  }
  if (sideCount > 4) {
    return sideCount * widthIn * Math.tan(Math.PI / sideCount);
  }
  return 2 * (widthIn + depthIn);
}

function roundLayoutUnitCount(
  shape: MasonryOutput['planShape'],
  rawCount: number,
): number {
  const sideCount = getPlanCornerSideCount(shape);
  if (sideCount > 4) {
    return Math.max(sideCount, Math.ceil(rawCount / sideCount) * sideCount);
  }
  if (sideCount === 4) {
    return Math.max(4, Math.floor(rawCount / 2) * 2);
  }
  return Math.max(1, Math.round(rawCount));
}

function distributeSideCounts(
  unitCount: number,
  widthIn: number,
  depthIn: number,
): [number, number, number, number] {
  const safeUnitCount = Math.max(4, Math.round(unitCount));
  const perimeterIn = Math.max(0.001, 2 * (widthIn + depthIn));
  const targetModuleIn = perimeterIn / safeUnitCount;
  let widthCount = Math.max(1, Math.round(widthIn / targetModuleIn));
  let depthCount = Math.max(1, Math.round(depthIn / targetModuleIn));
  const total = () => 2 * (widthCount + depthCount);

  while (total() < safeUnitCount) {
    if (widthIn / widthCount >= depthIn / depthCount) widthCount += 1;
    else depthCount += 1;
  }
  while (total() > safeUnitCount && (widthCount > 1 || depthCount > 1)) {
    if (
      widthCount > 1 &&
      (depthCount <= 1 || widthIn / widthCount <= depthIn / depthCount)
    ) {
      widthCount -= 1;
    } else {
      depthCount -= 1;
    }
  }

  return [widthCount, depthCount, widthCount, depthCount];
}

function getLinearSidePiece(
  unitIndex: number,
  unitCount: number,
  shape: MasonryOutput['planShape'],
  widthIn: number,
  depthIn: number,
): { sideIndex: number; pieceIndex: number; piecesOnSide: number } | null {
  const sideCount = getPlanCornerSideCount(shape);
  if (sideCount === 0) return null;
  if (sideCount > 4) {
    const piecesOnSide = Math.max(1, Math.round(unitCount / sideCount));
    const sideIndex = Math.floor(unitIndex / piecesOnSide) % sideCount;
    return {
      sideIndex,
      pieceIndex: unitIndex - sideIndex * piecesOnSide,
      piecesOnSide,
    };
  }

  const sideCounts = distributeSideCounts(unitCount, widthIn, depthIn);
  let remaining = unitIndex % sideCounts.reduce((sum, count) => sum + count, 0);
  for (let sideIndex = 0; sideIndex < sideCounts.length; sideIndex += 1) {
    const piecesOnSide = sideCounts[sideIndex];
    if (remaining < piecesOnSide) {
      return { sideIndex, pieceIndex: remaining, piecesOnSide };
    }
    remaining -= piecesOnSide;
  }
  return null;
}

function isCornerPiece(
  unitIndex: number,
  unitCount: number,
  shape: MasonryOutput['planShape'],
  widthIn: number,
  depthIn: number,
): boolean {
  const piece = getLinearSidePiece(unitIndex, unitCount, shape, widthIn, depthIn);
  return !!piece && (piece.pieceIndex === 0 || piece.pieceIndex === piece.piecesOnSide - 1);
}

function estimateDoubleWallOuterCourseUnitCount(output: MasonryOutput): number {
  const centerlineOffsetIn =
    output.thermalAssembly.innerShellThicknessIn / 2 +
    output.thermalAssembly.cavityWidthIn +
    output.thermalAssembly.outerShellThicknessIn / 2;
  const outerCenterlineWidthIn = output.centerlineSpanWidthIn + centerlineOffsetIn * 2;
  const outerCenterlineDepthIn = output.centerlineSpanDepthIn + centerlineOffsetIn * 2;
  const moduleIn = output.resolvedUnit.lengthIn + output.mortarJointIn;

  return roundLayoutUnitCount(
    output.planShape,
    calculatePlanPerimeterIn(
      output.planShape,
      outerCenterlineWidthIn,
      outerCenterlineDepthIn,
    ) / Math.max(0.001, moduleIn),
  );
}

function indexFromAngle(unitCount: number, angleDeg?: number): number | undefined {
  if (angleDeg === undefined) return undefined;
  const normalized = ((angleDeg % 360) + 360) % 360;
  return Math.round((normalized / 360) * unitCount) % Math.max(1, unitCount);
}

function chooseAshCleanoutIndex(
  input: MasonryInput | undefined,
  unitCount: number,
  ventIndexes: number[],
  gasIndex?: number,
): number | undefined {
  if (!input?.ashCleanoutType || input.ashCleanoutType === 'none') return undefined;
  const blocked = new Set([
    ...ventIndexes,
    ...(gasIndex === undefined ? [] : [gasIndex]),
  ]);
  const preferred = Math.floor(unitCount / 2);
  for (let step = 0; step < unitCount; step += 1) {
    const candidate = (preferred + step) % unitCount;
    if (!blocked.has(candidate)) return candidate;
  }
  return preferred;
}

export function buildCoursePlanSvg(
  output: MasonryOutput,
  input?: MasonryInput,
): string {
  const rowHeight = 26;
  const sectionGap = 32;
  const modulePx = 48;
  const mainBrickWidthPx = modulePx - 4;
  const spacerBrickWidthPx = Math.max(16, Math.floor(mainBrickWidthPx * 0.5));
  const labelX = 8;
  const brickStartX = 92;
  const wallRows = output.courses.length;
  const includeOuterWall = output.thermalAssembly.mode === 'double-wall';
  const capRowCounts =
    output.thermalAssembly.mode === 'double-wall' &&
    output.thermalAssembly.capBridgeCourseUnitCounts.length > 0
      ? output.thermalAssembly.capBridgeCourseUnitCounts
      : [output.capstone.capUnitsPerCourseRounded];
  const outerUnitCount = includeOuterWall
    ? estimateDoubleWallOuterCourseUnitCount(output)
    : 0;
  const maxUnits = Math.max(
    output.unitsPerCourseRounded,
    outerUnitCount,
    ...capRowCounts,
  );
  const svgWidth = Math.max(940, brickStartX + maxUnits * modulePx + 24);
  const totalRows = wallRows + (includeOuterWall ? wallRows : 0) + capRowCounts.length;
  const legendHeight = 110;
  const svgHeight =
    28 +
    totalRows * rowHeight +
    sectionGap * (includeOuterWall ? 3 : 2) +
    legendHeight;

  let yCursor = 18;
  const sectionTitle = (title: string, detail: string) => {
    const markup = `<text x="${labelX}" y="${yCursor}" font-size="12" fill="#3c2a11" font-weight="700">${title}</text>
      <text x="${labelX + 158}" y="${yCursor}" font-size="11" fill="#6b5033">${detail}</text>`;
    yCursor += 18;
    return markup;
  };

  const renderUnitRow = ({
    label,
    unitCount,
    offsetIn,
    y,
    fill,
    cornerFill,
    widthIn,
    depthIn,
    ventIndexes,
    gasIndex,
    ashIndex,
    course,
    isCap,
  }: {
    label: string;
    unitCount: number;
    offsetIn: number;
    y: number;
    fill: string;
    cornerFill: string;
    widthIn: number;
    depthIn: number;
    ventIndexes: number[];
    gasIndex?: number;
    ashIndex?: number;
    course?: MasonryOutput['courses'][number];
    isCap?: boolean;
  }) => {
    const offsetPx = offsetIn > 0 ? modulePx / 2 : 0;
    const courseTag =
      course?.specialCourse === 'vented-accent'
        ? ' (ACCENT)'
        : course?.specialCourse === 'shim-spacer'
          ? ' (SHIM)'
          : '';
    const bricks = Array.from({ length: unitCount }, (_, unitIdx) => {
      const isSpacer =
        course?.specialCourse === 'shim-spacer' &&
        !!course.spacerIndexes?.includes(unitIdx);
      const isVentBrick = ventIndexes.includes(unitIdx);
      const isGasLineBrick = unitIdx === gasIndex;
      const isAshCleanout = unitIdx === ashIndex;
      const isCorner = isCornerPiece(
        unitIdx,
        unitCount,
        output.planShape,
        widthIn,
        depthIn,
      );
      const isCapTaperCut =
        !!isCap &&
        (output.planShape === 'circular'
          ? output.capstone.requiresTaperCutting
          : (output.capstone.cutStrategy ?? 'full-fit') === 'full-fit');
      const isCapMiterCut =
        !!isCap &&
        isCorner &&
        getPlanCornerSideCount(output.planShape) > 0 &&
        !usesButtJointCapCorners(output);
      const unitFill = isAshCleanout
        ? '#2f2f2f'
        : isGasLineBrick
          ? '#2b6f9b'
          : isVentBrick
            ? '#c13a1f'
            : isSpacer
              ? '#5f4f96'
              : isCapMiterCut
                ? cornerFill
                : isCapTaperCut
                  ? '#e2cfa6'
                  : isCorner
                    ? cornerFill
                : fill;
      const brickWidthPx = isSpacer ? spacerBrickWidthPx : mainBrickWidthPx;
      const xInsetPx = (mainBrickWidthPx - brickWidthPx) / 2;
      const x = brickStartX + offsetPx + unitIdx * modulePx + xInsetPx;
      const stroke =
        (isCorner || isCapTaperCut) &&
        !isVentBrick &&
        !isGasLineBrick &&
        !isAshCleanout
        ? '#2f2110'
        : 'none';
      const strokeWidth = stroke === 'none' ? 0 : 1.5;
      const markerLabel = isCapMiterCut
        ? 'M'
        : isCapTaperCut
          ? 'T'
          : isCorner && getPlanCornerSideCount(output.planShape) > 0
            ? 'C'
            : '';
      const markerText =
        markerLabel !== ''
          ? `<text x="${x + brickWidthPx / 2}" y="${y + 12}" text-anchor="middle" font-size="9" fill="#fff8ea">${markerLabel}</text>`
          : '';
      const capLabel =
        isCapMiterCut
          ? `<title>Corner/miter plus taper cap unit ${unitIdx + 1}</title>`
          : isCapTaperCut
            ? `<title>Taper-cut cap unit ${unitIdx + 1}</title>`
          : '';
      return `<rect x="${x}" y="${y}" width="${brickWidthPx}" height="16" rx="2" fill="${unitFill}" opacity="0.9" stroke="${stroke}" stroke-width="${strokeWidth}" />${markerText}${capLabel}`;
    }).join('');

    return `<g><text x="${labelX}" y="${y + 13}" font-size="11" fill="#3c2a11">${label}${courseTag}</text>${bricks}</g>`;
  };

  const innerRowsTitle = sectionTitle(
    includeOuterWall ? 'INNER WALL COURSES' : 'WALL COURSES',
    includeOuterWall
      ? `${output.thermalAssembly.innerMaterialName ?? output.resolvedUnit.name}; vents/cleanout shown on hot-face layout`
      : 'Red = vent opening; blue = gas entry; dark = ash cleanout; C = corner/cut unit',
  );
  const innerRows = output.courses
    .map((course, idx) => {
      const y = yCursor + idx * rowHeight;
      const ventCourse = output.ventSpec.targetCourseIndexes.includes(
        course.courseIndex,
      );
      const gasIndex =
        output.ventSpec.gasLineEntryBrickIndex !== undefined &&
        course.courseIndex === 0
          ? output.ventSpec.gasLineEntryBrickIndex
          : undefined;
      const ventIndexes = ventCourse ? output.ventSpec.ventBrickIndexes : [];
      const ashIndex =
        course.courseIndex === 0
          ? chooseAshCleanoutIndex(
              input,
              course.unitCount,
              ventIndexes,
              gasIndex,
            )
          : undefined;
      return renderUnitRow({
        label: `C${course.courseIndex + 1}`,
        unitCount: course.unitCount,
        offsetIn: course.offsetIn,
        y,
        fill: course.specialCourse === 'vented-accent' ? '#8a5a13' : '#b66a34',
        cornerFill: '#6e4728',
        widthIn: output.centerlineSpanWidthIn,
        depthIn: output.centerlineSpanDepthIn,
        ventIndexes,
        gasIndex,
        ashIndex,
        course,
      });
    })
    .join('');
  yCursor += wallRows * rowHeight + sectionGap;

  const outerCenterlineOffsetIn =
    output.thermalAssembly.innerShellThicknessIn / 2 +
    output.thermalAssembly.cavityWidthIn +
    output.thermalAssembly.outerShellThicknessIn / 2;
  const outerCenterlineWidthIn =
    output.centerlineSpanWidthIn + outerCenterlineOffsetIn * 2;
  const outerCenterlineDepthIn =
    output.centerlineSpanDepthIn + outerCenterlineOffsetIn * 2;
  const outerRows = includeOuterWall
    ? (() => {
        const title = sectionTitle(
          'OUTER WALL COURSES',
          `${output.thermalAssembly.outerMaterialName ?? 'Decorative shell'}; estimated ${outerUnitCount} units/course on larger centerline`,
        );
        const rows = output.courses
          .map((course, idx) => {
            const y = yCursor + idx * rowHeight;
            const ventCourse = output.ventSpec.targetCourseIndexes.includes(
              course.courseIndex,
            );
            const ventIndexes = ventCourse
              ? output.ventSpec.ventAnglesDeg.map((angle) =>
                  indexFromAngle(outerUnitCount, angle) ?? 0,
                )
              : [];
            const gasIndex =
              course.courseIndex === 0
                ? indexFromAngle(
                    outerUnitCount,
                    output.ventSpec.gasLineEntryAngleDeg,
                  )
                : undefined;
            return renderUnitRow({
              label: `O${course.courseIndex + 1}`,
              unitCount: outerUnitCount,
              offsetIn: course.offsetIn,
              y,
              fill: '#a96532',
              cornerFill: '#5f381c',
              widthIn: outerCenterlineWidthIn,
              depthIn: outerCenterlineDepthIn,
              ventIndexes,
              gasIndex,
              course,
            });
          })
          .join('');
        yCursor += wallRows * rowHeight + sectionGap;
        return title + rows;
      })()
    : '';

  const capTitle = sectionTitle(
    'CAPSTONE COURSE LAYOUT',
    capRowCounts.length > 1
      ? `Double-wall cap bridge rows: ${capRowCounts.map((count, idx) => `R${idx + 1}=${count}`).join(', ')}; ${usesButtJointCapCorners(output) ? 'DIY butt-joint corners, no cap M cuts' : (output.capstone.cutStrategy ?? 'full-fit') === 'corner-only' ? 'DIY mode: M=corner miter/cut, face caps full' : 'T=taper, M=miter+taper'}`
      : `${output.capstone.capUnitsPerCourseRounded} cap units on primary cap ring; ${usesButtJointCapCorners(output) ? 'DIY butt-joint corners, no cap M cuts' : (output.capstone.cutStrategy ?? 'full-fit') === 'corner-only' ? 'DIY mode: M=corner miter/cut, face caps full' : 'T=taper, M=miter+taper'}`,
  );
  const capRows = capRowCounts
    .map((unitCount, rowIdx) => {
      const rowOffsetIn =
        rowIdx * (output.resolvedCapUnit.widthIn + output.mortarJointIn);
      const y = yCursor + rowIdx * rowHeight;
      return renderUnitRow({
        label: capRowCounts.length > 1 ? `CAP R${rowIdx + 1}` : 'CAP',
        unitCount,
        offsetIn: rowIdx % 2 === 1 ? output.capstone.joint.actualModuleSpacingIn / 2 : 0,
        y,
        fill: rowIdx === 0 ? '#ccb085' : '#d8c397',
        cornerFill: '#9f8050',
        widthIn: output.capstone.capCenterlineWidthIn + rowOffsetIn * 2,
        depthIn: output.capstone.capCenterlineDepthIn + rowOffsetIn * 2,
        ventIndexes: [],
        isCap: true,
      });
    })
    .join('');
  yCursor += capRowCounts.length * rowHeight + sectionGap;

  const legendY = svgHeight - 100;
  const cleanoutLegend =
    input?.ashCleanoutType && input.ashCleanoutType !== 'none'
      ? `<rect x="532" y="${legendY}" width="14" height="10" rx="2" fill="#2f2f2f" opacity="0.9" />
         <text x="552" y="${legendY + 9}" font-size="11" fill="#3c2a11">Ash cleanout (${input.ashCleanoutType.replace('-', ' ')})</text>`
      : '';
  const doubleWallLegend = includeOuterWall
    ? `<text x="8" y="${legendY + 48}" font-size="11" fill="#4a3720">Double-wall mode: inner and outer shell rows are separate because the outer shell has a larger centerline and may use a different material.</text>`
    : '';
  const strategyLegendText =
    output.courseStrategy.strategy === 'shim-spacer'
      ? 'Shim spacer unit: narrower purple markers.'
      : output.courseStrategy.strategy === 'vented-accent'
        ? 'Vented accent course: amber-gold course rows.'
        : 'Uniform course strategy: no special course overrides active.';
  const legend = `<g>
    <rect x="8" y="${legendY}" width="14" height="10" rx="2" fill="#b66a34" opacity="0.8" />
    <text x="28" y="${legendY + 9}" font-size="11" fill="#3c2a11">Standard course units remain brown</text>
    <rect x="214" y="${legendY}" width="14" height="10" rx="2" fill="#6e4728" opacity="0.9" />
    <text x="234" y="${legendY + 9}" font-size="11" fill="#3c2a11">C = corner/cut unit</text>
    <rect x="358" y="${legendY}" width="14" height="10" rx="2" fill="#c13a1f" opacity="0.9" />
    <text x="378" y="${legendY + 9}" font-size="11" fill="#3c2a11">Vent opening marker</text>
    ${cleanoutLegend}
    <rect x="8" y="${legendY + 22}" width="14" height="10" rx="2" fill="#2b6f9b" opacity="0.9" />
    <text x="28" y="${legendY + 31}" font-size="11" fill="#3c2a11">Gas line entry</text>
    <rect x="134" y="${legendY + 22}" width="14" height="10" rx="2" fill="#e2cfa6" opacity="0.9" />
    <text x="154" y="${legendY + 31}" font-size="11" fill="#3c2a11">T = cap taper-cut unit</text>
    <rect x="294" y="${legendY + 22}" width="14" height="10" rx="2" fill="#9f8050" opacity="0.9" />
    <text x="314" y="${legendY + 31}" font-size="11" fill="#3c2a11">${usesButtJointCapCorners(output) ? 'M not used in square/rect DIY butt-joint mode' : 'M = cap corner/miter+taper unit'}</text>
    <text x="8" y="${legendY + 64}" font-size="11" fill="#4a3720">${usesButtJointCapCorners(output) ? 'DIY butt-joint cap mode: square/rectangle cap runs stay straight; one run extends through each corner and the crossing run butts into it.' : (output.capstone.cutStrategy ?? 'full-fit') === 'corner-only' ? 'DIY corner-only cap mode: face caps remain full rectangular units; M units are the corner cuts. Expect larger or less-uniform joints.' : 'For clean non-circular cap coverage, the 3D preview uses cut-footprint capstones: T units are tapered; M units are tapered and mitered.'} ${strategyLegendText}</text>
    ${doubleWallLegend}
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
    ${innerRowsTitle}${innerRows}${outerRows}${capTitle}${capRows}${legend}
  </svg>`;
}

export function buildSafetyClearanceSvg(
  input: MasonryInput,
  output: MasonryOutput,
): string {
  const requiredClearanceIn = 120;
  const requiredOverheadFt = 15;
  const actualClearanceIn = input.proximityToStructuresFt * 12;
  const actualOverheadFt = input.overheadClearanceFt ?? 20;
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
  const overheadPass = actualOverheadFt >= requiredOverheadFt;
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

  const overheadInsetBottom = 320;
  const overheadInsetTop = 120;
  const overheadScale = (overheadInsetBottom - overheadInsetTop) / 25;
  const requiredOverheadY = overheadInsetBottom - requiredOverheadFt * overheadScale;
  const actualOverheadY = overheadInsetBottom - actualOverheadFt * overheadScale;
  const clampedActualOverheadY = Math.max(
    overheadInsetTop,
    Math.min(overheadInsetBottom, actualOverheadY),
  );

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
    <text x="390" y="226" font-size="12" fill="${safetyPass ? '#2f6d3f' : '#a01d1d'}">Horizontal status = ${safetyPass ? 'PASS' : 'FAIL'}</text>

    <rect x="392" y="${overheadInsetTop}" width="226" height="${overheadInsetBottom - overheadInsetTop}" fill="#fff8ea" stroke="#c9a87a" stroke-width="1" rx="6" />
    <line x1="430" y1="${overheadInsetTop + 12}" x2="430" y2="${overheadInsetBottom}" stroke="#7a5a34" stroke-width="2" />
    <line x1="430" y1="${requiredOverheadY}" x2="610" y2="${requiredOverheadY}" stroke="#a94d24" stroke-width="2" stroke-dasharray="6 4" />
    <line x1="430" y1="${clampedActualOverheadY}" x2="610" y2="${clampedActualOverheadY}" stroke="${overheadPass ? '#2f6d3f' : '#a01d1d'}" stroke-width="2.5" />
    <text x="438" y="${overheadInsetTop + 24}" font-size="11" fill="#4a3720" font-weight="700">Overhead clearance inset</text>
    <text x="438" y="${requiredOverheadY - 4}" font-size="10" fill="#a94d24">Recommended minimum: ${requiredOverheadFt.toFixed(0)} ft</text>
    <text x="438" y="${Math.min(overheadInsetBottom - 4, clampedActualOverheadY + 14)}" font-size="10" fill="${overheadPass ? '#2f6d3f' : '#a01d1d'}">Configured: ${actualOverheadFt.toFixed(1)} ft</text>
    <text x="438" y="${overheadInsetBottom - 8}" font-size="10" fill="${overheadPass ? '#2f6d3f' : '#a01d1d'}">Vertical status: ${overheadPass ? 'PASS' : 'REVIEW'}</text>
  </svg>`;
}

export function buildConstructionPacketHtml(
  input: MasonryInput,
  output: MasonryOutput,
): string {
  const capCut = getCapstoneCutMetrics(output);
  const foundationAdvisory = buildFoundationAdvisory(input, output);
  const regionalCodeReview = buildRegionalCodeReview(input, output);
  const svg = buildCoursePlanSvg(output, input);
  const clearanceSvg = buildSafetyClearanceSvg(input, output);
  const warnings =
    output.warnings.length > 0
      ? `<ul>${output.warnings.map((warning) => `<li>${warning.message}${warning.actualValue !== undefined ? ` Entered: ${warning.actualValue.toFixed(1)}${warning.code === 'clearance-too-low' ? ' ft' : warning.code === 'gas-line-near-vent' ? ' deg' : ''}.` : ''}</li>`).join('')}</ul>`
      : '<p>No active safety alerts for the current layout.</p>';
  const ventRange =
    output.ventSpec.recommendedAreaMaxSqIn === undefined
      ? `${output.ventSpec.recommendedAreaMinSqIn.toFixed(1)}+`
      : `${output.ventSpec.recommendedAreaMinSqIn.toFixed(1)}-${output.ventSpec.recommendedAreaMaxSqIn.toFixed(1)}`;
  const recommendedOverheadClearanceFt = input.fuelType === 'wood' ? 21 : 15;
  const gasLineEntry =
    output.ventSpec.gasLineEntryAngleDeg === undefined
      ? '<p>Gas Line Entry: not used for a wood-burning layout.</p>'
      : `<p>Gas Line Entry: ${output.ventSpec.gasLineEntryAngleDeg.toFixed(0)} deg at unit ${output.ventSpec.gasLineEntryBrickIndex} (${output.ventSpec.gasLineEntryClear ? 'clear of vents' : 'conflicts with vent layout'}${output.ventSpec.gasLineAutoAdjusted ? ', auto-adjusted' : ''}).</p>`;
  const taperCutSample = buildWallBrickTaperCutSvg(output);
  const capstonePlacementSample = buildCapstonePlacementSampleSvg(output);
  const capstoneCutTypeSample = buildCapstoneCutTypeDiagramsSvg(output);
  const designSummaryRows: Array<[string, string]> = [
    ['Fuel Type', formatFuelName(input.fuelType)],
    ['Plan Shape', formatShapeName(input.planShape)],
    [
      'Wall Unit Size',
      `${output.resolvedUnit.name} ${output.resolvedUnit.lengthIn.toFixed(3)} in x ${output.resolvedUnit.widthIn.toFixed(3)} in x ${output.resolvedUnit.heightIn.toFixed(3)} in`,
    ],
    ['Joint Width', `${input.mortarJointIn.toFixed(3)} in`],
    ['Wall Height', `${input.wallHeightIn.toFixed(2)} in`],
    [
      'Clearance To Structures',
      `${input.proximityToStructuresFt.toFixed(2)} ft`,
    ],
    [
      'Overhead Clearance',
      `${(input.overheadClearanceFt ?? 20).toFixed(2)} ft`,
    ],
    ['Capstone Overhang', `${input.capstoneOverhangIn.toFixed(2)} in`],
    ['Cap Placement', input.capPlacementMode],
    [
      'Cap Size',
      `${output.resolvedCapUnit.name} ${output.resolvedCapUnit.lengthIn.toFixed(3)} in x ${output.resolvedCapUnit.widthIn.toFixed(3)} in x ${output.resolvedCapUnit.heightIn.toFixed(3)} in`,
    ],
    ['Heat Protection', formatLinerName(output.linerSpec.type)],
    ['Liner Expansion Gap', `${output.linerSpec.expansionGapIn.toFixed(3)} in`],
    ['Thermal Assembly', output.thermalAssembly.description],
  ];
  if (output.logistics.naturalStoneEstimate) {
    designSummaryRows.push(
      [
        'Natural Stone Type',
        (input.naturalStoneType ?? 'unspecified').replace(/-/g, ' '),
      ],
      [
        'Stone Build Method',
        (input.stoneBuildMethod ?? 'dry-stack').replace(/-/g, ' '),
      ],
    );
  }
  const foundationRows: Array<[string, string]> = [
    ['Foundation advisory', foundationAdvisory.heading],
    ['Risk level', foundationAdvisory.risk],
    ['Baseline base material', 'Compacted angular stone (3/4 in minus)'],
    ['Soil type', input.soilType ?? 'unknown'],
    ['Drainage', input.drainageCondition ?? 'unknown'],
    ['Freeze-thaw climate', input.frostClimate ? 'Yes' : 'No'],
    ['Baseline stone depth', `${output.foundation.stoneDepthIn.toFixed(2)} in`],
  ];
  if (output.thermalAssembly.mode === 'double-wall') {
    foundationRows.push(
      ['Cavity width', `${output.thermalAssembly.cavityWidthIn.toFixed(2)} in`],
      ['Tie count', `${output.thermalAssembly.estimatedTieCount}`],
      ['Thermal risk', output.thermalAssembly.riskLevel],
    );
  }
  const capRows: Array<[string, string]> = [
    [
      'Cap Joint At Layout Line',
      `${output.capstone.joint.actualJointIn.toFixed(3)} in`,
    ],
    [
      'Cap Spacing At Layout Line',
      `${output.capstone.joint.actualModuleSpacingIn.toFixed(3)} in`,
    ],
    [
      'Cap Joint At Fire Opening',
      `${output.capstone.joint.innerJointIn.toFixed(3)} in`,
    ],
    [
      'Cap Joint At Outside Edge',
      `${output.capstone.joint.outerJointIn.toFixed(3)} in`,
    ],
  ];
  if (output.thermalAssembly.mode === 'double-wall') {
    const capBridgeRowDetail =
      output.thermalAssembly.capBridgeCourseUnitCounts.length > 0
        ? output.thermalAssembly.capBridgeCourseUnitCounts
            .map((units, idx) => `R${idx + 1}: ${units}`)
            .join(', ')
        : 'n/a';
    capRows.push(
      [
        'Cap Bridge Required Width',
        `${output.thermalAssembly.capBridgeRequiredWidthIn.toFixed(2)} in`,
      ],
      [
        'Cap Bridge Rows',
        `${output.thermalAssembly.capBridgeRows} row(s)`,
      ],
      [
        'Cap Closure Units (before waste)',
        `${output.thermalAssembly.capBridgeAdditionalUnits}`,
      ],
      ['Cap Bridge Row Detail', capBridgeRowDetail],
    );
  }
  const ventRows: Array<[string, string]> = [
    [
      'Gas Hardware Template',
      output.ventSpec.gasHardwareTemplateLabel ?? 'Generic firepit cavity',
    ],
    ['Vent Pattern', output.ventSpec.layout],
    ['Vent Zone', output.ventSpec.placement],
    ['Vent Count', `${output.ventSpec.ventCount}`],
    [
      'Total Open Vent Area',
      `${output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in`,
    ],
    ['Typical Gas Vent Range', `${ventRange} sq in`],
    ['Vent Unit Positions', output.ventSpec.ventBrickIndexes.join(', ')],
  ];
  const cornerRows: Array<[string, string]> = [
    ['Corner interlock required', output.cornerGuidance?.required ? 'Yes' : 'No'],
    [
      'Recommended corner overlap',
      `${(output.cornerGuidance?.recommendedOverlapIn ?? 0).toFixed(2)} in`,
    ],
    [
      'Estimated closure trim per side',
      `${(output.cornerGuidance?.cornerCutPerSideIn ?? 0).toFixed(2)} in`,
    ],
  ];
  const permitChecklistRows = [
    {
      item: 'Combustible setback (10 ft minimum)',
      status: input.proximityToStructuresFt >= 10 ? 'PASS' : 'FAIL',
      detail: `Configured at ${input.proximityToStructuresFt.toFixed(1)} ft.`,
    },
    {
      item: `Overhead combustible clearance (${recommendedOverheadClearanceFt} ft recommended for ${input.fuelType === 'wood' ? 'wood' : 'gas'})`,
      status:
        (input.overheadClearanceFt ?? 20) >= recommendedOverheadClearanceFt
          ? 'PASS'
          : 'REVIEW',
      detail: `Configured at ${(input.overheadClearanceFt ?? 20).toFixed(1)} ft.`,
    },
    ...regionalCodeReview.checks.map((check) => ({
      item: check.title,
      status: check.status.toUpperCase(),
      detail: check.detail,
    })),
  ];
  const cuttingRows: Array<[string, string]> = [
    [
      'Layout-line spacing per unit',
      `${output.cutPlan.centerlineModuleSpacingIn.toFixed(3)} in`,
    ],
    ['Estimated inner joint', `${output.cutPlan.innerJointIn.toFixed(3)} in`],
    ['Taper cuts needed', output.cutPlan.requiresCutting ? 'Yes' : 'No'],
    [
      'Suggested saw angle',
      `${output.cutPlan.recommendedCutAngleDeg.toFixed(2)} deg`,
    ],
    [
      'Suggested taper',
      output.cutPlan.requiresCutting
        ? `${output.cutPlan.recommendedTaperPerBrickIn.toFixed(3)} in per brick (${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in at each side of the inner face)`
        : 'Not required at this diameter',
    ],
  ];
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fire Pit Build Packet</title>
    <style>
      body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #221707; }
      h1, h2 { margin: 0 0 10px; }
      h3 { margin: 12px 0 8px; font-size: 14px; color: #3a2812; }
      .heading { margin-bottom: 14px; }
      .block { border: 1px solid #b9a17a; border-radius: 8px; padding: 12px; margin-bottom: 14px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .split-grid { gap: 12px; align-items: start; }
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
      <h1>Parametric Masonry Designer - Fire Pit Build Packet</h1>
      <p>Generated for a ${formatShapeName(input.planShape)} plan with ${output.innerSpanWidthIn.toFixed(2)} in x ${output.innerSpanDepthIn.toFixed(2)} in inner dimensions.</p>
    </div>

    <section class="block avoid-break">
      <h2>Design Summary</h2>
      ${buildKeyValueTable(designSummaryRows, 'Design Item', 'Value')}
    </section>

    <section class="block avoid-break">
      <h2>Materials And Quantities</h2>
      <h3>Fire Pit Materials</h3>
      ${buildFirePitMaterialsTable(output)}
      <h3>Seating Area Materials</h3>
      ${buildSeatingMaterialsSection(output)}
    </section>

    <section class="block avoid-break">
      <h2>Foundation Review</h2>
      <p>Review scale: Low = baseline-friendly site, Moderate = verify field conditions, High = footing/drainage/frost review recommended before construction.</p>
      <p>This review level combines footprint size with soil, drainage, and freeze-thaw context. It does not override the locked base quantity calculation.</p>
      ${buildKeyValueTable(foundationRows, 'Foundation Check', 'Status')}
      <ul>${foundationAdvisory.checks.map((check) => `<li>${check}</li>`).join('')}</ul>
    </section>

    <section class="block avoid-break">
      <h2>Permit + Inspection Checklist</h2>
      <p>Use this table as a pre-permit and pre-ignition review record. Final acceptance still depends on local authority and fuel hardware documentation.</p>
      ${buildPermitChecklistTable(permitChecklistRows)}
    </section>

    <section class="block avoid-break">
      <h2>Cap Layout</h2>
      ${buildKeyValueTable(capRows, 'Cap Parameter', 'Value')}
      <p>${output.planShape === 'circular' ? (capCut.requiresCutting ? `Capstone inner-edge overlap detected. Taper each cap unit by about ${capCut.recommendedCutPerSideIn.toFixed(3)} in per side at ${capCut.recommendedCutAngleDeg.toFixed(2)} deg.` : 'Capstone joints are buildable without taper cuts at this current diameter.') : 'Cap joints are shown at their resolved installed width.'}</p>
      ${output.planShape === 'circular' ? `<p>Approximate pit inner diameter for no cap taper cuts at this cap count: ${capCut.minimumRecommendedPitInnerDiameterIn.toFixed(2)} in.</p>` : ''}
      ${output.thermalAssembly.mode === 'double-wall' ? `<h3>Cap Bridge Row Schedule</h3><p>Rows are listed from inside to outside. Joint and cut guidance are computed per row to avoid overlap and preserve buildable spacing.</p>${buildCapBridgeRowScheduleTable(output, capCut)}` : ''}
      <h3>Capstone Placement Detail</h3>
      ${capstonePlacementSample}
      <h3>Capstone Cut Type Diagrams</h3>
      ${capstoneCutTypeSample}
    </section>

    <section class="block avoid-break">
      <h2>Venting And Heat Protection</h2>
      ${buildKeyValueTable(ventRows, 'Venting Parameter', 'Value')}
      ${gasLineEntry}
      <p>Heat Protection Note: ${output.linerSpec.description}</p>
      <p>Liner venting note: wall vent gaps provide the primary vent path in this model. Do not block the cavity or expansion gap, and verify any dedicated vent or drain requirements from the liner, burner, or ring manufacturer.</p>
      ${output.linerSpec.enabled ? `<p>Liner outside diameter: ${output.linerSpec.linerOuterDiameterIn.toFixed(2)} in. Liner inside diameter: ${output.linerSpec.linerInnerDiameterIn.toFixed(2)} in.</p>` : ''}
      <h3>Thermal Assembly</h3>
      ${buildKeyValueTable(
        [
          ['Mode', output.thermalAssembly.mode],
          ['Fill', output.thermalAssembly.cavityFill.replace('-', ' ')],
          ['Cavity Vent Mode', output.thermalAssembly.cavityVentMode],
          ['Cavity Width', `${output.thermalAssembly.cavityWidthIn.toFixed(2)} in`],
          ...(output.thermalAssembly.mode === 'double-wall'
            ? ([
                [
                  'Cap Bridge Width',
                  `${output.thermalAssembly.capBridgeRequiredWidthIn.toFixed(2)} in`,
                ],
                ['Cap Bridge Rows', `${output.thermalAssembly.capBridgeRows}`],
                [
                  'Cap Closure Units',
                  `${output.thermalAssembly.capBridgeAdditionalUnits}`,
                ],
                [
                  'Cap Bridge Row Detail',
                  output.thermalAssembly.capBridgeCourseUnitCounts
                    .map((units, idx) => `R${idx + 1}: ${units}`)
                    .join(', '),
                ],
              ] as Array<[string, string]>)
            : []),
          ['Risk Level', output.thermalAssembly.riskLevel],
        ],
        'Assembly Parameter',
        'Value',
      )}
      <ul>${output.thermalAssembly.notes.map((note) => `<li>${note}</li>`).join('')}</ul>
    </section>

    ${buildSmokelessPlanningHtml(output)}

    ${
      output.planShape === 'rectangular' || output.planShape === 'square'
        ? `<section class="block avoid-break">
      <h2>Rectangular Corner Interlock Guidance</h2>
      ${buildKeyValueTable(cornerRows, 'Corner Parameter', 'Value')}
      <ul>${(output.cornerGuidance?.notes ?? []).map((note) => `<li>${note}</li>`).join('')}</ul>
    </section>`
        : ''
    }

    <section class="block avoid-break">
      <h2>Cutting Notes</h2>
      <p>This section covers wall brick taper cuts only. Capstones are documented in the Cap Layout section.</p>
      ${buildKeyValueTable(cuttingRows, 'Cutting Parameter', 'Value')}
      ${output.cutPlan.requiresCutting ? `<p>Suggested taper: ${output.cutPlan.recommendedTaperPerBrickIn.toFixed(3)} in per brick (${output.cutPlan.recommendedCutPerSideIn.toFixed(3)} in at each side of the inner face).</p><p>Approximate inner diameter with no taper cuts: ${output.cutPlan.minimumRecommendedInnerDiameterIn.toFixed(2)} in.</p>` : ''}
      ${buildCutMethodGuidanceHtml(output)}
      <ul>${output.cutPlan.notes.map((note) => `<li>${note}</li>`).join('')}</ul>
      <h3>Wall Brick Cut Detail</h3>
      ${taperCutSample}
      <h3>Cut Schedule</h3>
      ${buildCutScheduleTablesHtml(output)}
    </section>

    <section class="block avoid-break">
      <h2>Safety Review</h2>
      ${warnings}
      ${clearanceSvg}
    </section>

    <section class="block print-break-before">
      <h2>Build Sequence</h2>
      <p>Follow this sequence in order. Dry-fit critical components before mortar is placed, and confirm all field dimensions match the packet before cutting material.</p>
      ${buildDiyStepsHtml(input, output)}
    </section>

    <section class="block print-break-before">
      <h2>Layer-By-Layer Layout</h2>
      <p>Course legend: C1 is the bottom wall course. In double-wall plans C1 is the bottom inner-wall course, O1 is the matching outer-wall course, and CAP R1/R2/etc are capstone bridge rows from inside to outside.</p>
      <p>Red highlights indicate planned vent openings. Blue highlights indicate gas line entry. Dark highlights indicate ash cleanout locations. Units marked C are corner/cut units that need extra dry-fit attention, not vent openings.</p>
      <p>Course strategy: ${output.courseStrategy.strategy}. ${output.courseStrategy.strategy === 'shim-spacer' ? `Shim spacer units planned: ${output.courseStrategy.shimUnitCount}.` : output.courseStrategy.strategy === 'vented-accent' ? `Accent courses: ${output.courseStrategy.accentCourseIndexes.map((index) => `C${index + 1}`).join(', ') || 'none'}.` : 'No special course overrides active.'}</p>
      ${svg}
      ${output.thermalAssembly.mode === 'double-wall' ? `<h3>Capstone Course Rows</h3>${buildCapBridgeRowScheduleTable(output, capCut)}` : ''}
    </section>
  </body>
</html>`;
}

export function buildEngineeringReportHtml(
  input: MasonryInput,
  output: MasonryOutput,
): string {
  const generatedOn = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const foundationAdvisory = buildFoundationAdvisory(input, output);
  const clearanceSvg = buildSafetyClearanceSvg(input, output);
  const layoutSvg = buildCoursePlanSvg(output, input);
  const warningList =
    output.warnings.length > 0
      ? `<ul>${output.warnings.map((warning) => `<li>${warning.message}</li>`).join('')}</ul>`
      : '<p>No active safety warnings under the current model settings.</p>';

  const ventRange =
    output.ventSpec.recommendedAreaMaxSqIn === undefined
      ? `${output.ventSpec.recommendedAreaMinSqIn.toFixed(1)}+`
      : `${output.ventSpec.recommendedAreaMinSqIn.toFixed(1)}-${output.ventSpec.recommendedAreaMaxSqIn.toFixed(1)}`;
  const recommendedOverheadClearanceFt = input.fuelType === 'wood' ? 21 : 15;

  const summaryRows: Array<[string, string]> = [
    ['Report type', 'Preliminary engineering planning report'],
    ['Generated on', generatedOn],
    ['Plan shape', formatShapeName(input.planShape)],
    ['Fuel type', formatFuelName(input.fuelType)],
    [
      'Inner fire opening',
      `${output.innerSpanWidthIn.toFixed(2)} in x ${output.innerSpanDepthIn.toFixed(2)} in`,
    ],
    ['Wall height', `${input.wallHeightIn.toFixed(2)} in`],
    ['Structure setback', `${input.proximityToStructuresFt.toFixed(2)} ft`],
    [
      'Foundation footprint',
      `${output.foundation.footprintWidthIn.toFixed(2)} in x ${output.foundation.footprintDepthIn.toFixed(2)} in`,
    ],
    ['Foundation advisory', foundationAdvisory.heading],
  ];

  const complianceRows: Array<[string, string]> = [
    [
      'Combustible setback (10 ft min)',
      input.proximityToStructuresFt >= 10
        ? 'PASS'
        : `FAIL (configured ${input.proximityToStructuresFt.toFixed(2)} ft)`,
    ],
    [
      'Fuel gas vent area',
      input.fuelType === 'wood'
        ? 'N/A for wood fuel mode'
        : `${output.ventSpec.totalOpenAreaSqIn.toFixed(1)} sq in (typical range ${ventRange} sq in)`,
    ],
    [
      'Gas hardware template',
      input.fuelType === 'wood'
        ? 'N/A'
        : (output.ventSpec.gasHardwareTemplateLabel ?? 'Generic firepit cavity'),
    ],
    [
      'Overhead clearance',
      `${(input.overheadClearanceFt ?? 20).toFixed(1)} ft (recommended baseline for ${input.fuelType === 'wood' ? 'wood' : 'gas'}: ${recommendedOverheadClearanceFt} ft)`,
    ],
    [
      'Site/foundation context',
      `${input.soilType ?? 'unknown'} soil, ${input.drainageCondition ?? 'unknown'} drainage, ${input.frostClimate ? 'freeze-thaw' : 'minimal frost risk'}`,
    ],
    [
      'Heat protection system',
      `${formatLinerName(output.linerSpec.type)} (${output.linerSpec.description})`,
    ],
  ];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fire Pit Professional Engineering Report</title>
    <style>
      body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #1f1508; }
      h1, h2, h3 { margin: 0 0 10px; }
      h1 { font-size: 28px; letter-spacing: 0.02em; }
      h2 { font-size: 18px; margin-top: 8px; }
      h3 { font-size: 14px; color: #3f2b12; margin-top: 10px; }
      p { margin: 6px 0; line-height: 1.45; }
      ul { margin: 8px 0 0 18px; }
      li { margin: 5px 0; }
      .block { border: 1px solid #bca684; border-radius: 8px; padding: 12px; margin-bottom: 14px; }
      .muted { color: #6f5434; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
      th, td { border: 1px solid #ccb694; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #f5ead8; }
      .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .break-before { page-break-before: always; break-before: page; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
      .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 18px; }
      .signature-box { border-top: 1px solid #8a724f; padding-top: 6px; min-height: 52px; }
      .small { font-size: 11px; }
      .report-footer { display: none; }
      @media print {
        @page { size: letter portrait; margin: 0.45in; }
        body { margin: 0; }
        .report-footer {
          display: block;
          position: fixed;
          bottom: 0.1in;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 10px;
          color: #7a6447;
        }
      }
    </style>
  </head>
  <body>
    <section class="block avoid-break">
      <h1>Professional Engineering Report</h1>
      <p class="muted">Parametric Masonry Fire Pit Design Review</p>
      <p class="small">
        This report is an engineering-aware planning document generated from user inputs and geometric rules.
        Final jurisdictional compliance, permit acceptance, and stamped design approval remain project-specific.
      </p>
    </section>

    <section class="block avoid-break">
      <h2>1. Executive Summary</h2>
      ${buildKeyValueTable(summaryRows, 'Item', 'Value')}
      <p>
        Current design resolves to <strong>${output.totalUnits}</strong> total wall units,
        <strong>${output.capstone.capUnitsPerCourseRounded}</strong> cap units per course,
        and approximately <strong>${output.foundation.stoneVolumeCubicYards.toFixed(2)} yd³</strong> of foundation stone.
      </p>
    </section>

    <section class="block avoid-break">
      <h2>2. Safety + Compliance Review</h2>
      ${buildKeyValueTable(complianceRows, 'Check', 'Status / Notes')}
      <h3>Active warnings</h3>
      ${warningList}
    </section>

    <section class="block avoid-break">
      <h2>3. Foundation Review</h2>
      <p><strong>${foundationAdvisory.heading}</strong></p>
      <ul>${foundationAdvisory.checks.map((check) => `<li>${check}</li>`).join('')}</ul>
      <p class="small">
        Baseline model values: ${output.foundation.stoneDepthIn.toFixed(1)} in compacted angular stone,
        ${output.foundation.footprintAreaSquareFeet.toFixed(1)} ft² footprint, ${output.foundation.stoneVolumeCubicFeet.toFixed(1)} ft³ base volume.
      </p>
    </section>

    <section class="block avoid-break">
      <h2>4. Materials Summary</h2>
      ${buildFirePitMaterialsTable(output)}
      <h3>Seating area materials</h3>
      ${buildSeatingMaterialsSection(output)}
    </section>

    ${
      output.smokelessSpec?.enabled
        ? `<section class="block avoid-break">
      <h2>Smokeless Insert Hole Guide</h2>
      <p class="small">Smokeless secondary-combustion mode is enabled. Use this drill pattern and spacing schedule when fabricating or verifying the insert.</p>
      ${buildSmokelessHoleGuideHtml(output)}
    </section>`
        : ''
    }

    <section class="block break-before">
      <h2>5. Setback Diagram</h2>
      ${clearanceSvg}
    </section>

    <section class="block avoid-break">
      <h2>6. Course Layout Diagram</h2>
      <p class="small">C1 is the lowest course and CAP is the capstone layer.</p>
      ${layoutSvg}
    </section>

    <section class="block avoid-break">
      <h2>7. Professional Sign-Off</h2>
      <p class="small">For licensed engineer, reviewer, or authority having jurisdiction.</p>
      <div class="signature-row">
        <div class="signature-box">Engineer / Reviewer Name & Signature</div>
        <div class="signature-box">License # / Company / Date</div>
      </div>
    </section>
    <section class="block avoid-break">
      <h2>8. Assumptions And Limitations</h2>
      <ul>
        <li>This report is generated from user-provided inputs and the app's baseline engineering assumptions.</li>
        <li>Foundation quantity math remains on the fixed baseline model and does not replace site-specific geotechnical design.</li>
        <li>Local permitting requirements, HOA rules, and jurisdiction-specific code interpretation must be verified by the project owner/reviewer.</li>
        <li>For final construction and stamp-ready deliverables, have a licensed professional review this output in project context.</li>
      </ul>
    </section>
    <div class="report-footer">
      Parametric Masonry Designer • Professional Engineering Report • Generated ${generatedOn}
    </div>
  </body>
</html>`;
}
