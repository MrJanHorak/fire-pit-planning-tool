# Fire Pit Planner: UI/UX and Product Audit

Date: 2026-09-24  
Published site: https://fire-pit-planning-tool.vercel.app/

## Executive assessment

This is a capable and unusually feature-rich planning prototype. The 3D view, multiple masonry shapes, construction view, quantities, saved projects, and safety guidance make it useful. The code builds, TypeScript passes, and all 103 existing tests pass. It is not yet ready to present as a dependable, broadly usable build-planning tool without the corrections below. The highest priorities are analytics consent, safety status wording, and the mobile design flow.

## Method and limits

- Reviewed the published app in a browser at a desktop viewport and at 390 × 844 px, including the default designer flow and material cost table.
- Traced the relevant UI, calculation, consent, sharing, and offline code in the repository.
- Ran TypeScript (`tsc -b`), production Vite build, and Vitest: 11 test files, 103 tests passed. The test run prints a multiple-Three.js-instance warning.
- This is a product and code audit, not a formal accessibility certification, load test, legal review, or professional engineering validation. I did not test every configuration or browser.

## Prioritized findings

### P0 — Analytics runs before the promised opt-in

**Evidence:** `index.html:6-22` immediately loads `gtag.js` and calls `gtag('config', ...)` before the consent dialog. `src/App.tsx:425-500` separately implements consent-controlled loading. The footer at `src/App.tsx:1973` and the consent dialog at `src/App.tsx:2050` promise that analytics is loaded only after opt-in. The published page still contains the Google Tag Manager script after “Decline Analytics.”

**Impact:** The consent choice does not match the site's behavior. A first page view may be sent before a choice; later denial cannot undo it. This is a privacy and trust problem, regardless of the precise legal requirements for a given visitor.

**Fix:** Remove the unconditional tag and config from `index.html`. Keep a single analytics initialization path that loads the tag only after a stored or new grant. Verify a fresh profile and a declined profile make no GA request; verify acceptance enables it and a later decline stops future events. Google's [basic consent mode explanation](https://developers.google.com/tag-platform/security/concepts/consent-mode) describes the no-transmission-before-consent behavior that the site claims.

### P1 — “Ready to plan build” can coexist with serious unresolved warnings

**Evidence:** `src/App.tsx:975-986` checks only six warning codes before displaying “Ready to plan build” at `src/App.tsx:1818`. The calculation engine emits other material warnings, including an unsafe insert flange (`src/engine/MasonryEngine.ts:2233`), insufficient insert depth (`:2244`), an unsuitable inner-wall heat rating (`:2195`), and low overhead clearance (`:2154`). Those codes are absent from the blocking set.

**Impact:** The prominent positive badge can contradict detailed safety output. Users may take it as a build readiness signal and miss warnings hidden lower in the page.

**Fix:** Define warning severity in the engine's warning data, derive the summary from the worst active warning, and use wording such as “Review required before building.” Display the top reasons and links to the exact inputs. Add tests for unsafe flange, insufficient depth, inner-wall material, overhead clearance, and gas vent failures.

### P1 — A 10 ft advisory is presented as a universal “IBC” pass

**Evidence:** `src/utils/regionalCodeReview.ts:31-36` labels the check “IBC setback to combustibles” and returns `pass` at 10 ft. `src/engine/MasonryEngine.ts:2144` says 10 ft is the “minimum horizontal clearance.” No location or adopted code is established by the tool.

