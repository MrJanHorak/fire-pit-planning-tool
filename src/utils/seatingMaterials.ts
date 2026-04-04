import type { SeatingAreaMaterials, SeatingGroundType } from '../types';

/**
 * Calculate seating area materials based on ground type and radius.
 * Materials are based on industry-standard preparations for social seating zones around firepits.
 */
export function calculateSeatingMaterials(
  groundType: SeatingGroundType,
  radiusFt: number,
): SeatingAreaMaterials {
  const areaSquareFeet = Math.PI * radiusFt * radiusFt;

  switch (groundType) {
    case 'gravel':
      return calculateGravelMaterials(radiusFt, areaSquareFeet);
    case 'mulch':
      return calculateMulchMaterials(radiusFt, areaSquareFeet);
    case 'decomposed-granite':
      return calculateDGMaterials(radiusFt, areaSquareFeet);
    case 'permeable-paver':
      return calculatePermablePayerMaterials(radiusFt, areaSquareFeet);
    case 'hardscape':
      return calculateHardscapeMaterials(radiusFt, areaSquareFeet);
    default:
      return {
        groundType: 'gravel',
        radiusFt,
        areaSquareFeet,
        materials: [],
        notes: [],
      };
  }
}

function calculateGravelMaterials(
  radiusFt: number,
  areaSquareFeet: number,
): SeatingAreaMaterials {
  // Compacted gravel: 4" base + 2" finished layer
  const baseLayerDepthIn = 4;
  const finishLayerDepthIn = 2;
  const edgingLinearFt = 2 * Math.PI * radiusFt;

  // Volume in cubic feet: area (sq ft) × depth (ft)
  const baseVolumeCubicFt = areaSquareFeet * (baseLayerDepthIn / 12);
  const finishVolumeCubicFt = areaSquareFeet * (finishLayerDepthIn / 12);

  // Convert to cubic yards (1 yd³ = 27 ft³)
  const baseVolumeCubicYards = baseVolumeCubicFt / 27;
  const finishVolumeCubicYards = finishVolumeCubicFt / 27;

  return {
    groundType: 'gravel',
    radiusFt,
    areaSquareFeet,
    materials: [
      {
        name: 'Base Course (Crushed Stone 3/4")',
        quantity: Math.ceil(baseVolumeCubicYards * 10) / 10, // Round up to nearest 0.1
        unit: 'cubic yards',
        estimatedWeightLb: baseVolumeCubicFt * 100, // ~100 lbs per cubic foot
      },
      {
        name: 'Pea Gravel or Marble Chips (Finish)',
        quantity: Math.ceil(finishVolumeCubicYards * 10) / 10,
        unit: 'cubic yards',
        estimatedWeightLb: finishVolumeCubicFt * 100,
      },
      {
        name: 'Landscape Edging (Pressure-Treated, Metal, or Composite)',
        quantity: Math.ceil(edgingLinearFt * 10) / 10,
        unit: 'linear feet',
      },
      {
        name: 'Geotextile Fabric',
        quantity: 1,
        unit: 'roll (typically 300–500 sq ft)',
      },
    ],
    notes: [
      `Seating zone radius: ${radiusFt} ft, total area: ${Math.round(areaSquareFeet)} sq ft`,
      'Extend gravel zone at least 10 feet from pit outer wall for safe sight lines and ember fall.',
      'Slope gravel surface 2–3% outward to prevent water pooling.',
      'Keep gravel 1–2" away from pit wall for fire safety.',
      'Plan for annual top-dressing: add 1–2 inches of fresh gravel every 2–3 years.',
    ],
  };
}

