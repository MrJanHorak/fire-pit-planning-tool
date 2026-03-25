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
      'Choose plan shape first (circular, square, or rectangular). Rectangular plans use both inner width and inner depth, while square keeps width and depth aligned.',
      'Use the inner size as the main driver. The layout updates the outer wall, centerline, and course count from that value.',
      'A 36 in circular opening is a solid starting point for a medium gathering pit.',
      'Stick with modular brick and a 3/8 in joint if you want counts that align with common masonry references.',
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
    ],
  },
  {
    title: '3. Review buildability',
    intro:
      'Before you price materials or lay anything out on site, review the count, cut, and safety information together.',
    bullets: [
      'Read the safety warnings first, especially structure clearance and gas vent guidance.',
      'Use Soil Type, Drainage, and Freeze-Thaw fields to review foundation risk level while keeping the baseline 8 in angular-stone quantity model fixed.',
      'Check unit count, purchased quantity, mortar volume, and stone volume before ordering materials.',
      'Use Construction Mode to review the courses one layer at a time before the build begins.',
    ],
  },
  {
    title: '4. Adjust for cleaner layout',
    intro:
      'Once the main size feels right, make small changes that improve finish quality and reduce cutting.',
    bullets: [
      'For circular pits, compare the no-cut sizes if you want cleaner wall and cap courses.',
      'Tune wall course strategy after geometry is stable: uniform running bond, shim spacer, or vented accent.',
      'Use cap orientation and cap placement mode to control how the top course reads and how far it projects inward versus outward.',
      'Keep cap overhang modest so the top course sheds water without feeling oversized.',
      'If the curve is tight, consider radial units or expect tapered cuts at the wall and cap.',
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
    title: 'Workflow and revision control',
    bullets: [
      'Name your project early so exported JSON and snapshots stay easy to track during iterations.',
      'Use Save As Snapshot before large geometry or fuel changes so you can compare design branches safely.',
      'Use import and export to move the exact design state between browsers, devices, or review sessions.',
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
      'Square and rectangular layouts need explicit corner overlap logic so each course locks through the corner instead of creating a vertical crack line.',
      'Tight-radius circles often require half-bats, tapered cuts, or radial units. Planning that early keeps joints consistent and prevents rushed saw work late in the project.',
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
];

export const faqItems: FaqItem[] = [
  {
    question: 'What should a first-time user change first?',
    answer:
      'Start with plan shape, inner size, wall height, fuel type, and brick preset. Those five inputs determine most of the geometry and safety behavior. Leave mortar, cap, and vent tuning until the main form is stable.',
  },
  {
    question: 'What do the no-cut sizes mean?',
    answer:
      'For circular plans, the no-cut suggestions show inner diameters that let the wall, the cap, or both resolve without taper cuts. They are useful when you want cleaner coursing and faster layout on site.',
  },
  {
    question: 'When should I use shim spacer or vented accent strategy?',
    answer:
      'Use Uniform first to lock core geometry. Shim Spacer is useful when you want finer circumference tuning with insert units. Vented Accent is useful when one repeating course should run more open joints and alternate orientation for airflow-driven detailing.',
  },
  {
    question: 'When should I add a thermal liner?',
    answer:
      'Wood-burning pits should generally use a refractory liner or steel ring to shield the outer shell from direct heat. Gas pits may also benefit from a protected inner zone depending on burner hardware and manufacturer guidance.',
  },
  {
    question: 'Does the thermal liner need vent holes too?',
    answer:
      "In most builds, venting is handled by the wall vent gaps, not separate holes cut through the liner. The liner's job is thermal protection. Keep the annular space and vent path unobstructed, align vented courses with cavity airflow, and always follow burner or ring manufacturer instructions for any dedicated vent or drain requirements.",
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
