export type FuelType = 'wood' | 'propane' | 'natural-gas';
export type BondPattern = 'running-bond';
export type UnitOrientation = 'stretcher' | 'header';
export type CapOrientation = 'match-wall' | UnitOrientation;
export type WallCourseStrategy = 'uniform' | 'shim-spacer' | 'vented-accent';
export type LinerType = 'none' | 'fire-brick' | 'steel-ring';
export type PlanShape = 'circular' | 'square' | 'rectangular' | 'hexagonal' | 'octagonal';
export type AshCleanoutType = 'none' | 'hinged-door' | 'removable-pan' | 'drain-holes';
export type CapPlacementMode = 'outward-only' | 'symmetric';
export type SoilType =
  | 'unknown'
  | 'dense-granular'
  | 'sandy'
  | 'silty'
  | 'clay-expansive'
  | 'organic-or-fill';
export type DrainageCondition =
  | 'unknown'
  | 'well-drained'
  | 'moderate'
  | 'slow-draining'
  | 'poor-drainage';
export type SeatingGroundType =
  | 'gravel'
  | 'mulch'
  | 'decomposed-granite'
  | 'permeable-paver'
  | 'hardscape';
export type SeatingAreaShape = 'circular' | 'square';
export type SeatingFurnitureStyle = 'adirondack' | 'bench';
export type SeatingDensity = 'cozy' | 'standard' | 'spacious';
export type NaturalStoneType =
  | 'unspecified'
  | 'granite'
  | 'basalt'
  | 'marble'
  | 'river-rock'
  | 'sandstone'
  | 'limestone'
  | 'shale';
export type StoneBuildMethod = 'dry-stack' | 'mortared';
export type RegionalCodeProfile =
  | 'ibc-general'
  | 'irc-residential'
  | 'wui-high-risk';
export type HoaConstraintLevel = 'unknown' | 'none' | 'typical' | 'strict';
export type GasHardwareTemplate =
  | 'generic-firepit'
  | 'drop-in-pan'
  | 'linear-burner'
  | 'high-btu-bowl';
export type ThermalAssemblyMode = 'single-wall' | 'double-wall';
export type ThermalCavityFill = 'air-gap' | 'sand-fill' | 'insulation-board';
export type ThermalCavityVentMode = 'vented' | 'sealed';
export type MortarType = 'refractory' | 'type-n' | 'type-s' | 'construction-adhesive';
export type SmokelessInsertPresetKey =
  | 'solo-stove-bonfire-2'
  | 'breeo-x19'
  | 'breeo-x24'
  | 'breeo-x30'
  | 'tiki-patio'
  | 'custom-diy';

export interface MasonryUnit {
  name: string;
  widthIn: number;
  heightIn: number;
  lengthIn: number;
}

