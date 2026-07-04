import { useState } from 'react';
import type { MasonryOutput } from '../types';

const BOM_COSTS_STORAGE_KEY =
  'firepit-parametric-masonry-designer-bom-costs';

const MORTAR_BAG_80LB_FT3 = 0.45; // cubic feet yielded per 80-lb bag

interface BomCosts {
  wallUnit: string;
  capUnit: string;
  mortarBag: string;
  gravelTon: string;
  linerUnit: string;
  stoneTon: string;
  seatingMats: Record<string, string>;
}

function defaultCosts(): BomCosts {
  return {
    wallUnit: '',
    capUnit: '',
    mortarBag: '',
    gravelTon: '',
    linerUnit: '',
    stoneTon: '',
    seatingMats: {},
  };
}

function loadCosts(): BomCosts {
  try {
    const raw = localStorage.getItem(BOM_COSTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BomCosts>;
      return {
        ...defaultCosts(),
        ...parsed,
        seatingMats: {
          ...defaultCosts().seatingMats,
          ...(parsed.seatingMats ?? {}),
        },
      };
    }
  } catch {
    // ignore
  }
  return defaultCosts();
}

function saveCosts(costs: BomCosts) {
  try {
    localStorage.setItem(BOM_COSTS_STORAGE_KEY, JSON.stringify(costs));
  } catch {
    // ignore
  }
}

