export interface ContentSection {
  title: string;
  intro?: string;
  bullets: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const quickStartSteps: ContentSection[] = [
  {
    title: '1. Set the firebox size',
    intro:
      'Begin with the opening you want to gather around, then choose the wall height and brick size that fit that scale.',
    bullets: [
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
    ],
  },
  {
    title: '3. Review buildability',
    intro:
      'Before you price materials or lay anything out on site, review the count, cut, and safety information together.',
    bullets: [
      'Read the safety warnings first, especially structure clearance and gas vent guidance.',
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
];

export const safetyTips: ContentSection[] = [
  {
    title: 'Safety checkpoints',
    bullets: [
      'Maintain at least 10 ft horizontal clearance to combustible structures as a baseline, and check local code for stricter setbacks.',
      'Consider overhead branches, pergolas, soffits, and nearby fencing, not just plan-view distance.',
      'Do not treat standard facing brick as equivalent to refractory material for the hottest interior zone of a wood-burning pit.',
      'Gas features should be vented according to fuel density and burner hardware requirements, not generic decorative openings.',
    ],
  },
];

export const researchHighlights: ContentSection[] = [
  {
    title: 'Core layout rules',
    bullets: [
      'Running bond uses a 50% module offset between adjacent courses so the wall stays interlocked.',
      'Circular counts follow the centerline method with actual unit dimensions and a configurable mortar joint.',
      'The stone base is set at 8 in deep and extends 6 in beyond the wall on each side.',
    ],
  },
  {
    title: 'Site and material guidance',
    bullets: [
      'Permanent hardscape fire features often need 6 to 12 in of excavation depending on soil and structural loading.',
      'Wood-burning pits benefit from liner protection, expansion allowance, and durable interior materials in the hottest zone.',
      'Gas-fire pit venting commonly targets 18 to 36 sq in of total open area depending on the burner hardware.',
      'Look at overhead branches, structures, and circulation zones as well as the horizontal setback on the ground plan.',
    ],
  },
  {
    title: 'Build details worth planning early',
    bullets: [
      'Square and rectangular fire pits need careful corner bonding so adjacent courses interlock cleanly.',
      'Tight-radius work may call for radial units, half-bats, or tapered cuts to avoid oversized outer joints.',
      'Before starting construction, plan curing time, liner spacing, gas-line routing, and cap installation details.',
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
      'The no-cut suggestions show inner diameters that let the wall, the cap, or both resolve without taper cuts. They are useful when you want cleaner coursing and faster layout on site.',
  },
  {
    question: 'When should I add a thermal liner?',
    answer:
      'Wood-burning pits should generally use a refractory liner or steel ring to shield the outer shell from direct heat. Gas pits may also benefit from a protected inner zone depending on burner hardware and manufacturer guidance.',
  },
];
