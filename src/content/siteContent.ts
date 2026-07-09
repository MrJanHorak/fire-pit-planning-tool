export interface ContentSection {
  title: string;
  intro?: string;
  bullets: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const LEGAL_LAST_UPDATED = 'March 23, 2026';

export const quickStartSteps: ContentSection[] = [
  {
    title: '1. Set the firebox size',
    intro:
      'Begin with the opening you want to gather around, then set plan shape, wall height, and brick size that fit that scale.',
    bullets: [
      'Choose plan shape first: circular, square, rectangular, hexagonal, or octagonal. Rectangular plans use both inner width and inner depth; square keeps width and depth aligned. Hexagonal and octagonal plans use a flat-to-flat inner span and automatically compute polygon perimeter, corner count, corner-interlock guidance, and miter/taper cut requirements for both wall and cap courses.',
      'Use the inner size as the main driver. The layout updates the outer wall, centerline, and course count from that value.',
      'A 36 in circular opening is a solid starting point for a medium gathering pit. For polygon shapes (hex, oct), a flat-to-flat span of 36–40 in gives a comparable firebox opening with the visual interest of angled sides.',
      'Stick with modular brick and a 3/8 in joint if you want counts that align with common masonry references.',
      'Natural stone presets (ledgestone, fieldstone, mosaic) offer an alternative to modular brick. Stone is heavier, weathers differently, and requires careful stone type selection because some minerals absorb water and can explode under heat. See the stone type selector and safety warnings for high-risk types.',
    ],
  },
  {
    title: '2. Choose fuel and heat protection',
    intro:
      'Fuel type changes how the fire pit vents and how much thermal protection the interior should have.',
    bullets: [
      'Wood-burning pits should usually include a refractory liner or steel ring to protect the outer shell from repeated heat cycling.',
      'Propane vents belong low in the wall because LP gas settles near the base.',
      'Natural gas vents belong high because the gas rises and needs upper relief.',
      'For gas builds, set the gas-line entry angle so routing stays clear of vent openings and confirm hardware-specific vent area requirements.',
      'If you select double-wall, treat cap closure as a structural decision: verify cap-bridge rows, row-by-row unit counts, and closure units before ordering.',
    ],
  },
  {
    title: '3. Review buildability',
    intro:
      'Before you price materials or lay anything out on site, review the count, cut, and safety information together.',
    bullets: [
      'Read the safety warnings first, especially structure clearance and gas vent guidance.',
      'Use Soil Type, Drainage, and Freeze-Thaw fields to review foundation risk level while keeping the baseline 8 in angular-stone quantity model fixed.',
      'Use Optional Insights for regional code checks, material optimization suggestions, and side-by-side snapshot comparison when needed.',
      'Check unit count, purchased quantity, mortar volume, and stone volume before ordering materials.',
      'Use Construction Mode to review the courses one layer at a time before the build begins.',
    ],
  },
  {
    title: '4. Adjust for cleaner layout',
    intro:
      'Once the main size feels right, make small changes that improve finish quality and reduce cutting.',
    bullets: [
      'For circular pits, compare the no-cut sizes if you want cleaner wall and cap courses. For square and rectangular pits in DIY butt-joint cap mode, all corner cap cuts are eliminated — one run extends through the corner and the crossing run butts into it flush.',
      'Select a capstone cut strategy once cap size is stable: full-fit (every cap tapered or mitered for tight coverage), corner-only (face caps stay rectangular, only corner pieces are cut), or DIY butt-joint for square/rectangular plans (zero saw cuts, straight runs). The build packet generates a cut schedule, SVG placement diagram, and tool guidance for the selected strategy.',
      'Tune wall course strategy after geometry is stable: uniform running bond, shim spacer, or vented accent.',
      'Use cap orientation and cap placement mode to control how the top course reads and how far it projects inward versus outward.',
      'Keep cap overhang modest so the top course sheds water without feeling oversized.',
      'If the curve is tight, consider radial units or expect tapered cuts at the wall and cap.',
      'For double-wall caps, keep a mortar gap between cap rows and review the cap-bridge row schedule so adjacent rows do not overlap.',
    ],
  },
];

export const designBestPractices: ContentSection[] = [
  {
    title: 'Best-practice sizing',
    bullets: [
      'A 36 in inner diameter remains a strong reference point for a medium circular fire pit and should land near 15 units per course with modular brick.',
      'Increase wall height carefully. Taller pits can become visually heavy and may reduce seated comfort if the opening feels too deep.',
      'For curved work, larger diameters reduce taper-cut demand and usually produce cleaner mortar joints.',
    ],
  },
  {
    title: 'Materials and detailing',
    bullets: [
      'Use actual masonry dimensions, not nominal dimensions, when checking counts or ordering units.',
      'A 1 to 2 in cap overhang helps with water shedding and gives the finished pit a more intentional profile.',
      'Custom radial units are worth using when the visual goal is a tight, refined curve with fewer wedge cuts.',
      'Natural stone selection is critical: granite, basalt, and marble are safe choices; river-rock, sandstone, limestone, and shale are high-risk because they absorb moisture and can fail catastrophically under repeated heating.',
      'For stone, the face-foot estimate tells you how many linear feet of stone face area will be exposed in the finished wall. The tool calculates tonnage at 8 in and 4 in depths with 10–15% waste buffers so you can order the right quantity.',
      'Dry-stack stone has a rustic aesthetic and no curing time, but relies on gravity and friction. Mortared stone offers more security and allows tighter joints, but requires 28-day curing before the first fire and is more vulnerable to joint cracking in wet or freeze-thaw climates unless drainage is detailed carefully.',
    ],
  },
  {
    title: 'Polygon and multi-sided plan shapes',
    bullets: [
      'Hexagonal and octagonal plans produce a polygon wall with clipped corner units on every course. Corner units are marked C in the course layout and require miter cuts so adjacent faces close cleanly.',
      'Vent openings on hex/oct shapes are centered on flat side faces. Never place vent openings at a polygon corner — corner units are structural closure pieces that block and distort airflow.',
      'Cap cut strategy matters more on polygon shapes: full-fit gives the cleanest cap coverage with all tapers and miters; corner-only keeps face caps rectangular and only cuts the polygon corner pieces. Both produce accurate coverage when cut to the listed angles.',
      'Polygon cap pieces are always cut to a specific miter angle — the angle depends on the side count (hex = 60° corners, oct = 45° corners). Review the cut-type SVG diagram in the build packet before setting the saw.',
      'Double-wall polygon pits require the outer shell to follow the same polygon geometry on a larger centerline. Check outer course row counts and outer corner alignment separately from the inner shell.',
    ],
  },
  {
    title: 'Capstone cut strategy',
    bullets: [
      'Full-fit: every cap unit is tapered or mitered to conform to the ring. This produces the tightest mortar joints and cleanest coverage, but requires the most saw work. Recommended when visual quality is the priority.',
      'Corner-only (DIY): face capstones stay full rectangular units; only the corner caps are cut. Outer joints on face runs will be wider or less uniform. This is the best balance of cut reduction and ring coverage for circular, hex, and oct plans.',
      'DIY butt-joint (square/rectangular only): one cap run extends straight through each corner; the perpendicular run butts flush into it. Zero saw cuts are needed. Review the build packet for which axis should be the through-run vs. butt-run.',
      'The build packet generates a separate cut schedule table, an SVG placement diagram, and saw-setup guidance for each strategy. Review all three before cutting stock.',
      'Wall cut settings and cap cut settings are always independent — do not interchange them. The wall taper angle applies to wall bricks only; the cap taper angle applies to capstone units only.',
    ],
  },
  {
    title: 'Site and build planning',
    bullets: [
      'Keep the sub-base wider than the wall footprint and use compacted angular stone rather than rounded aggregate.',
      'Reserve extra space for chairs, circulation, and spark safety even when the minimum clearance warning is satisfied.',
      'Treat patios, decks, clay-heavy soils, and slopes as separate engineering checks before construction starts.',
    ],
  },
  {
    title: 'Seating area ground preparation',
    bullets: [
      'Compacted Gravel: Most popular choice. Extend gravel zone at least 10 ft from pit outer wall, slope 2–3% outward for drainage, top-dress every 2–3 years.',
      'Mulch: Natural look, comfortable underfoot, but decomposes in 2–3 years. Use landscape fabric underneath to prevent weeds and grass creep.',
      'Decomposed Granite: Durable packed surface, minimal maintenance. Apply stabilizer binder for a more solid finish if desired.',
      'Permeable Paver with Grass: Eco-friendly, drains well, supports turf. Requires careful sand leveling and 2–3 weeks for grass establishment.',
      'Hardscape (Concrete/Stone): Most durable and low-maintenance option. Plan for 28-day curing and consider sealing for slip resistance and longevity.',
      'Pair seating ground type with foundation risk level: high-risk sites benefit from permeable or hardscape surfaces that manage water runoff effectively.',
    ],
  },
  {
    title: 'Workflow and revision control',
    bullets: [
      'Name your project early so exported JSON and snapshots stay easy to track during iterations.',
      'Use Save As Snapshot before large geometry or fuel changes so you can compare design branches safely.',
      'Use import and export to move the exact design state between browsers, devices, or review sessions.',
      'Use Engineering Report PDF in Build Plan to generate a review-ready report for permitting and stakeholder handoff.',
    ],
  },
];

export const safetyTips: ContentSection[] = [
  {
    title: 'Safety checkpoints',
    bullets: [
      'Maintain at least 10 ft horizontal clearance to combustible structures as a baseline, and check local code for stricter setbacks.',
      'Consider overhead branches, pergolas, soffits, and nearby fencing, not just plan-view distance.',
      'Do not treat standard facing brick as equivalent to refractory material for the hottest interior zone of a wood-burning pit.',
      'Gas features should be vented according to fuel density and burner hardware requirements, not generic decorative openings.',
      'If gas-line entry is close to a vent axis, adjust routing and verify final line location against vent layout before install.',
    ],
  },
];

export const researchHighlights: ContentSection[] = [
  {
    title: 'How masonry geometry controls the whole build',
    intro:
      'Most install headaches start with layout. If the first course is off by a little, every course above it repeats that error.',
    bullets: [
      'Running bond is structural, not just visual. The 50% offset helps prevent stacked vertical joints that can act like a weak seam.',
      'For circular walls, count units on the centerline using actual brick size plus mortar joint thickness. That keeps ordering realistic and helps the curve stay true.',
      'The 8 in angular stone base with a 6 in extension per side gives the wall a wider, more stable platform and lowers settlement risk.',
      'Quick field check: dry-lay one full course first. If outside joints open up quickly, you are likely at a size that needs tapered cuts or radial units.',
    ],
  },
  {
    title: 'What experienced builders check before ignition day',
    intro:
      'A pit can look finished and still perform poorly if heat, airflow, and placement are handled late. This is where design choices become safety outcomes.',
    bullets: [
      'Excavation depth is site-specific. Many permanent features land in the 6 to 12 in range, but softer or expansive soils usually need more conservative footing decisions.',
      'Foundation risk is not only about soil label. Drainage and freeze-thaw matter because wet, moving subgrade can damage even a neatly built wall.',
      'Wood-burning pits should protect the hottest interior with a refractory liner or steel ring. Decorative outer masonry is not a replacement for heat-rated interior protection.',
      'Gas venting should follow fuel behavior and burner specs. A common planning range is 18 to 36 sq in of total vent area, then confirm with the exact hardware documentation.',
      'Clearance is a 3D check. Horizontal setback is only the start; overhead branches, pergolas, soffits, and movement around the pit matter just as much.',
      'Good safety practice also includes operations: checking wind, respecting no-burn advisories, and never leaving active embers unattended.',
    ],
  },
  {
    title:
      'How to think about the foundation without breaking the baseline rules',
    intro:
      'The app keeps one fixed engineering baseline for quantity calculations, then layers practical site review on top of it. That keeps the math stable while still acknowledging real field conditions.',
    bullets: [
      'Baseline math stays fixed at 8 in of compacted angular stone with the footprint extended 6 in beyond the wall on each side.',
      'Site review then asks three practical questions: what is the soil, how well does the area drain, and is freeze-thaw a real condition?',
      'Dense granular, well-drained sites usually align with the baseline. Unknown fill, expansive clay, slow drainage, or frost-sensitive sites should move into a higher review category before construction starts.',
      'This is why the app now shows a foundation advisory level instead of silently changing the core quantity outputs.',
    ],
  },
  {
    title: 'Small details that separate a clean build from a frustrating one',
    intro:
      'The smoothest installs are won during planning. Good sequencing removes guesswork before mortar and saw work start.',
    bullets: [
      'Square, rectangular, hexagonal, and octagonal layouts need explicit corner overlap logic so each course locks through the corner instead of creating a vertical crack line. For polygon shapes, every corner unit is a miter-cut closure piece — mark those locations in the dry-lay before mortaring.',
      'Tight-radius circles often require half-bats, tapered cuts, or radial units. Planning that early keeps joints consistent and prevents rushed saw work late in the project.',
      'Use a two-track cut workflow: manual marking uses equal per-side offsets from the inner edge, while table/miter saw workflow uses the listed angle off square and mirrored side cuts. Both methods should produce the same taper.',
      'Cap design is both visual and functional. A modest overhang and drip strategy improve water shedding and can extend wall life in freeze-thaw climates.',
      'Before the first mortar mix, document the 28-day curing requirement, vent locations, liner spacing, gas-line entry routing, and final inspection checks. Mortared masonry must cure for a minimum of 28 days before the first fire is lit. This turns the build from improvised to repeatable.',
    ],
  },
  {
    title: 'A practical way to read these notes in the field',
    intro:
      'If you use this page during planning, follow one consistent order so decisions stay aligned from design through install.',
    bullets: [
      'Start with geometry: lock inner size, wall thickness, and course height. Do not tune cap style before the core counts are stable.',
      'Next validate safety envelope: horizontal clearance, overhead hazards, and fuel-appropriate vent placement.',
      'Then review thermal and material strategy: liner, expansion allowance, and base support assumptions.',
      'Finish with execution details: quantity buffer, cut plan, and course-by-course sequence in Construction Mode.',
    ],
  },
  {
    title: 'Natural stone selection and water safety',
    intro:
      'Natural stone brings beauty and durability to a firepit, but geology matters. Some stones are inherently safe; others carry explosion risk from trapped moisture.',
    bullets: [
      'Safe stone types: Granite and basalt are dense, non-porous, and absorb minimal water. Marble is also safe, though softer than granite. All three perform well under repeated heating.',
      'High-risk stone types: River-rock is rounded and porous. Sandstone, limestone, and shale are sedimentary and absorb water readily. When pore water trapped in these stones heats, steam pressure can build until the stone explodes. This is not a rare failure mode—it is a predictable risk that design rules eliminate.',
      'Why geology matters in fire: The danger zone is the interior surface where repeated heating occurs. Even a small amount of trapped moisture can accumulate over multiple fires. Stone selection is your primary control. A thermal liner (refractory or steel ring) provides secondary protection for the outer shell.',
      'Mortared stone considerations: Mortar joints can also trap water. In wet climates or freeze-thaw zones, mortared natural stone needs explicit drainage detail (foundation perimeter drain, sloped ground surface, or base moisture barrier) to stay healthy for 20+ years.',
      'Dry-stacking is an alternative: Gravity and friction alone hold dry-stacked stone. There is no mortar to trap water, and the assembly is inherently more forgiving of minor settling. The trade-off is that tight, symmetrical courses are harder to achieve without cutting, and the walls require more careful initial layout.',
    ],
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'How do hexagonal and octagonal plans work?',
    answer:
      'Hex and oct plans use polygon perimeter math rather than circular centerline formulas. Each course includes corner units that are miter-cut to close the polygon face. Vent openings are placed on flat face sides only — polygon corners are structural closure pieces that block airflow and should never be used as vents. The 3D preview clips each wall and cap unit to its correct polygon footprint, so you can verify coverage before building.',
  },
  {
    question: 'What is the difference between full-fit, corner-only, and DIY butt-joint cap strategies?',
    answer:
      'Full-fit tapers or miters every cap unit for the tightest possible ring coverage — most saw work but cleanest joints. Corner-only keeps all face cap units full rectangular and only cuts the polygon or ring corner pieces — a good balance for hex/oct and circular plans. DIY butt-joint is available for square and rectangular plans only: one cap run extends straight through each corner and the crossing run butts flush into it, requiring zero saw cuts. The build packet generates a cut schedule, SVG placement diagram, and tool guidance for whichever strategy you choose.',
  },
  {
    answer:
      'Start with plan shape, inner size, wall height, fuel type, and brick preset. Those five inputs determine most of the geometry and safety behavior. Leave mortar, cap, and vent tuning until the main form is stable.',
  },
  {
    question: 'What do the no-cut sizes mean?',
    answer:
      'For circular plans, the no-cut suggestions show inner diameters that let the wall, the cap, or both resolve without taper cuts. They are useful when you want cleaner coursing and faster layout on site.',
  },
  {
    question: 'How should I read double-wall cap closure rows?',
    answer:
      'R1 is the inner cap bridge row and higher row numbers move outward. Each row has its own perimeter and unit count, so row spacing and taper-cut guidance can differ. Use the Build Plan cap-bridge row schedule to cut and place rows with a mortar gap between rows instead of forcing rows to touch.',
  },
  {
    question: 'When should I use shim spacer or vented accent strategy?',
    answer:
      'Use Uniform first to lock core geometry. Shim Spacer is useful when you want finer circumference tuning with insert units. Vented Accent is useful when one repeating course should run more open joints and alternate orientation for airflow-driven detailing.',
  },
  {
    question: 'When should I add a thermal liner?',
    answer:
      'Wood-burning pits should generally use a refractory liner or steel ring to shield the outer shell from direct heat. Gas pits may also benefit from a protected inner zone depending on burner hardware and manufacturer guidance. If using natural stone, a liner provides double protection: it reduces the risk from water-absorbing stone and protects the outer masonry from thermal cycling.',
  },
  {
    question: 'Does the thermal liner need vent holes too?',
    answer:
      "In most builds, venting is handled by the wall vent gaps, not separate holes cut through the liner. The liner's job is thermal protection. Keep the annular space and vent path unobstructed, align vented courses with cavity airflow, and always follow burner or ring manufacturer instructions for any dedicated vent or drain requirements.",
  },
  {
    question: 'Why are some stone types flagged high-risk?',
    answer:
      'River-rock, sandstone, limestone, and shale are porous sedimentary or rounded stones that absorb and retain water. When trapped pore water heats during firing, pressure builds until the stone fails explosively. This is a predictable, high-risk failure mode. Granite, basalt, and marble are dense and non-porous, so they do not absorb significant water and are safe for fire-pit applications.',
  },
  {
    question: 'What does face-foot mean, and why is it important for stone?',
    answer:
      'Face-foot is the linear footage of stone face visible in the finished wall: it equals the outer perimeter times wall height, divided by 12. For stone walls, face-foot is used to estimate tonnage required because stone is sold by weight, not unit count. The tool calculates tonnage at both 8 in and 4 in depths with waste buffers so you know how much to order based on your finished wall thickness.',
  },
  {
    question: 'Should I use dry-stack or mortared natural stone?',
    answer:
      'Dry-stack has no mortar joints to trap water, is faster to build, and requires no curing time. Mortared stone offers tighter joints, cleaner appearance, and more stability through seismic events. The trade-off is 28-day curing time before first fire and higher risk of joint cracking in wet or freeze-thaw climates unless drainage is detailed. Choose dry-stack for outdoor, well-drained sites with rustic aesthetic goals. Choose mortared for sites with good drainage confidence and aesthetic preference for tight joints.',
  },
  {
    question: 'Does foundation design change with size and soil?',
    answer:
      'Yes. The app keeps a locked baseline of 8 in compacted angular stone with a footprint that extends 6 in per side, but larger footprints and weaker soils raise review priority. In practice, you should treat clay, organic fill, unknown subgrade, and very large diameters as conditions that may require deeper excavation, stabilization, or a concrete footing detail approved for your site.',
  },
  {
    question: 'How is size and soil context integrated in this app?',
    answer:
      'Use the Soil Type, Drainage, and Freeze-Thaw fields in Design Inputs. The engine still reports the baseline foundation quantities, and the Designer now adds a foundation advisory level (low, moderate, or high) with site-check notes based on site context and footprint size. This gives planning guidance without silently changing your core baseline math.',
  },
  {
    question: 'How should I use autosave, snapshots, and JSON files together?',
    answer:
      'Autosave continuously stores the current design in browser local storage. Use snapshots for named restore points before major changes. Use JSON export/import when you need to archive, share, or move projects across devices or browser sessions.',
  },
  {
    question: 'What are Optional Insights, and do I need them every time?',
    answer:
      'Optional Insights is a collapsible section that keeps advanced tools out of the main flow. Use it when you want regional code/advisory checks, material optimization prompts, or variant comparison between snapshots. For routine sizing and layout, you can keep it collapsed.',
  },
  {
    question: 'How do I generate a professional PDF report?',
    answer:
      'Open Build Plan and use the Engineering Report PDF button. It opens a print-ready report with executive summary, safety/compliance review, foundation notes, material quantities, and diagrams. Save it as PDF from your browser print dialog.',
  },
];

export const privacyPolicySections: ContentSection[] = [
  {
    title: 'Controller And Contact',
    bullets: [
      'Site owner: Jan Horak.',
      'Portfolio contact: www.janhorak.dev.',
      'GitHub profile: github.com/MrJanHorak.',
    ],
  },
  {
    title: 'What Data Is Processed',
    bullets: [
      'Design and project settings are stored in browser local storage for autosave and snapshots.',
      'When accepted, Google Analytics collects aggregate usage events and page interactions.',
      'This app does not require account registration or direct user profile creation.',
    ],
  },
  {
    title: 'Legal Basis And Consent',
    bullets: [
      'Strictly necessary local storage for core app functionality is used for project persistence.',
      'Analytics is optional and disabled by default until explicit user opt-in.',
      'You can withdraw analytics consent anytime using Cookie Settings in the footer.',
    ],
  },
  {
    title: 'Retention And User Controls',
    bullets: [
      'Project data remains in your browser until you delete it or clear storage.',
      'Use Clear Local Browser Data to remove saved project and snapshot records.',
      'Analytics consent preferences are versioned and may require reconfirmation after policy updates.',
    ],
  },
  {
    title: 'Third-Party Processing',
    bullets: [
      'Google Analytics (Google LLC) is used only after consent.',
      'Ad personalization features are disabled in analytics configuration.',
      'If you need region-specific legal wording, obtain legal review for your target markets.',
    ],
  },
];

export const termsOfUseSections: ContentSection[] = [
  {
    title: 'Informational Use Only',
    bullets: [
      'This tool provides planning and educational guidance for masonry firepit design.',
      'Outputs are not a substitute for licensed engineering or local code approvals.',
      'You are responsible for verifying all dimensions, materials, and safety constraints before construction.',
    ],
  },
  {
    title: 'Safety And Compliance Responsibility',
    bullets: [
      'Users must confirm setbacks, venting, and thermal protection against local requirements.',
      'Fuel system installation must follow manufacturer documentation and qualified installer standards.',
      'The publisher is not liable for on-site construction decisions or misuse of generated outputs.',
    ],
  },
  {
    title: 'Service Changes',
    bullets: [
      'Features, formulas, and guidance may be updated without prior notice.',
      'Policy and consent versions may be changed to align with product or legal updates.',
      'Continued use indicates acceptance of the current terms and privacy disclosures.',
    ],
  },
];
