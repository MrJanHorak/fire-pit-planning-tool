# Firepit Research Notes

## Purpose

This document consolidates the engineering guidance for the Parametric Masonry Designer and separates:

- locked baseline rules,
- expanded research topics,
- current implementation coverage,
- known gaps to address in code.

## Locked Engineering Baseline

These are the non-negotiable rules already defined for the project.

### Core Masonry Geometry

- Default modular unit dimensions use actual brick size: 3.625 in x 2.25 in x 7.625 in.
- Mortar joint default is 0.375 in and must remain configurable.
- Running bond is required: adjacent courses offset by 50% of one module.
- Circular unit count uses the centerline method:

$$
N = \frac{\pi \cdot (D - W)}{L + J}
$$

Where:

- $D$ is wall outer diameter.
- $W$ is wall thickness.
- $L$ is unit length.
- $J$ is mortar joint thickness.

If the user enters inner diameter:

$$
D = D_{inner} + 2W
$$

### Ventilation Logic

- Propane vents belong at the base because LP is heavier than air.
- Natural gas vents belong near the upper courses because NG is lighter than air.
- Wood-burning pits should support base airflow for combustion.
- Minimum total open area target is 18 sq in.

### Foundation Logic

- Sub-base material is compacted angular stone.
- Stone depth is fixed at 8 in.
- Footprint diameter is outer wall diameter + 12 in total, or 6 in wider per side.

Stone volume:

$$
V = \pi \cdot \left(\frac{D_{footprint}}{2}\right)^2 \cdot depth
$$

### Safety Rule

- Minimum horizontal clearance to combustible structures is 10 ft.
- Any value below 10 ft must trigger a warning.

### Build Documentation Requirements

- Include a layer-by-layer SVG construction view.
- Include a 3D geometry preview.
- Verify geometry and safety rules with automated tests.

## Expanded Research Topics

The material below came from the newly added research and expands the scope beyond the baseline rules.

### Foundation and Site Preparation

- Typical excavation depth for permanent hardscape fire features is 6 to 12 in depending on soil and load.
- Angular crushed stone remains the preferred sub-base because it interlocks better than rounded aggregate.
- A 1 to 2 in coarse sand leveling layer improves first-course accuracy.
- Geotextile separation fabric may be appropriate for weed suppression and soil separation.
- Larger or heavier installations may require a concrete footing depending on soil conditions.
- Clay-heavy or expansive soils should be treated as a stability risk.

#### Foundation Detail by Size and Soil (Implementation Guidance)

Use the current engine baseline as the default calculation model:

- 8 in compacted angular stone depth,
- footprint +12 in total beyond the outer wall.

Then apply an advisory layer for site risk, instead of silently changing baseline quantities.

Suggested advisory tiers:

- **Low review priority**: dense granular subgrade + moderate footprint.
- **Moderate review priority**: unknown, sandy, or silty subgrade, or larger footprint.
- **High review priority**: expansive clay, organic/fill soils, or very large footprint.

Recommended app behavior:

1. Keep baseline stone volume calculations fixed to the engineering rule.
2. Add `soilType` input as contextual data (guidance only).
3. Compute an advisory risk level from `soilType` + foundation footprint size.
4. Surface advisory notes in Designer output and construction packet.
5. For high-risk cases, prompt for local code/geotech review before build.

This preserves deterministic baseline math while adding practical field realism.

### Clearance and Code Considerations

- Horizontal setback of 10 ft is the minimum baseline and may be higher in some jurisdictions.
- Vertical clearance should also be considered for overhead structures or vegetation.
- A visual exclusion zone is useful so users can compare site obstacles to required clearances.

### Thermal and Material Performance

- Wood-burning firepits should use a refractory liner, fire brick, or steel fire ring for the hottest interior zone.
- Double-wall construction may be required where the outer decorative shell is separated from the hot inner liner.
- An air gap or sand-filled expansion zone helps accommodate differential thermal expansion.
- Standard brick or CMU should not be treated as equivalent to refractory material in a high-heat interior.

#### Liner Venting Clarification

- In typical masonry builds, primary venting is provided by wall vent gaps/openings, not by drilling dedicated holes through the thermal liner.
- The liner acts as thermal protection; airflow is managed through the vented wall courses and cavity path.
- Keep vent paths and liner expansion clearances unobstructed.
- If a burner, pan, or fire-ring manufacturer specifies dedicated vent/drain requirements, those instructions override generic assumptions.

### Masonry Geometry Beyond the Current Baseline

- Square and rectangular footprints require separate perimeter logic.
- Square and rectangular pits also need corner overlap logic so courses interlock correctly.
- Tight-radius circular work may require half-bats or trapezoidal units to avoid oversized outer joints.
- Orientation matters: stretcher and header courses change both wall thickness and course counts.

### Ventilation and Fuel Performance

- Wood-burning ventilation is performance-driven and generally benefits from at least four vents spaced around the base.
- Gas-firepit venting is safety-driven and should usually provide cross-ventilation on opposing sides.
- Research guidance suggests 18 to 36 sq in total vent area for gas features depending on hardware requirements.
- Vent placement should be tied to gas density and cavity behavior, not just generic openings.

### Capstone and Finish Systems

- Cap types may include soldier course, flat paver cap, and rowlock course.
- A functional overhang of roughly 1 to 2 in improves water shedding.
- A drip edge reduces water exposure on the wall face.
- Tighter circular cap courses may require wedge logic or cut planning.