export interface MasonryInput {
  planShape: PlanShape;
  innerDiameterIn: number;
  innerWidthIn: number;
  innerDepthIn: number;
  wallHeightIn: number;
  proximityToStructuresFt: number;
  fuelType: FuelType;
  linerType: LinerType;
  expansionGapIn: number;
  mortarJointIn: number;
  orientation: UnitOrientation;
  capOrientation?: CapOrientation;
  bondPattern: BondPattern;
  ventCount: number;
  ventOpeningAreaSqIn: number;
  gasLineEntryAngleDeg: number;
  capstoneOverhangIn: number;
  capPlacementMode: CapPlacementMode;
  thermalAssemblyMode?: ThermalAssemblyMode;
  thermalCavityFill?: ThermalCavityFill;
  thermalCavityVentMode?: ThermalCavityVentMode;
  thermalCavityWidthIn?: number;
  thermalTieSpacingIn?: number;
  /** In double-wall mode: material preset for the outer (decorative) shell. Inner shell uses brickPresetKey. */
  outerWallBrickPresetKey?: string;
  /** Mortar type for the inner firebox wall. Defaults to refractory in double-wall mode. */
  innerWallMortarType?: MortarType;
  /** Mortar type for the outer decorative shell. Defaults to type-n. */
  outerWallMortarType?: MortarType;
  /** Enable secondary-combustion smokeless mode (wood fuel only). */
  smokelessMode?: boolean;
  /** Commercial insert preset or 'custom-diy'. Only relevant when smokelessMode is true. */
  smokelessInsertPreset?: SmokelessInsertPresetKey;
  /** Custom insert: base outer diameter (in). Used when preset is 'custom-diy'. */
  smokelessInsertBaseOD?: number;
  /** Custom insert: top flange outer diameter (in). Used when preset is 'custom-diy'. */
  smokelessInsertFlangeOD?: number;
  /** Custom insert: minimum required pit depth (in). Used when preset is 'custom-diy'. */
  smokelessInsertMinDepthIn?: number;
  /** Air gap between insert base and masonry inner wall (in). Overrides preset default when set. */
  smokelessInsertAirGapIn?: number;
  /** Number of base-level primary air intake holes. */
  smokelessPrimaryVentCount?: number;
  /** Diameter of each primary intake hole (in). */
  smokelessPrimaryVentDiameterIn?: number;
  /** Number of top secondary combustion jet holes on the inner liner/insert. */
  smokelessSecondaryVentCount?: number;
  /** Diameter of each secondary jet hole (in). */
  smokelessSecondaryVentDiameterIn?: number;
  soilType?: SoilType;
  drainageCondition?: DrainageCondition;
  frostClimate?: boolean;
  frostLineDepthIn?: number;
  overheadClearanceFt?: number;
  regionalCodeProfile?: RegionalCodeProfile;
  hoaConstraintLevel?: HoaConstraintLevel;
  gasHardwareTemplate?: GasHardwareTemplate;
  capstonePresetKey?: string;
  brickPresetKey?: string;
  customBrickLengthIn?: number;
  customBrickWidthIn?: number;
  customBrickHeightIn?: number;
  customBrickInnerLengthIn?: number;
  customBrickOuterLengthIn?: number;
  customCapLengthIn?: number;
  customCapWidthIn?: number;
  customCapHeightIn?: number;
  customCapInnerLengthIn?: number;
  customCapOuterLengthIn?: number;
  wallCourseStrategy?: WallCourseStrategy;
  shimUnitLengthIn?: number;
  shimUnitWidthIn?: number;
  shimUnitHeightIn?: number;
  shimFrequency?: number;
  shimMaxSharePct?: number;
  accentJointMultiplier?: number;
  accentCycleLength?: number;
  accentCoursePosition?: number;
  accentCourseOrientation?: UnitOrientation;
  seatingGroundType?: SeatingGroundType;
  seatingAreaShape?: SeatingAreaShape;
  seatingFurnitureStyle?: SeatingFurnitureStyle;
  seatingDensity?: SeatingDensity;
  seatingFurnitureCount?: number;
  seatingAreaRadiusFt?: number;
  naturalStoneType?: NaturalStoneType;
  stoneBuildMethod?: StoneBuildMethod;
  ashCleanoutType?: AshCleanoutType;
}

export interface SafetyWarning {
  code:
    | 'clearance-too-low'
    | 'wood-liner-recommended'
    | 'natural-stone-geology-check-required'
    | 'natural-stone-heat-shield-recommended'
    | 'natural-stone-unsafe-type'
    | 'natural-stone-mortared-drainage-review'
    | 'tight-radius-cut-required'
    | 'tight-radius-half-bat-recommended'
    | 'mortar-curing-required'
    | 'gas-vent-area-out-of-range'
    | 'gas-vent-layout-invalid'
    | 'gas-line-near-vent'
    | 'course-bearing-risk'
    | 'vertical-clearance-low'
    | 'double-wall-cavity-tight'
    | 'double-wall-thermal-review'
    | 'outer-wall-heat-risk'
    | 'mortar-zone-mismatch'
    | 'smokeless-vent-ratio-low'
    | 'smokeless-vent-ratio-high'
    | 'smokeless-flange-unsafe'
    | 'smokeless-depth-insufficient';
    message: string;
    actualValue?: number;
    requiredValue?: number;
}

export interface CutPlanSpec {
  requiresCutting: boolean;
  innerJointIn: number;
  centerlineModuleSpacingIn: number;
  recommendedTaperPerBrickIn: number;
  recommendedCutPerSideIn: number;
  recommendedCutAngleDeg: number;
  minimumRecommendedInnerDiameterIn: number;
  notes: string[];
}

export interface VentSpec {
  ventCount: number;
  targetCourseIndexes: number[];
  placement: 'base' | 'upper';
  totalOpenAreaSqIn: number;
  openingAreaSqIn: number;
  recommendedAreaMinSqIn: number;
  recommendedAreaMaxSqIn?: number;
  layout: 'evenly-spaced' | 'opposed-pairs';
  crossVentilationValid: boolean;
  ventAnglesDeg: number[];
  ventBrickIndexes: number[];
  gasLineEntryAngleDeg?: number;
  gasLineEntryBrickIndex?: number;
  gasLineEntryClear: boolean;
  gasLineAutoAdjusted: boolean;
  gasHardwareTemplate: GasHardwareTemplate;
  gasHardwareTemplateLabel?: string;
}

