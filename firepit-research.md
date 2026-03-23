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

### Clearance and Code Considerations

- Horizontal setback of 10 ft is the minimum baseline and may be higher in some jurisdictions.
- Vertical clearance should also be considered for overhead structures or vegetation.
- A visual exclusion zone is useful so users can compare site obstacles to required clearances.

### Thermal and Material Performance

- Wood-burning firepits should use a refractory liner, fire brick, or steel fire ring for the hottest interior zone.
- Double-wall construction may be required where the outer decorative shell is separated from the hot inner liner.
- An air gap or sand-filled expansion zone helps accommodate differential thermal expansion.
- Standard brick or CMU should not be treated as equivalent to refractory material in a high-heat interior.

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
- Actual modular brick dimensions as the default baseline.
- Configurable mortar joint.
- Running bond with 50% alternating course offset.
- Fuel-specific vent placement for propane, natural gas, and wood.
- Minimum 18 sq in vent-area floor.
- Foundation footprint diameter and 8 in angular stone volume.
- Safety warning when combustible structure clearance is below 10 ft.
- Layer-by-layer SVG construction output.
- 3D geometry preview using React Three Fiber.
- Logistics estimates for waste, brick weight, stone weight, cap units, and mortar volume.
- Reference tests for 36 in circular count, vent placement, cap overhang growth, and 10 ft warning.

### Partial

- Brick presets exist, but visualization and downstream outputs do not fully reflect the selected unit dimensions.
- Header vs stretcher orientation affects engine math, but the 3D scene still uses hard-coded modular dimensions.
- Wood venting exists, but the construction display uses generic highlighted bricks rather than calculated airflow spacing.
- Gas venting has placement logic, but not explicit opposite-side cross-vent validation or hardware-specific area checks.
- Capstone overhang is implemented, but cap style selection and drip-edge detailing are not.
- Logistics estimates exist, but there is no total structure load summary or adhesive estimate.
- Safety visualization covers horizontal clearance only; vertical clearance is not modeled.

### Missing

- Refractory liner or steel fire ring modeling.
- Double-wall construction and thermal expansion gap logic.
- Square and rectangular footprint support.
- Corner-overlap logic for non-circular plans.
- Tight-radius checks, half-bat suggestions, or trapezoidal/wedge unit handling.
- Cap styles such as soldier, rowlock, or flat stone options.
- Vertical exclusion-zone visualization.
- Gas line entry planning in Construction Mode.
- Cure-time guidance and build checklist details in the packet.
- Persistence via local storage or URL state.
- Manufacturer-specific material presets and exact per-unit weight models.

## Missing in the Current Code Implementation

The most important implementation gaps, based on the newly added research, are below.

### 1. Thermal Safety Model Is Still Too Shallow

The code handles fuel-specific vent placement, but it does not model the hottest-risk construction items:

- no refractory liner,
- no fire ring option,
- no double-wall cavity,
- no thermal expansion gap.

This is the largest engineering omission for wood-burning scenarios.

### 2. The Engine Is Still Circular-Only

The research now describes circular, square, and rectangular masonry logic, but the current engine and UI only support circular layouts.

### 3. Visualization Accuracy Lags Behind the Engine

The app exposes brick presets and header orientation in the form, but the 3D stage still renders using fixed modular brick dimensions. That means the rendered model can diverge from the calculated design.

### 4. Ventilation Output Is Directionally Correct but Not Construction-Grade

The model places propane vents low and natural gas vents high, but it does not yet prove:

- opposing-side vent layout,
- vent area in the 18 to 36 sq in research band,
- hardware-specific compliance,
- gas cavity routing or line-entry planning.

### 5. Safety Coverage Is Only Horizontal

The current warning system correctly enforces the 10 ft horizontal rule, but the newer research also introduces vertical clearance and site exclusion-zone reasoning.

### 6. Construction Packet Is Not Yet a Full Build Packet

The exported packet includes quantities, warnings, and a course SVG, but it does not yet include:

- curing guidance,
- thermal liner notes,
- expansion-zone instructions,
- line-entry details,
- cap style instructions,
- stepwise checklist items.

## Recommended Next Implementation Order

1. Add refractory liner and expansion-gap support to the data model and MasonryEngine.
2. Make the 3D stage and construction packet consume the resolved unit dimensions so preset and orientation selections render accurately.
3. Upgrade vent modeling to support opposite-side placement and explicit gas vent-area validation.
4. Add vertical clearance and exclusion-zone output.
5. Expand the engine to square and rectangular footprints.
6. Add cap style variants and richer construction packet details.