function calculateMulchMaterials(
  radiusFt: number,
  areaSquareFeet: number,
): SeatingAreaMaterials {
  // Mulch: 3" standard depth
  const mulchDepthIn = 3;
  const edgingLinearFt = 2 * Math.PI * radiusFt;

  const mulchVolumeCubicFt = areaSquareFeet * (mulchDepthIn / 12);
  const mulchVolumeCubicYards = mulchVolumeCubicFt / 27;

  return {
    groundType: 'mulch',
    radiusFt,
    areaSquareFeet,
    materials: [
      {
        name: 'Shredded Hardwood or Cedar Mulch',
        quantity: Math.ceil(mulchVolumeCubicYards * 10) / 10,
        unit: 'cubic yards',
        estimatedWeightLb: mulchVolumeCubicFt * 500, // ~500 lbs per cubic foot (wet mulch)
      },
      {
        name: 'Landscape Fabric (Weed Suppression)',
        quantity: 1,
        unit: 'roll (typically 300–500 sq ft)',
      },
      {
        name: 'Landscape Edging',
        quantity: Math.ceil(edgingLinearFt * 10) / 10,
        unit: 'linear feet',
      },
    ],
    notes: [
      `Seating zone radius: ${radiusFt} ft, total area: ${Math.round(areaSquareFeet)} sq ft`,
      'Install landscape fabric or cardboard first to suppress weeds.',
      'Extend fabric 6 inches beyond the seating zone to prevent grass creep.',
      'Lay mulch 3–4" deep, but keep it 1–2" away from the pit wall.',
      'Mulch decomposes and compacts over 2–3 seasons; plan for refresh cycle.',
    ],
  };
}

function calculateDGMaterials(
  radiusFt: number,
  areaSquareFeet: number,
): SeatingAreaMaterials {
  // Decomposed granite: 2–3" depth (use 2.5" average)
  const dgDepthIn = 2.5;
  const edgingLinearFt = 2 * Math.PI * radiusFt;

  const dgVolumeCubicFt = areaSquareFeet * (dgDepthIn / 12);
  const dgVolumeCubicYards = dgVolumeCubicFt / 27;

  // Stabilizer: ~2–3 bags per 100 sq ft for packed surface
  const stabilizerBagsPer100SqFt = 2.5;
  const stabilizerBags = Math.ceil(
    (areaSquareFeet / 100) * stabilizerBagsPer100SqFt,
  );

  return {
    groundType: 'decomposed-granite',
    radiusFt,
    areaSquareFeet,
    materials: [
      {
        name: 'Decomposed Granite',
        quantity: Math.ceil(dgVolumeCubicYards * 10) / 10,
        unit: 'cubic yards',
        estimatedWeightLb: dgVolumeCubicFt * 110, // ~110 lbs per cubic foot
      },
      {
        name: 'DG Stabilizer Binder (Optional, for packed surface)',
        quantity: stabilizerBags,
        unit: 'bags',
      },
      {
        name: 'Geotextile Fabric',
        quantity: 1,
        unit: 'roll (typically 300–500 sq ft)',
      },
      {
        name: 'Landscape Edging',
        quantity: Math.ceil(edgingLinearFt * 10) / 10,
        unit: 'linear feet',
      },
    ],
    notes: [
      `Seating zone radius: ${radiusFt} ft, total area: ${Math.round(areaSquareFeet)} sq ft`,
      'Decomposed granite offers a durable, packed surface with good drainage.',
      'Apply stabilizer binder if a more solid, unified surface is desired.',
      'Compact the material after initial placement for best results.',
      'DG can track slightly; consider edging to contain migration.',
    ],
  };
}

