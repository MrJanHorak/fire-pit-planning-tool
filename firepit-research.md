# Firepit Research Notes

## Scope

This document captures engineering principles used by the Parametric Masonry Designer.

## Core Masonry Geometry

- Default modular unit dimensions (actual): 3.625 in x 2.25 in x 7.625 in.
- Mortar joint default: 0.375 in and configurable.
- Running bond: alternate courses offset by 50% of module length.

Circular count (centerline method):

N = (pi \* (D - W)) / (L + J)

Where:

- D is wall outer diameter.
- W is wall thickness.
- L is unit length.
- J is mortar joint.

If user input is inner diameter:

D = D_inner + 2W

## Ventilation Logic

- Propane vents at base (heavier than air).
- Natural gas vents near top (lighter than air).
- Wood-burning supports base airflow vents for combustion.
- Minimum total open area target: 18 sq in.

## Foundation Logic

- Sub-base material: compacted angular stone.
- Stone depth: 8 in.
- Footprint diameter: pit outer diameter + 12 in (6 in wider per side).

Volume of angular stone:

V = pi _ (D_footprint / 2)^2 _ depth

## Safety Rule

- Minimum horizontal clearance to combustible structures: 10 ft.
- Any input below 10 ft must trigger a warning.

## Build Documentation Requirements

- Include layer-by-layer construction view in SVG.
- Include 3D preview for geometry validation.
- Verify counts and safety constraints with automated tests.
