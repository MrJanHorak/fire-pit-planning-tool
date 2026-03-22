# CLAUDE.md

## Project Mission

Build and maintain an engineering-accurate Parametric Masonry Designer for firepits with real-time calculation, safety checks, and build sequencing outputs.

## Engineering Rules (Do Not Violate)

1. Use actual masonry dimensions (default modular brick): 3.625 in x 2.25 in x 7.625 in.
2. Include configurable mortar joint with default 0.375 in.
3. Running bond is required: each adjacent course offsets 50% module from previous course.
4. Circular course count uses centerline formula:

   N = (pi * (D - W)) / (L + J)

5. Fuel-specific venting:
   - Propane: vents at base courses.
   - Natural Gas: vents near upper courses.
6. Foundation sub-base:
   - Angular stone depth fixed at 8 in.
   - Footprint diameter is 6 in wider on each side of outer wall (outer + 12 in total).
7. Safety warning if combustible structure proximity is below 10 ft.

## Technical Rules

1. Frontend stack must stay React 19 + Tailwind CSS v4.
2. 3D visualization must use @react-three/fiber.
3. Construction Mode must expose SVG layer-by-layer plan.
4. Core formulas and safety checks belong in `MasonryEngine` and must be unit tested.

## Testing Patterns

1. Keep at least one reference test for 36 in inner diameter circular pit with 8 in modular unit expectation near 15 units per course.
2. Keep explicit test for 10 ft structure clearance warning trigger.
3. Add tests for vent placement when modifying fuel logic.