function calculatePermablePayerMaterials(
  radiusFt: number,
  areaSquareFeet: number,
): SeatingAreaMaterials {
  // Permeable paver grids: typically 2' × 2' = 4 sq ft per grid
  const sqFtPerGrid = 4;
  const gridCount = Math.ceil(areaSquareFeet / sqFtPerGrid);

  // Base: 4" gravel + 2" sand
  const baseGravelDepthIn = 4;
  const sandDepthIn = 2;

  const gravelVolumeCubicFt = areaSquareFeet * (baseGravelDepthIn / 12);
  const sandVolumeCubicFt = areaSquareFeet * (sandDepthIn / 12);
  const gravelVolumeCubicYards = gravelVolumeCubicFt / 27;
  const sandTons = (sandVolumeCubicFt / 27) * 1.5; // ~1.5 tons per cubic yard of sand

  // Grass seed: overseed rate ~25–40 lbs per 1000 sq ft
  const grassSeedNeeded = Math.ceil(
    (areaSquareFeet / 1000) * 32.5, // using 32.5 as middle of range
  );

  return {
    groundType: 'permeable-paver',
    radiusFt,
    areaSquareFeet,
    materials: [
      {
        name: 'Permeable Paver Grids (2 ft × 2 ft)',
        quantity: gridCount,
        unit: 'units',
      },
      {
        name: 'Base Course Gravel',
        quantity: Math.ceil(gravelVolumeCubicYards * 10) / 10,
        unit: 'cubic yards',
        estimatedWeightLb: gravelVolumeCubicFt * 100,
      },
      {
        name: 'Sand Base',
        quantity: Math.ceil(sandTons * 10) / 10,
        unit: 'tons',
        estimatedWeightLb: sandVolumeCubicFt * 100,
      },
      {
        name: 'Landscape Fabric (Geotextile)',
        quantity: 1,
        unit: 'roll (typically 300–500 sq ft)',
      },
      {
        name: 'Grass Seed (Overseed Rate)',
        quantity: grassSeedNeeded,
        unit: 'lbs',
      },
    ],
    notes: [
      `Seating zone radius: ${radiusFt} ft, total area: ${Math.round(areaSquareFeet)} sq ft`,
      'Permeable pavers support grass growth while allowing water drainage.',
      'Install geotextile layer to prevent sand migration into gravel base.',
      'Level sand bed carefully; uneven base causes settling and paver tilt.',
      'Allow grass approximately 2–3 weeks to establish after seeding.',
      'Overseed during cooler months for best germination rates.',
    ],
  };
}

function calculateHardscapeMaterials(
  radiusFt: number,
  areaSquareFeet: number,
): SeatingAreaMaterials {
  // Concrete pad: 4" depth standard
  const concreteDepthIn = 4;
  const baseGravelDepthIn = 4;

  const concreteVolumeCubicFt = areaSquareFeet * (concreteDepthIn / 12);
  const baseVolumeCubicFt = areaSquareFeet * (baseGravelDepthIn / 12);

  const concreteVolumeCubicYards = concreteVolumeCubicFt / 27;
  const baseVolumeCubicYards = baseVolumeCubicFt / 27;

  // Reinforcement: rebar or wire mesh (rough estimate)
  const rebarEstimatePerSqFt = 0.5; // lbs per sq ft
  const rebarWeightLb = areaSquareFeet * rebarEstimatePerSqFt;

  return {
    groundType: 'hardscape',
    radiusFt,
    areaSquareFeet,
    materials: [
      {
        name: 'Concrete (4" depth)',
        quantity: Math.ceil(concreteVolumeCubicYards * 10) / 10,
        unit: 'cubic yards',
        estimatedWeightLb: concreteVolumeCubicFt * 150, // ~150 lbs per cubic foot
      },
      {
        name: 'Base Gravel (4" depth)',
        quantity: Math.ceil(baseVolumeCubicYards * 10) / 10,
        unit: 'cubic yards',
        estimatedWeightLb: baseVolumeCubicFt * 100,
      },
      {
        name: 'Reinforcement (Rebar or Wire Mesh)',
        quantity: Math.ceil(rebarWeightLb / 100),
        unit: 'approx. bundles',
        estimatedWeightLb: rebarWeightLb,
      },
      {
        name: 'Concrete Sealer (Optional)',
        quantity: 1,
        unit: 'application (consult manufacturer for coverage)',
      },
    ],
    notes: [
      `Seating zone radius: ${radiusFt} ft, total area: ${Math.round(areaSquareFeet)} sq ft`,
      'Hardscape (concrete or flagstone) offers the most durable, low-maintenance option.',
      'Slope concrete surface at least 1/8" per foot to permit drainage.',
      'Complete 28-day curing before heavy traffic or furniture placement.',
      'Consider broom finish, stain, or sealer for aesthetics and slip resistance.',
      'Seal concrete or pavers periodically to extend lifespan and ease cleaning.',
    ],
  };
}