export interface CornerInterlockGuidance {
  required: boolean;
  recommendedOverlapIn: number;
  cornerCutPerSideIn: number;
  notes: string[];
}

export interface ThermalAssemblySpec {
  mode: ThermalAssemblyMode;
  cavityFill: ThermalCavityFill;
  cavityVentMode: ThermalCavityVentMode;
  cavityWidthIn: number;
  innerShellThicknessIn: number;
  outerShellThicknessIn: number;
  totalWallDepthIn: number;
  capBridgeRequiredWidthIn: number;
  capBridgeRows: number;
  capBridgeAdditionalUnits: number;
  capBridgeCourseUnitCounts: number[];
  estimatedTieCount: number;
  outerShellWeightLb: number;
  riskLevel: 'low' | 'moderate' | 'high';
  description: string;
  notes: string[];
  /** Material name for the inner firebox shell (double-wall only). */
  innerMaterialName?: string;
  /** Material name for the outer decorative shell (double-wall only). */
  outerMaterialName?: string;
  /** Heat rating in °F for the inner shell material. */
  innerHeatRatingF?: number;
  /** Heat rating in °F for the outer shell material. */
  outerHeatRatingF?: number;
  /** Mortar type recommended for the inner firebox zone. */
  innerMortarType?: MortarType;
  /** Mortar type recommended for the outer decorative shell. */
  outerMortarType?: MortarType;
}

export interface LinerSpec {
  enabled: boolean;
  recommended: boolean;
  type: LinerType;
  thicknessIn: number;
  expansionGapIn: number;
  outerShellInnerDiameterIn: number;
  outerShellInnerWidthIn: number;
  outerShellInnerDepthIn: number;
  linerOuterDiameterIn: number;
  linerOuterWidthIn: number;
  linerOuterDepthIn: number;
  linerInnerDiameterIn: number;
  linerInnerWidthIn: number;
  linerInnerDepthIn: number;
  description: string;
}

export interface FoundationSpec {
  footprintDiameterIn: number;
  footprintWidthIn: number;
  footprintDepthIn: number;
  stoneDepthIn: number;
  footprintAreaSquareFeet: number;
  stoneVolumeCubicFeet: number;
  stoneVolumeCubicYards: number;
}

export interface SeatingAreaMaterials {
  groundType: SeatingGroundType;
  shape: SeatingAreaShape;
  furnitureStyle: SeatingFurnitureStyle;
  density: SeatingDensity;
  radiusFt: number;
  overallWidthFt: number;
  overallDepthFt: number;
  areaSquareFeet: number;
  materials: Array<{
    name: string;
    quantity: number;
    unit: string;
    estimatedWeightLb?: number;
  }>;
  notes: string[];
}

export interface NaturalStoneEstimate {
  faceAreaSquareFeet: number;
  outerPerimeterFeet: number;
  tonsAt8InDepth: number;
  tonsAt4InDepth: number;
  tonsAt8InDepthWithWaste10Pct: number;
  tonsAt8InDepthWithWaste15Pct: number;
  tonsAt4InDepthWithWaste10Pct: number;
  tonsAt4InDepthWithWaste15Pct: number;
  typicalWallWeightLbMin: number;
  typicalWallWeightLbMax: number;
}

export interface LogisticsSpec {
  wasteFactorPct: number;
  estimatedBrickWeightLb: number;
  estimatedStoneWeightLb: number;
  purchasedUnits: number;
  purchasedCapUnits: number;
  estimatedCapWeightLb: number;
  estimatedMortarVolumeCubicFeet: number;
  thermalAssemblyWeightLb?: number;
  thermalAssemblyAdditionalUnits?: number;
  thermalCapBridgeAdditionalUnits?: number;
  thermalCapBridgePurchasedUnits?: number;
  thermalCapBridgeWeightLb?: number;
  thermalAssemblyNotes?: string[];
  seatingAreaMaterials?: SeatingAreaMaterials;
  naturalStoneEstimate?: NaturalStoneEstimate;
}

export interface CapstoneJointSpec {
  actualJointIn: number;
  innerJointIn: number;
  outerJointIn: number;
  actualModuleSpacingIn: number;
}

