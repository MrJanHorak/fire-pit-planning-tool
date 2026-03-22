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

export function buildCoursePlanSvg(output: MasonryOutput): string {
  const rowHeight = 26;
  const svgHeight = output.courses.length * rowHeight + 28;

  const rows = output.courses
    .map((course, idx) => {
      const y = 18 + idx * rowHeight;
      const modulePx = 48;
      const offsetPx = course.offsetIn > 0 ? modulePx / 2 : 0;
      const ventCourse = output.ventSpec.targetCourseIndexes.includes(
        course.courseIndex,
      );

      const bricks = Array.from({ length: course.unitCount }, (_, brickIdx) => {
        const fill = ventCourse && brickIdx % 5 === 0 ? '#c13a1f' : '#b66a34';
        const opacity = ventCourse && brickIdx % 5 === 0 ? '0.85' : '0.72';

        return `<rect x="${52 + offsetPx + brickIdx * modulePx}" y="${y}" width="${modulePx - 4}" height="16" rx="2" fill="${fill}" opacity="${opacity}" />`;
      }).join('');

      return `<g><text x="8" y="${y + 13}" font-size="11" fill="#3c2a11">C${course.courseIndex + 1}</text>${bricks}</g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 ${svgHeight}" width="940" height="${svgHeight}">${rows}</svg>`;
}

export function buildSafetyClearanceSvg(
  input: MasonryInput,
  output: MasonryOutput,
): string {
  const requiredClearanceIn = 120;
  const actualClearanceIn = input.proximityToStructuresFt * 12;
  const pitOuterRadiusIn = output.effectiveOuterDiameterIn / 2;

  const displayRadius = 168;
  const center = 190;
  const ringScale = displayRadius / requiredClearanceIn;
  const pitRadiusPx = Math.max(8, pitOuterRadiusIn * ringScale);
  const requiredRingPx = requiredClearanceIn * ringScale;
  const actualRadiusPx = Math.min(
    requiredRingPx,
    Math.max(0, actualClearanceIn * ringScale),
  );
  const structureX = center + actualRadiusPx;
  const safetyPass = input.proximityToStructuresFt >= 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380" width="640" height="380">
    <rect x="0" y="0" width="640" height="380" fill="#fffdf7" />
    <text x="18" y="28" font-size="15" fill="#2f2110" font-weight="700">10 ft Clearance Ring Diagram</text>
    <text x="18" y="48" font-size="12" fill="#4a3720">Required setback from combustible structures is 10 ft minimum.</text>

    <circle cx="${center}" cy="190" r="${requiredRingPx}" fill="none" stroke="#a94d24" stroke-width="2" stroke-dasharray="7 5" />
    <circle cx="${center}" cy="190" r="${pitRadiusPx}" fill="#9d5a2b" opacity="0.85" />
    <line x1="${center}" y1="190" x2="${structureX}" y2="190" stroke="${safetyPass ? '#2f6d3f' : '#a01d1d'}" stroke-width="3" />
    <circle cx="${structureX}" cy="190" r="7" fill="${safetyPass ? '#2f6d3f' : '#a01d1d'}" />

    <text x="390" y="138" font-size="12" fill="#4a3720">Dashed ring = 10 ft required</text>
    <text x="390" y="160" font-size="12" fill="#4a3720">Actual distance = ${input.proximityToStructuresFt.toFixed(2)} ft</text>
    <text x="390" y="182" font-size="12" fill="#4a3720">Outer pit diameter = ${output.effectiveOuterDiameterIn.toFixed(2)} in</text>
    <text x="390" y="204" font-size="12" fill="${safetyPass ? '#2f6d3f' : '#a01d1d'}">Status = ${safetyPass ? 'PASS' : 'FAIL'}</text>
  </svg>`;
}

export function buildConstructionPacketHtml(
  input: MasonryInput,
  output: MasonryOutput,
): string {
  const svg = buildCoursePlanSvg(output);
  const clearanceSvg = buildSafetyClearanceSvg(input, output);
  const warnings =
    output.warnings.length > 0
      ? `<ul>${output.warnings.map((warning) => `<li>${warning.message} Entered: ${warning.actualValue.toFixed(1)} ft.</li>`).join('')}</ul>`
      : '<p>No safety clearance warnings.</p>';

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
      <p>Generated for a ${input.innerDiameterIn.toFixed(2)} in inner diameter circular pit.</p>
    </div>

    <section class="block avoid-break">
      <h2>Engineering Inputs</h2>
      <div class="grid">
        <p>Fuel Type: ${formatFuelName(input.fuelType)}</p>
        <p>Mortar Joint: ${input.mortarJointIn.toFixed(3)} in</p>
        <p>Wall Height: ${input.wallHeightIn.toFixed(2)} in</p>
        <p>Structure Proximity: ${input.proximityToStructuresFt.toFixed(2)} ft</p>
        <p>Capstone Overhang: ${input.capstoneOverhangIn.toFixed(2)} in</p>
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
        <p>Footprint Diameter: ${output.foundation.footprintDiameterIn.toFixed(2)} in</p>
      </div>
    </section>

    <section class="block avoid-break">
      <h2>Safety Check</h2>
      ${warnings}
      ${clearanceSvg}
    </section>

    <section class="block print-break-before">
      <h2>Layer-by-Layer Plan</h2>
      <p>Red highlights indicate vent-targeted locations within vent courses.</p>
      ${svg}
    </section>
  </body>
</html>`;
}