function parseDollar(value: string): number {
  const n = parseFloat(value.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmtDollar(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Shared number input used in cost rows */
function CostInput({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className='flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900/75'>
      {label && <span>{label}</span>}
      <input
        type='number'
        min='0'
        step='0.01'
        placeholder='0.00'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='w-24 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-950 outline-none focus:border-amber-500'
      />
    </label>
  );
}

interface BomTableRow {
  key: string;
  item: string;
  detail: string;
  qty: number;
  qtyDisplay?: string;
  unit: string;
  unitPrice: string;
  onUnitPriceChange: (value: string) => void;
  lineTotal: number;
}

interface Props {
  output: MasonryOutput;
}

export default function BillOfMaterials({ output }: Props) {
  const [costs, setCosts] = useState<BomCosts>(loadCosts);

  const { logistics, resolvedUnit, resolvedCapUnit, linerSpec, foundation } =
    output;

  const mortarBags = Math.ceil(
    logistics.estimatedMortarVolumeCubicFeet / MORTAR_BAG_80LB_FT3,
  );
  const gravelTons = parseFloat(
    (logistics.estimatedStoneWeightLb / 2000).toFixed(2),
  );
  // Mid-range tonnage for natural stone cost estimate
  const stoneAvgTons = logistics.naturalStoneEstimate
    ? (logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste10Pct +
        logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste15Pct) /
      2
    : 0;

  // --- price lookups ---
  const wallUnitPrice = parseDollar(costs.wallUnit);
  const capUnitPrice = parseDollar(costs.capUnit);
  const mortarBagPrice = parseDollar(costs.mortarBag);
  const gravelTonPrice = parseDollar(costs.gravelTon);
  const linerUnitPrice = parseDollar(costs.linerUnit);
  const stoneTonPrice = parseDollar(costs.stoneTon);

  // --- line totals ---
  const thermalAssemblyNetUnits = logistics.thermalAssemblyAdditionalUnits ?? 0;
  const thermalAssemblyPurchasedUnits =
    output.thermalAssembly.mode === 'double-wall'
      ? Math.ceil(
          thermalAssemblyNetUnits * (1 + logistics.wasteFactorPct / 100),
        )
      : 0;
  const thermalCapBridgePurchasedUnits =
    output.thermalAssembly.mode === 'double-wall'
      ? (logistics.thermalCapBridgePurchasedUnits ?? 0)
      : 0;
  const totalWallUnitsPurchased =
    logistics.purchasedUnits + thermalAssemblyPurchasedUnits;
  const wallUnitsForPricing =
    output.thermalAssembly.mode === 'double-wall'
      ? totalWallUnitsPurchased
      : logistics.purchasedUnits;
  const wallTotal = wallUnitPrice * wallUnitsForPricing;
  const capTotal = capUnitPrice * logistics.purchasedCapUnits;
  const capBridgeTotal = capUnitPrice * thermalCapBridgePurchasedUnits;
  const mortarTotal = mortarBagPrice * mortarBags;
  const gravelTotal = gravelTonPrice * gravelTons;
  const linerTotal = linerSpec.enabled ? linerUnitPrice : 0;
  const stoneTotal = logistics.naturalStoneEstimate
    ? stoneTonPrice * stoneAvgTons
    : 0;
  const seatingTotals = (logistics.seatingAreaMaterials?.materials ?? []).map(
    (mat) => parseDollar(costs.seatingMats[mat.name] ?? '') * mat.quantity,
  );
  const seatingGrandTotal = seatingTotals.reduce((a, b) => a + b, 0);

  const grandTotal =
    wallTotal +
    capTotal +
    capBridgeTotal +
    mortarTotal +
    gravelTotal +
    linerTotal +
    stoneTotal +
    seatingGrandTotal;
  const hasCostData = grandTotal > 0;

  // --- update helpers ---
  const updateCost = (key: keyof Omit<BomCosts, 'seatingMats'>, value: string) => {
    const next = { ...costs, [key]: value };
    setCosts(next);
    saveCosts(next);
  };

  const updateSeatingCost = (name: string, value: string) => {
    const next: BomCosts = {
      ...costs,
      seatingMats: { ...costs.seatingMats, [name]: value },
    };
    setCosts(next);
    saveCosts(next);
  };

  const wallSpec = `${resolvedUnit.name} — ${resolvedUnit.lengthIn}"L × ${resolvedUnit.widthIn}"W × ${resolvedUnit.heightIn}"H`;
  const capSpec = `${resolvedCapUnit.name} — ${resolvedCapUnit.lengthIn}"L × ${resolvedCapUnit.widthIn}"W × ${resolvedCapUnit.heightIn}"H`;
  const capBridgeRowBreakdown =
    output.thermalAssembly.capBridgeCourseUnitCounts.length > 0
      ? output.thermalAssembly.capBridgeCourseUnitCounts
          .map((units, idx) => `R${idx + 1}: ${units}`)
          .join(', ')
      : '';
  const bomRows: BomTableRow[] = [
    {
      key: 'wall-units',
      item:
        output.thermalAssembly.mode === 'double-wall'
          ? 'Wall Units (Double-Wall Total)'
          : 'Wall Units',
      detail:
        output.thermalAssembly.mode === 'double-wall'
          ? `${wallSpec} · inner ${logistics.purchasedUnits} + outer ${thermalAssemblyPurchasedUnits} units · ${logistics.wasteFactorPct}% waste included`
          : `${wallSpec} · ${logistics.wasteFactorPct}% waste included`,
      qty: wallUnitsForPricing,
      unit: 'ea',
      unitPrice: costs.wallUnit,
      onUnitPriceChange: (value) => updateCost('wallUnit', value),
      lineTotal: wallTotal,
    },
    {
      key: 'capstones',
      item: 'Capstones',
      detail: `${capSpec} · ${logistics.wasteFactorPct}% waste included`,
      qty: logistics.purchasedCapUnits,
      unit: 'ea',
      unitPrice: costs.capUnit,
      onUnitPriceChange: (value) => updateCost('capUnit', value),
      lineTotal: capTotal,
    },
    ...(thermalCapBridgePurchasedUnits > 0
      ? ([
          {
            key: 'cap-bridge',
            item: 'Cap Closure Units (Rows 2+)',
            detail: `${capSpec} · double-wall bridge closure${capBridgeRowBreakdown ? ` · ${capBridgeRowBreakdown}` : ''}`,
            qty: thermalCapBridgePurchasedUnits,
            unit: 'ea',
            unitPrice: costs.capUnit,
            onUnitPriceChange: (value) => updateCost('capUnit', value),
            lineTotal: capBridgeTotal,
          },
        ] satisfies BomTableRow[])
      : []),
    {
      key: 'mortar',
      item: 'Type S Mortar',
      detail: `~${MORTAR_BAG_80LB_FT3} ft³ yield per bag · round up at the yard`,
      qty: mortarBags,
      qtyDisplay: `${mortarBags}`,
      unit: 'bags',
      unitPrice: costs.mortarBag,
      onUnitPriceChange: (value) => updateCost('mortarBag', value),
      lineTotal: mortarTotal,
    },
    {
      key: 'gravel',
      item: 'Compacted Gravel',
      detail: `Footprint ${foundation.footprintAreaSquareFeet.toFixed(1)} ft² · ${foundation.stoneVolumeCubicYards.toFixed(2)} yd³`,
      qty: foundation.stoneVolumeCubicFeet,
      qtyDisplay: foundation.stoneVolumeCubicFeet.toFixed(1),
      unit: 'cu ft',
      unitPrice: costs.gravelTon,
      onUnitPriceChange: (value) => updateCost('gravelTon', value),
      lineTotal: gravelTotal,
    },
  ];

  if (linerSpec.enabled) {
    bomRows.push({
      key: 'liner',
      item:
        linerSpec.type === 'fire-brick'
          ? 'Thermal Liner (Fire Brick)'
          : linerSpec.type === 'steel-ring'
            ? 'Thermal Liner (Steel Ring)'
            : 'Thermal Liner',
      detail: `${linerSpec.thicknessIn}" thick · ${linerSpec.description}`,
      qty: 1,
      unit: 'job',
      unitPrice: costs.linerUnit,
      onUnitPriceChange: (value) => updateCost('linerUnit', value),
      lineTotal: linerTotal,
    });
  }

  if (logistics.naturalStoneEstimate) {
    bomRows.push({
      key: 'natural-stone',
      item: 'Natural Stone Wall',
      detail: `${logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste10Pct.toFixed(2)}–${logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste15Pct.toFixed(2)} tons · ${logistics.naturalStoneEstimate.faceAreaSquareFeet.toFixed(1)} ft² face area`,
      qty: stoneAvgTons,
      qtyDisplay: stoneAvgTons.toFixed(2),
      unit: 'tons',
      unitPrice: costs.stoneTon,
      onUnitPriceChange: (value) => updateCost('stoneTon', value),
      lineTotal: stoneTotal,
    });
  }

  (logistics.seatingAreaMaterials?.materials ?? []).forEach((mat, i) => {
    bomRows.push({
      key: `seating-${mat.name}`,
      item: `Seating Surface — ${mat.name}`,
      detail: `${Math.round(logistics.seatingAreaMaterials!.areaSquareFeet)} ft² seating area`,
      qty: mat.quantity,
      qtyDisplay: mat.quantity.toFixed(1),
      unit: mat.unit,
      unitPrice: costs.seatingMats[mat.name] ?? '',
      onUnitPriceChange: (value) => updateSeatingCost(mat.name, value),
      lineTotal: seatingTotals[i] ?? 0,
    });
  });

  const handlePrint = () => {
    const allCostRows: string[] = [];
    if (hasCostData) {
      if (wallTotal > 0)
        allCostRows.push(
          output.thermalAssembly.mode === 'double-wall'
            ? `<tr><td>Wall Units (${wallUnitsForPricing} total = ${logistics.purchasedUnits} inner + ${thermalAssemblyPurchasedUnits} outer, incl. waste × ${fmtDollar(wallUnitPrice)})</td><td>${fmtDollar(wallTotal)}</td></tr>`
            : `<tr><td>Wall Units (${wallUnitsForPricing} × ${fmtDollar(wallUnitPrice)})</td><td>${fmtDollar(wallTotal)}</td></tr>`,
        );
      if (capTotal > 0)
        allCostRows.push(`<tr><td>Capstones (${logistics.purchasedCapUnits} × ${fmtDollar(capUnitPrice)})</td><td>${fmtDollar(capTotal)}</td></tr>`);
      if (capBridgeTotal > 0)
        allCostRows.push(`<tr><td>Cap Closure Units (Rows 2+, ${thermalCapBridgePurchasedUnits} × ${fmtDollar(capUnitPrice)})</td><td>${fmtDollar(capBridgeTotal)}</td></tr>`);
      if (mortarTotal > 0)
        allCostRows.push(`<tr><td>Mortar Mix (~${mortarBags} bags × ${fmtDollar(mortarBagPrice)})</td><td>${fmtDollar(mortarTotal)}</td></tr>`);
      if (gravelTotal > 0)
        allCostRows.push(`<tr><td>Foundation Gravel (${gravelTons} tons × ${fmtDollar(gravelTonPrice)})</td><td>${fmtDollar(gravelTotal)}</td></tr>`);
      if (linerTotal > 0)
        allCostRows.push(`<tr><td>Thermal Liner (1 unit)</td><td>${fmtDollar(linerTotal)}</td></tr>`);
      if (stoneTotal > 0)
        allCostRows.push(`<tr><td>Natural Stone Wall (~${stoneAvgTons.toFixed(2)} tons × ${fmtDollar(stoneTonPrice)})</td><td>${fmtDollar(stoneTotal)}</td></tr>`);
      (logistics.seatingAreaMaterials?.materials ?? []).forEach((mat, i) => {
        const t = seatingTotals[i];
        const p = parseDollar(costs.seatingMats[mat.name] ?? '');
        if (t > 0)
          allCostRows.push(`<tr><td>${mat.name} (${mat.quantity.toFixed(1)} ${mat.unit} × ${fmtDollar(p)})</td><td>${fmtDollar(t)}</td></tr>`);
      });
      allCostRows.push(`<tr class="total-row"><td><strong>Estimated Total</strong></td><td><strong>${fmtDollar(grandTotal)}</strong></td></tr>`);
    }

    const stoneRow = logistics.naturalStoneEstimate
      ? `<tr><td><strong>Natural Stone Wall</strong></td><td>Fieldstone / Ledgestone</td><td>${logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste10Pct.toFixed(2)}–${logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste15Pct.toFixed(2)} tons</td><td>${logistics.naturalStoneEstimate.faceAreaSquareFeet.toFixed(1)} ft² face area</td><td></td></tr>`
      : '';
    const baseCapWeightLb = Math.max(
      0,
      logistics.estimatedCapWeightLb - (logistics.thermalCapBridgeWeightLb ?? 0),
    );
    const capBridgeRow =
      thermalCapBridgePurchasedUnits > 0
        ? `<tr><td><strong>Cap Closure Units (Rows 2+)</strong></td><td>${capSpec}</td><td>${thermalCapBridgePurchasedUnits} units</td><td>Double-wall cap bridge closure${capBridgeRowBreakdown ? ` · ${capBridgeRowBreakdown}` : ''}</td><td>${Math.round(logistics.thermalCapBridgeWeightLb ?? 0).toLocaleString()} lb</td></tr>`
        : '';
    const linerRow = linerSpec.enabled
      ? `<tr><td><strong>Thermal Liner</strong></td><td>${linerSpec.type === 'fire-brick' ? 'Fire Brick Liner' : linerSpec.type === 'steel-ring' ? 'Steel Ring Insert' : linerSpec.type}</td><td>${linerSpec.thicknessIn}" thick</td><td>${linerSpec.description}</td><td></td></tr>`
      : '';
    const seatingRows = (logistics.seatingAreaMaterials?.materials ?? [])
      .map((mat) =>
        `<tr><td><strong>Seating Surface</strong></td><td>${mat.name}</td><td>${mat.quantity.toFixed(1)} ${mat.unit}</td><td>${Math.round(logistics.seatingAreaMaterials!.areaSquareFeet)} ft² area</td><td>${mat.estimatedWeightLb ? Math.round(mat.estimatedWeightLb).toLocaleString() + ' lb' : ''}</td></tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Bill of Materials — Firepit</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; font-size: 12px; color: #1a1208; padding: 32px 40px; }
    h1 { font-size: 20px; font-weight: 700; letter-spacing: .06em; margin-bottom: 2px; }
    .subtitle { font-size: 11px; color: #6b4e26; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #4a2e0a; color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; }
    td { padding: 6px 10px; border-bottom: 1px solid #e0cba8; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #faf6ee; }
    .costs-table th { background: #1e4d24; }
    .costs-table td:last-child { text-align: right; font-weight: 600; }
    .total-row td { font-weight: 700; background: #f0faf0 !important; border-top: 2px solid #1e4d24; }
    .footer { margin-top: 20px; font-size: 10px; color: #8a6a3a; border-top: 1px solid #d4b896; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>Bill of Materials</h1>
  <p class="subtitle">
    Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;·&nbsp;
    All quantities include ${logistics.wasteFactorPct}% waste factor
  </p>

  <table>
    <thead>
      <tr><th>Category</th><th>Specification</th><th>Quantity</th><th>Notes</th><th>Weight</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Wall Units</strong></td><td>${wallSpec}</td><td>${logistics.purchasedUnits} units</td><td>${logistics.wasteFactorPct}% waste · ${output.totalUnits} net required</td><td>${Math.round(logistics.estimatedBrickWeightLb).toLocaleString()} lb</td></tr>
      <tr><td><strong>Capstones</strong></td><td>${capSpec}</td><td>${logistics.purchasedCapUnits} units</td><td>${logistics.wasteFactorPct}% waste included</td><td>${Math.round(baseCapWeightLb).toLocaleString()} lb</td></tr>
      ${capBridgeRow}
      <tr><td><strong>Mortar Mix</strong></td><td>Type S / N premix (80-lb bags)</td><td>~${mortarBags} bags</td><td>${logistics.estimatedMortarVolumeCubicFeet.toFixed(1)} ft³ · ${MORTAR_BAG_80LB_FT3} ft³/bag yield</td><td>—</td></tr>
      <tr><td><strong>Foundation Gravel</strong></td><td>${foundation.stoneDepthIn}" compacted base</td><td>${foundation.stoneVolumeCubicFeet.toFixed(1)} ft³</td><td>Footprint: ${foundation.footprintAreaSquareFeet.toFixed(1)} ft² · ${foundation.stoneVolumeCubicYards.toFixed(2)} yd³</td><td>≈ ${gravelTons} tons</td></tr>
      ${stoneRow}${linerRow}${seatingRows}
    </tbody>
  </table>

  ${allCostRows.length > 0 ? `
  <table class="costs-table">
    <thead><tr><th>Item</th><th style="text-align:right">Cost</th></tr></thead>
    <tbody>${allCostRows.join('')}</tbody>
  </table>` : ''}

  <table>
    <thead><tr><th colspan="3">Weight &amp; Volume Summary</th></tr></thead>
    <tbody>
      <tr><td>Total material weight</td><td>${Math.round(logistics.estimatedBrickWeightLb + logistics.estimatedCapWeightLb + logistics.estimatedStoneWeightLb).toLocaleString()} lb</td><td>Wall + cap + foundation stone</td></tr>
      <tr><td>Mortar volume</td><td>${logistics.estimatedMortarVolumeCubicFeet.toFixed(1)} ft³</td><td>~${mortarBags} bags of 80-lb premix</td></tr>
      <tr><td>Foundation gravel</td><td>${foundation.stoneVolumeCubicYards.toFixed(2)} yd³</td><td>${foundation.stoneVolumeCubicFeet.toFixed(1)} ft³ · ${foundation.stoneDepthIn}" depth</td></tr>
    </tbody>
  </table>

  <p class="footer">
    Generated by Firepit Parametric Masonry Designer &nbsp;·&nbsp;
    Verify quantities with your supplier before ordering &nbsp;·&nbsp;
    Does not include tools, labor, delivery, or permit costs.
  </p>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=860,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 250);
  };

  return (
    <div className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-4 shadow-lg'>
      {/* Header */}
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='text-xl font-bold uppercase tracking-[0.12em] text-amber-950'>
            Bill of Materials
          </h3>
          <p className='text-sm text-amber-900/70'>
            All quantities include {logistics.wasteFactorPct}% waste factor
          </p>
          {output.thermalAssembly.mode === 'double-wall' && (
            <p className='mt-1 text-xs text-amber-900/80'>
              Double-wall mode splits counts into inner and outer shells. Combined wall units to buy:{' '}
              <strong className='text-amber-950'>{totalWallUnitsPurchased.toLocaleString()} ea</strong>
              {thermalCapBridgePurchasedUnits > 0 && (
                <>
                  {' '}· cap closure units:{' '}
                  <strong className='text-amber-950'>
                    {thermalCapBridgePurchasedUnits.toLocaleString()} ea
                  </strong>
                </>
              )}
              .
            </p>
          )}
        </div>
        <div className='flex gap-2'>
          <button
            className='rounded-full border border-amber-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
            onClick={handlePrint}
            title='Print or save as PDF'
          >
            🖨 Print
          </button>
        </div>
      </div>

      <div className='overflow-x-auto rounded-xl border border-amber-900/15 bg-white/60'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-amber-900/15 bg-amber-100/45'>
              {['Item', 'Qty', 'Unit', '$/Unit', 'Total'].map((heading, index) => (
                <th
                  key={heading}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900/80 ${index === 0 ? 'text-left' : 'text-right'}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bomRows.map((row) => (
              <tr
                key={row.key}
                className='border-b border-amber-900/10 transition-colors hover:bg-amber-50/35'
              >
                <td className='px-4 py-3 align-top'>
                  <p className='font-semibold text-amber-950'>{row.item}</p>
                  <p className='mt-0.5 text-xs leading-5 text-amber-900/70'>
                    {row.detail}
                  </p>
                </td>
                <td className='px-4 py-3 text-right align-top font-mono font-semibold text-amber-950'>
                  {row.qtyDisplay ?? row.qty.toLocaleString()}
                </td>
                <td className='px-4 py-3 text-right align-top text-xs text-amber-900/75'>
                  {row.unit}
                </td>
                <td className='px-4 py-3 text-right align-top'>
                  <div className='flex justify-end'>
                    <CostInput
                      label=''
                      value={row.unitPrice}
                      onChange={row.onUnitPriceChange}
                    />
                  </div>
                </td>
                <td className='px-4 py-3 text-right align-top font-mono font-semibold text-amber-950'>
                  {fmtDollar(row.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grand Total */}
      {hasCostData && (
        <div className='mt-3 flex items-center justify-between rounded-lg border border-emerald-700/25 bg-emerald-50/80 px-4 py-3'>
          <div>
            <p className='text-xs font-bold uppercase tracking-wide text-emerald-900/70'>
              Estimated Total
            </p>
            <p className='text-[11px] text-emerald-900/60'>
              Materials only · does not include tools, labor, or delivery
            </p>
          </div>
          <p className='text-xl font-bold text-emerald-900'>
            {fmtDollar(grandTotal)}
          </p>
        </div>
      )}

      {/* Weight summary footer */}
      <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-amber-900/10 pt-2 text-[11px] text-amber-900/60'>
        <span>
          Total material weight:{' '}
          <strong className='text-amber-950'>
            {Math.round(
              logistics.estimatedBrickWeightLb +
                (logistics.thermalAssemblyWeightLb ?? 0) +
                logistics.estimatedCapWeightLb +
                logistics.estimatedStoneWeightLb,
            ).toLocaleString()}{' '}
            lb
          </strong>
        </span>
        <span>
          Mortar:{' '}
          <strong className='text-amber-950'>
            {logistics.estimatedMortarVolumeCubicFeet.toFixed(1)} ft³
          </strong>
        </span>
        <span>
          Foundation gravel:{' '}
          <strong className='text-amber-950'>
            {foundation.stoneVolumeCubicYards.toFixed(2)} yd³
          </strong>
        </span>
      </div>
    </div>
  );
}