export interface CapstoneSpec {
  overhangIn: number;
  capCourseWidthIn: number;
  innerExtensionIn: number;
  outerExtensionIn: number;
  requiresTaperCutting: boolean;
  capOuterDiameterIn: number;
  capOuterWidthIn: number;
  capOuterDepthIn: number;
  capInnerDiameterIn: number;
  capInnerWidthIn: number;
  capInnerDepthIn: number;
  capCenterlineDiameterIn: number;
  capCenterlineWidthIn: number;
  capCenterlineDepthIn: number;
  capUnitsPerCourseRaw: number;
  capUnitsPerCourseRounded: number;
  joint: CapstoneJointSpec;
}

export interface CoursePlan {
  courseIndex: number;
  unitCount: number;
  offsetIn: number;
  unitCountRaw?: number;
  orientation?: UnitOrientation;
  jointIn?: number;
  specialCourse?: 'standard' | 'shim-spacer' | 'vented-accent';
  spacerCount?: number;
  spacerIndexes?: number[];
}

export interface CourseStrategySummary {
  strategy: WallCourseStrategy;
  shimUnitCount: number;
  accentCourseIndexes: number[];
  shimFrequency?: number;
  shimDensityPct?: number;
  shimUnit?: MasonryUnit;
}

export interface SmokelessSpec {
  enabled: boolean;
  /** The preset key used, or 'custom-diy'. */
  insertPreset: SmokelessInsertPresetKey;
  /** Human-readable label for the selected insert. */
  insertLabel: string;
  /** Insert base outer diameter (in). */
  insertBaseOD: number;
  /** Insert top flange outer diameter (in). */
  insertFlangeOD: number;
  /** Minimum required pit depth (in). */
  insertMinDepthIn: number;
  /** Required masonry inner diameter to accommodate the insert with air gap. */
  requiredMasonryID: number;
  /** Air gap between insert base OD and masonry inner wall (in). */
  airGapIn: number;
  /** Number of primary (base) air intake holes. */
  primaryVentCount: number;
  /** Diameter of each primary intake hole (in). */
  primaryVentDiameterIn: number;
  /** Total intake area: primaryVentCount × π×(d/2)² (sq in). */
  primaryVentTotalAreaSqIn: number;
  /** Number of secondary combustion jet holes at the top inner rim. */
  secondaryVentCount: number;
  /** Diameter of each secondary jet hole (in). */
  secondaryVentDiameterIn: number;
  /** Total secondary jet area: secondaryVentCount × π×(d/2)² (sq in). */
  secondaryVentTotalAreaSqIn: number;
  /** A_intake / A_holes ratio. Optimal range: 1.2 – 1.5. */
  intakeOutletRatio: number;
  /** Whether the ratio is in the optimal range, below (starved), or above (overcooled). */
  intakeOutletRatioStatus: 'optimal' | 'starved' | 'overcooled';
  /**
   * Approximate stack-effect draft pressure (Pa) using the ideal gas law formula:
   * ΔP = Patm × (g × H / R) × (1/T0 − 1/Ti)
   */
  draftPressurePa: number;
  /** Number of base-course blocks to omit to create primary intake openings. */
  baseVentBlockOmissions: number;
  /** Whether the insert flange safely overlaps the masonry inner wall edge. */
  flangeOverlapStatus: 'secure' | 'marginal' | 'unsafe';
  notes: string[];
}

export interface MasonryOutput {
  planShape: PlanShape;
  innerSpanWidthIn: number;
  innerSpanDepthIn: number;
  outerSpanWidthIn: number;
  outerSpanDepthIn: number;
  effectiveOuterDiameterIn: number;
  centerlineDiameterIn: number;
  centerlineSpanWidthIn: number;
  centerlineSpanDepthIn: number;
  mortarJointIn: number;
  resolvedUnit: MasonryUnit;
  resolvedCapUnit: MasonryUnit;
  courses: CoursePlan[];
  unitsPerCourseRaw: number;
  unitsPerCourseRounded: number;
  totalUnits: number;
  ventSpec: VentSpec;
  cutPlan: CutPlanSpec;
  linerSpec: LinerSpec;
  foundation: FoundationSpec;
  courseStrategy: CourseStrategySummary;
  capstone: CapstoneSpec;
  logistics: LogisticsSpec;
  warnings: SafetyWarning[];
  cornerGuidance?: CornerInterlockGuidance;
  thermalAssembly: ThermalAssemblySpec;
  smokelessSpec?: SmokelessSpec;
}
