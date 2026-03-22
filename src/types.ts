export type FuelType = 'wood' | 'propane' | 'natural-gas';
export type BondPattern = 'running-bond';
export type UnitOrientation = 'stretcher' | 'header';

export interface MasonryUnit {
  name: string;
  widthIn: number;
  heightIn: number;
  lengthIn: number;
}

export interface MasonryInput {
  innerDiameterIn: number;
  wallHeightIn: number;
  proximityToStructuresFt: number;
  fuelType: FuelType;
  mortarJointIn: number;
  orientation: UnitOrientation;
  bondPattern: BondPattern;
  ventCount: number;
  capstoneOverhangIn: number;
  brickPresetKey?: string;
}

export interface SafetyWarning {
  code: 'clearance-too-low';
  message: string;
  actualValue: number;
  requiredValue: number;
}

export interface VentSpec {
  ventCount: number;
  targetCourseIndexes: number[];
  placement: 'base' | 'upper';
  totalOpenAreaSqIn: number;
}

export interface FoundationSpec {
  footprintDiameterIn: number;
  stoneDepthIn: number;
  stoneVolumeCubicFeet: number;
  stoneVolumeCubicYards: number;
}

export interface LogisticsSpec {
  wasteFactorPct: number;
  estimatedBrickWeightLb: number;
  estimatedStoneWeightLb: number;
  purchasedUnits: number;
  purchasedCapUnits: number;
  estimatedCapWeightLb: number;
  estimatedMortarVolumeCubicFeet: number;
}

export interface CapstoneSpec {
  overhangIn: number;
  capOuterDiameterIn: number;
  capCenterlineDiameterIn: number;
  capUnitsPerCourseRaw: number;
  capUnitsPerCourseRounded: number;
}

export interface CoursePlan {
  courseIndex: number;
  unitCount: number;
  offsetIn: number;
}

export interface MasonryOutput {
  effectiveOuterDiameterIn: number;
  centerlineDiameterIn: number;
  courses: CoursePlan[];
  unitsPerCourseRaw: number;
  unitsPerCourseRounded: number;
  totalUnits: number;
  ventSpec: VentSpec;
  foundation: FoundationSpec;
  capstone: CapstoneSpec;
  logistics: LogisticsSpec;
  warnings: SafetyWarning[];
}
