# Parametric Masonry Designer

React 19 application for engineering-accurate masonry firepit design with real-time calculations, safety warnings, and visual construction outputs.

## Phase 1: Engineering Math

### 1. Masonry Unit Dimensions and Jointing

Default modular brick dimensions (actual):

- Width: 3.625 in
- Height: 2.25 in
- Length: 7.625 in
- Mortar joint (default, configurable): 0.375 in

### 2. Circular Unit Count (Centerline Formula)

For circular courses we use:

$$
N = \frac{\pi \cdot (D - W)}{L + J}
$$

Where:

- $N$ = units per course
- $D$ = outer diameter of wall
- $W$ = wall thickness (unit width in stretcher orientation)
- $L$ = unit length
- $J$ = vertical mortar joint thickness

The UI input uses inner diameter. Therefore:

$$
D = D_{inner} + 2W
$$

and:

$$
N = \frac{\pi \cdot (D_{inner} + W)}{L + J}
$$

Example with 36 in inner diameter and modular brick with 3/8 in joints:

$$
N = \frac{\pi \cdot (36 + 3.625)}{7.625 + 0.375} \approx 15.56
$$

Rounded for full-unit planning (course-by-course) uses floor:

$$
N_{rounded} = 15
$$

### 3. Running Bond

Running bond is enforced as a 50% module offset every alternate course:

$$
\text{offset}_{course} =
\begin{cases}
0 & \text{if even course}\\
\frac{L + J}{2} & \text{if odd course}
\end{cases}
$$

### 4. Ventilation Logic

- Propane (heavier than air): vents at base courses.
- Natural gas (lighter than air): vents near top courses.
- Wood: base venting for combustion support.
- Total vent open area constrained to at least 18 sq in.

### 5. Foundation/Sub-Base Calculation

Foundation footprint diameter is 6 in wider on each side:

$$
D_{footprint} = D_{outer} + 12
$$

Stone depth fixed at 8 in:

$$
V = \pi \cdot \left(\frac{D_{footprint}}{2}\right)^2 \cdot 8
$$

with conversions:

$$
\text{ft}^3 = \frac{V}{1728}, \quad \text{yd}^3 = \frac{V}{46656}
$$

### 6. Safety Clearance Rule

If structure proximity is below 10 ft, show warning.

### 7. Logistics and Material Estimation

The engine also computes practical construction estimates:

- Brick purchase quantity with 15% waste factor.
- Estimated brick dead load using 4.5 lb per modular brick.
- Estimated stone mass using 100 lb/ft3 and 10% handling waste.
- Mortar estimate using 0.0175 ft3 per purchased brick (midpoint rule from 15-20 ft3 per 1000 bricks).

### 8. Capstone Overhang and Cap Course

Capstone overhang is user-defined per side. Cap outer diameter is:

$$
D_{cap,outer} = D_{outer} + 2 \cdot O
$$

Where $O$ is cap overhang in inches on each side.

Cap course units are calculated using the same centerline formula with cap diameter:

$$
N_{cap} = \frac{\pi \cdot (D_{cap,outer} - W)}{L + J}
$$

## Project Structure

- `src/engine/MasonryEngine.ts`: core engineering formulas and rules.
- `src/engine/__tests__/MasonryEngine.test.ts`: verification tests.
- `src/components/Stage3D.tsx`: @react-three/fiber 3D stage.
- `src/components/ConstructionMode.tsx`: SVG layer-by-layer build map.
- `firepit-research.md`: engineering baseline and expanded research notes.

## Run

1. `npm install`
2. `npm run dev`
3. `npm run test`
