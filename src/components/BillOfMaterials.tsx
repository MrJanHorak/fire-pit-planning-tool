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
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className='flex items-center gap-1.5 text-[11px] text-amber-900/70'>
      {label}
      <input
        type='number'
        min='0'
        step='0.01'
        placeholder='0.00'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='w-20 rounded border border-amber-200 bg-white px-1.5 py-0.5 text-[11px] text-amber-950 outline-none focus:border-amber-500'
      />
    </label>
  );
}

interface BomRowProps {
  color: string;
  icon: string;
  category: string;
  spec: string;
  qty: string;
  weight?: string;
  notes?: string;
  costInput?: React.ReactNode;
  lineTotal?: string;
}

function BomRow({
  color,
  icon,
  category,
  spec,
  qty,
  weight,
  notes,
  costInput,
  lineTotal,
}: BomRowProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border-l-4 bg-white/75 p-3 shadow-sm ${color}`}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='text-base leading-none'>{icon}</span>
          <div>
            <p className='text-[11px] font-bold uppercase tracking-wide text-amber-950/70'>
              {category}
            </p>
            <p className='text-xs font-semibold text-amber-950'>{spec}</p>
          </div>
        </div>
        <div className='text-right'>
          <p className='text-base font-bold text-amber-950'>{qty}</p>
          {weight && (
            <p className='text-[11px] text-amber-900/60'>{weight}</p>
          )}
        </div>
      </div>
      {notes && (
        <p className='text-[11px] leading-4 text-amber-900/60'>{notes}</p>
      )}
      {(costInput || lineTotal) && (
        <div className='mt-1 flex items-center justify-between gap-2 border-t border-amber-900/10 pt-1.5'>
          {costInput}
          {lineTotal && (
            <p className='ml-auto text-xs font-bold text-emerald-800'>
              {lineTotal}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  output: MasonryOutput;
}

export default function BillOfMaterials({ output }: Props) {
  const [showCosts, setShowCosts] = useState(false);
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
  const wallTotal = wallUnitPrice * logistics.purchasedUnits;
  const capTotal = capUnitPrice * logistics.purchasedCapUnits;
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

  const handlePrint = () => {
    const allCostRows: string[] = [];
    if (showCosts && hasCostData) {
      if (wallTotal > 0)
        allCostRows.push(`<tr><td>Wall Units (${logistics.purchasedUnits} × ${fmtDollar(wallUnitPrice)})</td><td>${fmtDollar(wallTotal)}</td></tr>`);
      if (capTotal > 0)
        allCostRows.push(`<tr><td>Capstones (${logistics.purchasedCapUnits} × ${fmtDollar(capUnitPrice)})</td><td>${fmtDollar(capTotal)}</td></tr>`);
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
      <tr><td><strong>Capstones</strong></td><td>${capSpec}</td><td>${logistics.purchasedCapUnits} units</td><td>${logistics.wasteFactorPct}% waste included</td><td>${Math.round(logistics.estimatedCapWeightLb).toLocaleString()} lb</td></tr>
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
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div>
          <h3 className='text-sm font-bold uppercase tracking-[0.12em] text-amber-950'>
            Bill of Materials
          </h3>
          <p className='text-xs text-amber-900/60'>
            All quantities include {logistics.wasteFactorPct}% waste factor
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              showCosts
                ? 'bg-emerald-700 text-white'
                : 'border border-emerald-700/30 bg-white text-emerald-800 hover:bg-emerald-50'
            }`}
            onClick={() => setShowCosts((v) => !v)}
            title='Toggle cost estimator'
          >
            $ Cost Est.
          </button>
          <button
            className='rounded-full border border-amber-900/20 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50'
            onClick={handlePrint}
            title='Print or save as PDF'
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* BOM rows */}
      <div className='grid gap-2 sm:grid-cols-2'>
        {/* Wall Units */}
        <BomRow
          color='border-orange-500'
          icon='🧱'
          category='Wall Units'
          spec={wallSpec}
          qty={`${logistics.purchasedUnits} units`}
          weight={`${Math.round(logistics.estimatedBrickWeightLb).toLocaleString()} lb`}
          notes={`${logistics.wasteFactorPct}% waste included · ${output.totalUnits} net required`}
          costInput={
            showCosts ? (
              <CostInput
                label='$/unit'
                value={costs.wallUnit}
                onChange={(v) => updateCost('wallUnit', v)}
              />
            ) : undefined
          }
          lineTotal={showCosts && wallTotal > 0 ? fmtDollar(wallTotal) : undefined}
        />

        {/* Capstones */}
        <BomRow
          color='border-amber-700'
          icon='🏛️'
          category='Capstones'
          spec={capSpec}
          qty={`${logistics.purchasedCapUnits} units`}
          weight={`${Math.round(logistics.estimatedCapWeightLb).toLocaleString()} lb`}
          notes={`${logistics.wasteFactorPct}% waste included`}
          costInput={
            showCosts ? (
              <CostInput
                label='$/unit'
                value={costs.capUnit}
                onChange={(v) => updateCost('capUnit', v)}
              />
            ) : undefined
          }
          lineTotal={showCosts && capTotal > 0 ? fmtDollar(capTotal) : undefined}
        />

        {/* Mortar */}
        <BomRow
          color='border-stone-500'
          icon='🪣'
          category='Mortar Mix'
          spec='Type S / N premix (80-lb bags)'
          qty={`~${mortarBags} bags`}
          weight={`${logistics.estimatedMortarVolumeCubicFeet.toFixed(1)} ft³ volume`}
          notes={`≈ ${MORTAR_BAG_80LB_FT3} ft³ yield per bag · round up at the yard`}
          costInput={
            showCosts ? (
              <CostInput
                label='$/bag'
                value={costs.mortarBag}
                onChange={(v) => updateCost('mortarBag', v)}
              />
            ) : undefined
          }
          lineTotal={showCosts && mortarTotal > 0 ? fmtDollar(mortarTotal) : undefined}
        />

        {/* Foundation Gravel */}
        <BomRow
          color='border-yellow-700'
          icon='🪨'
          category='Foundation Gravel'
          spec={`${foundation.stoneDepthIn}" compacted base`}
          qty={`${foundation.stoneVolumeCubicFeet.toFixed(1)} ft³`}
          weight={`≈ ${gravelTons} tons`}
          notes={`Footprint: ${foundation.footprintAreaSquareFeet.toFixed(1)} ft² · ${foundation.stoneVolumeCubicYards.toFixed(2)} yd³`}
          costInput={
            showCosts ? (
              <CostInput
                label='$/ton'
                value={costs.gravelTon}
                onChange={(v) => updateCost('gravelTon', v)}
              />
            ) : undefined
          }
          lineTotal={showCosts && gravelTotal > 0 ? fmtDollar(gravelTotal) : undefined}
        />

        {/* Thermal Liner — conditional */}
        {linerSpec.enabled && (
          <BomRow
            color='border-red-700'
            icon='🔥'
            category='Thermal Liner'
            spec={
              linerSpec.type === 'fire-brick'
                ? 'Fire Brick Liner'
                : linerSpec.type === 'steel-ring'
                  ? 'Steel Ring Insert'
                  : linerSpec.type
            }
            qty={`${linerSpec.thicknessIn}" thick`}
            notes={linerSpec.description}
            costInput={
              showCosts ? (
                <CostInput
                  label='$/job'
                  value={costs.linerUnit}
                  onChange={(v) => updateCost('linerUnit', v)}
                />
              ) : undefined
            }
            lineTotal={showCosts && linerTotal > 0 ? fmtDollar(linerTotal) : undefined}
          />
        )}

        {/* Natural Stone wall estimate — conditional */}
        {logistics.naturalStoneEstimate && (
          <BomRow
            color='border-slate-600'
            icon='🪨'
            category='Natural Stone Wall'
            spec='Fieldstone / Ledgestone'
            qty={`${logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste10Pct.toFixed(2)}–${logistics.naturalStoneEstimate.tonsAt8InDepthWithWaste15Pct.toFixed(2)} tons`}
            notes={`Face area: ${logistics.naturalStoneEstimate.faceAreaSquareFeet.toFixed(1)} ft² · Perimeter: ${logistics.naturalStoneEstimate.outerPerimeterFeet.toFixed(1)} ft · 8" depth with 10–15% waste`}
            costInput={
              showCosts ? (
                <CostInput
                  label='$/ton'
                  value={costs.stoneTon}
                  onChange={(v) => updateCost('stoneTon', v)}
                />
              ) : undefined
            }
            lineTotal={showCosts && stoneTotal > 0 ? `${fmtDollar(stoneTotal)} (mid-range est.)` : undefined}
          />
        )}

        {/* Seating Surface materials — conditional, one card per material */}
        {logistics.seatingAreaMaterials &&
          logistics.seatingAreaMaterials.materials.map((mat, i) => (
            <BomRow
              key={mat.name}
              color='border-green-600'
              icon='🪑'
              category='Seating Surface'
              spec={mat.name}
              qty={`${mat.quantity.toFixed(1)} ${mat.unit}`}
              weight={
                mat.estimatedWeightLb
                  ? `${Math.round(mat.estimatedWeightLb).toLocaleString()} lb`
                  : undefined
              }
              notes={`${Math.round(logistics.seatingAreaMaterials!.areaSquareFeet)} ft² seating area`}
              costInput={
                showCosts ? (
                  <CostInput
                    label={`$/${mat.unit}`}
                    value={costs.seatingMats[mat.name] ?? ''}
                    onChange={(v) => updateSeatingCost(mat.name, v)}
                  />
                ) : undefined
              }
              lineTotal={
                showCosts && seatingTotals[i] > 0
                  ? fmtDollar(seatingTotals[i])
                  : undefined
              }
            />
          ))}
      </div>

      {/* Grand Total */}
      {showCosts && hasCostData && (
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