**Impact:** The terminology implies code compliance that the app has not established. The [U.S. Fire Administration](https://www.usfa.fema.gov/prevention/outdoor-fires/) recommends at least 10 ft as general safety advice, while the [2025 Oregon Fire Code](https://codes.iccsafe.org/content/ORFC2025P1/chapter-3-general-requirements) gives different distances for recreational fires and portable fireplaces. Actual rules depend on use, jurisdiction, adopted code, and manufacturer instructions.

**Fix:** Rename this a “general clearance screening” with the 10 ft baseline attributed to USFA. Use `review` or “baseline met” rather than “IBC pass” until location and applicable fire code are verified. Keep local authority and manufacturer verification next to the result, not only in the footer. Have the numeric safety heuristics and construction guidance reviewed by an appropriate domain expert before marketing them as engineering accurate.

### P1 — Mobile users encounter output long before any design controls

**Evidence:** On the published site at 390 × 844 px, the first screen shows the header and summary cards. The “Design Inputs” heading begins about 4,079 px down the page. `src/App.tsx:1485` assigns the quick start and controls `order-2`, while `src/App.tsx:1559` gives the output column `order-1` below the desktop breakpoint. The default 3D preview and long bill of materials are consequently above the inputs.

**Impact:** A new visitor may not realize the page is interactive; changing a dimension requires several screens of scrolling. This is the largest first-use UX problem.

**Fix:** Put a compact quick start and the three core dimensions before output on mobile. Follow with a concise result summary and preview; put the full bill of materials in its own section or disclosure. A persistent “Edit design” jump link could help on long results, but should not replace correct order.

### P1 — The core dimensions are hidden under “Materials”

**Evidence:** The visible “1 Layout” section offers plan shape only. Inner diameter/width and wall height appear inside the initially collapsed “2 Materials” section (`src/components/ControlPanel.tsx:431`, `:1518`, `:1710`). The live mobile interface confirms this arrangement.

**Impact:** The most basic planning edits are undiscoverable and categorized where users would not expect them.

**Fix:** Move inner size, depth (when needed), and wall height into the always-visible Layout section. Keep masonry unit type, bond, cap, and mortar under Materials. Make the quick preset visibly update these fields.

### P2 — Material pricing is awkward and ambiguously labeled on phones

**Evidence:** At 390 px, the BOM table's scroll container is 308 px wide while the table is about 482 px wide (`src/components/BillOfMaterials.tsx:631`). Unit-price inputs begin near the right edge, so they are clipped until a horizontal pan. There is no visible scroll cue. Every cost input has the same accessible name, “Unit price” (`src/components/BillOfMaterials.tsx:80-108`), without the material name.

**Impact:** Cost entry is hard to discover on touch screens, and screen-reader users cannot reliably tell which row a price belongs to.

**Fix:** Use stacked item cards on small screens or a responsive row layout with the price field fully visible. Pass each item name into `CostInput` for a unique accessible label. Keep the table for wider screens.

### P2 — Project data is sent to a QR service without an explicit cue

**Evidence:** `src/components/FieldPlannerPanel.tsx:136-148` builds a share URL containing the project name and design parameters, then places the full URL in a request to `api.qrserver.com` when the QR image is shown. The footer and privacy policy (`src/content/siteContent.ts:347-389`) describe local storage and Google Analytics but do not mention this service.

**Impact:** Users may reasonably assume their design stays in the browser until they share it. Opening the QR tool sends the design URL to a third party.

**Fix:** Generate the QR code locally in the browser, or clearly disclose the third-party request before loading it. A local generator also helps the advertised offline field workflow.

### P2 — Heavy default 3D view needs a measured performance budget

**Evidence:** The production build emits a 696 kB Three.js runtime chunk (179 kB gzip), plus 230 kB Drei, 168 kB React Three Fiber, and 168 kB Stage3D chunks before textures. `src/App.tsx:318` selects the 3D tab by default. This is a bundle observation, not a measured Core Web Vitals failure.

**Impact:** Initial interaction on slower phones may be delayed by JavaScript parsing and WebGL work.

**Fix:** Measure real mobile LCP, INP, and memory first. Consider rendering a lightweight preview/placeholder until the user opens 3D on narrow screens; retain immediate 3D where it performs well. Set performance budgets and test low-power devices.

### P3 — PWA and documentation polish

- `public/manifest.webmanifest:12` uses a 1200 × 630 social image as the only app icon. Supply square 192 and 512 px icons, including a maskable variant, and verify the installed appearance.
- `public/sw.js:1` has a fixed cache name and cache-first responses for assets. Review update behavior with two deployed versions and offline navigation; add versioning and response checks if needed. This is a maintenance risk, not a reproduced outage.
- `README.md:66-82` lists completed features in a “Known Limitations” table and says PBR materials are planned, while other sections describe richer rendering. Reconcile the capability and roadmap descriptions so the public claims match the current build.

## What is working well

- Useful end-to-end scope: presets, material quantities, 3D and build views, export, snapshots, share links, safety and foundation guidance.
- Clear thematic visual identity and generally readable desktop grouping.
- Helpful progressive disclosure for genuinely advanced controls and detailed references.
- Clean repository status before the report, successful production build, and 103 passing tests covering the engine, utilities, and selected components.

## Action plan

| Order | Work | Definition of done |
|---|---|---|
| 1 | Fix analytics initialization | No GA script/request before consent; accept and decline paths verified in a fresh browser profile. |
| 2 | Correct safety summary and code wording | All serious warnings surface above the fold; no positive badge with unresolved serious warnings; location-neutral advisory copy and tests. |
| 3 | Rebuild mobile information order | Quick start and core dimensions visible before the result sections at 390 px; no long scroll before first edit. |
| 4 | Make BOM usable on mobile | Price fields visible without horizontal panning; every field has an item-specific accessible label. |
| 5 | Localize QR generation and verify offline use | Opening the QR tool makes no third-party design-data request; generated code scans and restores the intended configuration. |
| 6 | Performance and quality pass | Measure mobile Web Vitals and low-power WebGL fallback; fix proven bottlenecks, add app-level workflow tests, square PWA icons, and refresh documentation. |

## Recommendation

Keep the project published as a portfolio/demo tool while addressing items 1–5. For stronger claims such as “build-ready,” “engineering-accurate,” or code compliance, first obtain an independent review of safety assumptions and construction output. The current foundation is strong; these changes would make it easier to use and more trustworthy without broad feature expansion.

## Local implementation update

The first remediation pass is complete in the local workspace; these changes are **not yet published**.

- Removed the unconditional Google Analytics tag from the HTML. A fresh local preview with analytics declined contained no Google Analytics script.
- Replaced the partial build-readiness check with an exhaustive warning classification and an always-visible safety summary. Removed “Ready to plan build” language.
- Renamed the IBC-labeled check as general clearance screening, cited the U.S. Fire Administration's 10 ft general advice in the result, and clarified that local rules and manufacturer instructions can differ.
- Moved quick start and core dimensions ahead of results on phones. Rebuilt the phone-width material list as cards with visible price fields and item-specific accessible names.
- Generated share QR codes locally with `qrcode.react`, avoiding requests to the prior QR service.
- Replaced the universal 28-day mortar claim with product-specific curing and first-fire guidance throughout the engine, field toolkit, instructions, and exported report. Manufacturer examples differ: [RUTLAND castable refractory cement](https://rutland.com/products/castable-refractory-cement) describes at least 24 hours of drying, while [QUIKRETE fireplace mortar](https://www.quikrete.com/PDFs/DATA_SHEET-Fireplace-Mortar-8620-21.pdf) describes its own air-dry and staged heat-cure procedure.
- Corrected the printable report's former 10 ft “PASS”/“FAIL” and generic gas-vent range. It now presents a general site screen and modeled equipment-template range, with independent review called out. Every action-level warning is shown directly in the designer summary.
- Corrected the exported clearance diagram so its 10 ft ring and structure marker are measured from the outer pit edge. Removed permit-style pass/fail language from the construction packet. Frost review no longer treats the estimated stone layer depth as a frost footing depth.
- Removed absolute claims that named natural stones are inherently safe under repeated fire exposure; stone can fracture or spall under heat, including granite ([Smithsonian stone weathering review](https://repository.si.edu/bitstreams/f3b86787-fc58-4295-89c6-193ee34e13e3/download)). Renamed the downloadable construction artifact a planning packet and added a site-verification note.
- Removed an unsupported universal 572°F failure point for general masonry mortar and directed users to the selected firebox product’s heat rating and installation instructions.
- Flagged combustible mulch as an action item, removed a clearly invalid 500 lb/ft³ mulch-weight estimate, and corrected the explanation of stone face area from linear feet to square feet.
- Applied compatible dependency security updates. Production audit now reports **0 vulnerabilities**; seven development-tool advisories remain and need a separate upgrade review.

TypeScript, all 109 tests, and the production build pass after this pass. The browser review confirmed the revised phone layout and cost cards. Remaining work: independent engineering review and source traceability for calculations, mobile performance measurement, PWA icon/update polish, and the remaining development dependency advisories. The project should still be described as a planning tool until those gates are complete.

## Engineering continuation

The next local pass created [ENGINEERING_ASSUMPTIONS.md](ENGINEERING_ASSUMPTIONS.md) to record which figures are mathematical geometry, which are illustrative model assumptions, and which require an exact product or site review. The README now points to this register and no longer advertises unsupported commercial insert fitment or validated smokeless performance.

- Fixed hexagonal and octagonal natural-stone face area to use the outer polygon perimeter. Aligned its 4–8 in weight range with the same tonnage model, and reused the outer polygon perimeter for double-wall tie estimates. Added regression tests for both polygon shapes.
- Disabled named Solo Stove, Breeo, and TIKI masonry fit calculations. Earlier profiles confused freestanding body dimensions with insert flange dimensions; the engine now returns no fit geometry for a legacy selection and flags it for action. New designs offer measured DIY liner inputs only. [Breeo's insert-ring page](https://breeo.com/products/x-series-insert-ring) provides actual surround opening ranges, while [TIKI's Patio product page](https://tikibrand.com/collections/smokeless-fire-pits/products/patio-smokeless-fire-pit) calls for 15 ft from combustibles.
- Reclassified generic gas vent bands as illustrative scenarios. Every gas design now prompts verification against the exact burner and enclosure manuals, including free area per side and vent location. [American Fire Glass](https://americanfireglass.com/media/manual/Match%20Light%20Kits.pdf) and [The Outdoor Plus](https://theoutdoorplus.com/wp-content/uploads/2024/09/Fire-Pit-Manual.pdf) specify different vent rules for their products.
- Removed unsourced 21 ft wood and 15 ft gas overhead pass markers. Every configuration now needs overhead clearance review against actual equipment and site conditions, and the diagram no longer marks an arbitrary vertical threshold.
- Removed unsourced temperature “ratings” assigned to generic brick and stone categories. Double-wall firebox designs now require a product-specific material and mortar review.
- Reworded DIY smokeless ratios, draft pressure, flange overlap, and opening counts as illustrative model output and added an unresolved fabrication review warning. The planning packet and construction view now show the hole layout as a review sketch rather than a drill instruction.
- Added square 192 px and 512 px PWA icons. Updated the service worker to cache these assets, keep unrelated caches, reject failed responses, and serve successful network responses even when cache storage fails.

These changes reduce false precision; they do not constitute engineering sign-off. TypeScript, all 113 tests, and the production build pass locally. Product SKU integration, measured validation examples, site-specific design review, mobile performance, and installed-app/offline update checks remain release gates.