### Logistics and Construction Planning

- Mortar estimates can be supplemented by adhesive estimates where adhesive systems are used.
- Total structure weight is relevant for patios, decks, and delivery planning.
- Waste factors should remain explicit because curved and cut-heavy work increases breakage.
- Construction output should include course-by-course instructions, vent locations, and cure-time guidance.

### Product and UX Expectations

- Construction Mode should show layer-by-layer output suitable for build sequencing.
- Safety output should read like a compliance packet, not just a warning banner.
- Persistence via local storage or shareable URL state is useful for field workflows.
- Manufacturer or material presets would improve realism for exact counts and weights.

## Current Implementation Coverage

Status key:

- Implemented: covered in the app today.
- Partial: represented in some form, but not to the depth described in research.
- Missing: not represented in the current code path.

### Implemented

- Circular firepit geometry using the centerline formula.
- Rectangular firepit geometry with shape-aware spans and quantity calculations.
- Actual modular brick dimensions as the default baseline.
- Configurable mortar joint.
- Running bond with 50% alternating course offset.
- Fuel-specific vent placement for propane, natural gas, and wood.
- Minimum 18 sq in vent-area floor plus gas vent-area range warnings (18 to 36 sq in guidance).
- Opposing-side/cross-vent validation for gas layouts.
- Gas-line entry planning with auto-adjustment away from vent openings.
- Foundation footprint diameter and 8 in angular stone volume.
- Safety warning when combustible structure clearance is below 10 ft.
- Thermal liner modeling with fire-brick and steel-ring options.
- Liner expansion-gap modeling in calculations and output.
- Layer-by-layer SVG construction output.
- 3D geometry preview using React Three Fiber, driven by resolved wall and cap unit dimensions.
- Logistics estimates for waste, brick weight, stone weight, cap units, and mortar volume.
- Tight-radius circular advisory (`tight-radius-half-bat-recommended`) and cut-plan half-bat guidance below 24 in inner diameter.
- Mortar curing advisory (`mortar-curing-required`) when mortar joints are present.
- Capstone preset support including matching, flat stone, rowlock, and additional cap profiles.
- Construction packet details covering liner guidance, vent layout, gas-line routing checks, and 28-day curing guidance.
- Reference tests for circular counts, rectangular plans, vent placement behavior, gas-line routing, cap logic, and safety warnings.

### Partial

- Square planning exists via rectangular dimensions, but there is no dedicated square-specific mode or corner-bonding guidance set.
- Wood venting is implemented, but airflow performance is still represented as design guidance rather than combustion simulation.
- Capstone overhang and presets are implemented, but explicit drip-edge detailing rules remain advisory-focused rather than geometry-enforced.
- Logistics estimates are broad and useful, but still do not include adhesive-specific quantity modeling.
- Safety visualization covers horizontal clearance only; vertical clearance is not modeled.

### Missing

- Double-wall cavity construction logic and cavity-specific thermal behavior.
- Explicit corner-overlap pattern guidance for rectangular corner interlock details.
- Dedicated soldier-course cap behavior.
- Vertical exclusion-zone visualization.
- Shareable URL-state persistence for portable links (local browser persistence is implemented).
- Manufacturer-specific material presets and exact per-unit weight models.

## Open Gaps in the Current Code Implementation

The most important remaining gaps, based on current implementation and the research target state, are below.

### 1. Thermal Safety Model Is Still Too Shallow

The code now supports liner type selection and expansion-gap output, but advanced thermal assembly rules are still not modeled:

- no double-wall cavity,
- no cavity heat-transfer assumptions or liner retention hardware modeling.

This remains one of the larger engineering gaps for higher-output wood-burning scenarios.

### 2. Corner and Non-Circular Bonding Details Need More Depth

The engine supports both circular and rectangular footprints, but detailed corner-overlap and corner-cut planning for rectangular builds is still limited.

### 3. Visualization Accuracy Lags Behind the Engine

The 3D stage now consumes resolved unit dimensions from output. Remaining visualization gaps are mostly around richer construction intent overlays (for example, explicit corner interlock and vertical exclusion visualization).

### 4. Ventilation Output Is Directionally Correct but Not Construction-Grade

The model now includes fuel-specific placement, gas vent-area range warnings, and gas-line entry checks. Remaining limits include:

- hardware-specific compliance,
- burner-manufacturer-specific cavity diagrams.

### 5. Safety Coverage Is Only Horizontal

The current warning system correctly enforces the 10 ft horizontal rule, but the newer research also introduces vertical clearance and site exclusion-zone reasoning.

### 6. Construction Packet Is Not Yet a Full Build Packet

The exported packet now includes quantities, warnings, course SVG output, liner guidance, gas-line checks, and curing guidance, but it still does not include:

- cap style instructions,
- stepwise checklist items.

## Recommended Next Implementation Order

1. Add vertical clearance and exclusion-zone output to safety visualization and warnings.
2. Add rectangular corner-overlap/interlock guidance with explicit corner detailing in packet output.
3. Extend thermal modeling toward double-wall cavity rules and higher-fidelity liner assembly guidance.
4. Add URL-state share links for portable design handoff.
5. Expand manufacturer-specific material presets and per-unit weight fidelity.
6. Add richer cap style instruction variants (including soldier-course specific guidance) in packet output.
