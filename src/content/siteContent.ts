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
    title: '1. Start with geometry',
    intro:
      'Choose the plan shape, firebox size, wall height, and brick preset before changing any advanced settings.',
    bullets: [
      'Use the inner size as the design driver. The engine resolves the outer wall and centerline dimensions for you.',
      'Keep the default modular brick and 3/8 in mortar joint if you want counts that match common masonry references.',
      'For circular pits, use the no-cut suggestions if you want cleaner wall and cap layouts.',
    ],
  },
  {
    title: '2. Set fuel and liner assumptions',
    intro:
      'Fuel choice changes vent placement and should influence the liner system you specify.',
    bullets: [
      'Wood pits benefit from a refractory liner or steel ring to protect the outer shell from repeated heat cycling.',
      'Propane vents belong low in the wall because LP gas settles.',
      'Natural gas vents belong high because the gas rises and needs upper relief.',
    ],
  },
  {
    title: '3. Validate buildability',
    intro:
      'Use the output cards, warnings, and Construction Mode together rather than sizing by appearance alone.',
    bullets: [
      'Check safety warnings first, especially structure clearance and gas vent guidance.',
      'Review unit count, purchased quantity, mortar volume, and stone volume before pricing materials.',
      'Switch between 3D Stage and Construction Mode to confirm the design still makes sense course by course.',
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
    title: 'Engineering baseline',
    bullets: [
      'Running bond stays locked at a 50% module offset between adjacent courses.',
      'Circular counts use the centerline formula with actual unit dimensions and a configurable mortar joint.',
      'Foundation stone depth is fixed at 8 in and the footprint extends 6 in past the outer wall on each side.',
    ],
  },
  {
    title: 'Research-backed guidance',
    bullets: [
      'Permanent hardscape fire features often use a 6 to 12 in excavation depending on soil and structural loading.',
      'Wood-burning pits should prioritize liner protection, thermal expansion allowance, and durable interior materials.',
      'Gas-fire pit venting commonly targets 18 to 36 sq in total open area depending on the hardware package.',
      'Vertical clearance and exclusion-zone thinking are important even when the current tool only models horizontal setback.',
    ],
  },
  {
    title: 'Current app gaps',
    bullets: [
      'The 3D scene still needs deeper fidelity for every material preset and orientation choice.',
      'Square and rectangular research paths exist, but the engineering output is still strongest for circular work.',
      'The packet is useful today, but it is not yet a full field build manual with curing, thermal, and line-entry instructions.',
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
    question: 'Why move explanations out of the form?',
    answer:
      'The design tool should stay focused on decisions. Background guidance reads better as articles, tips, and FAQs, while uncommon details can live behind help popups next to the specific fields that need them.',
  },
  {
    question: 'Will this alone make the site rank well in search?',
    answer:
      'It improves content quality, metadata, and crawlable page semantics, but stronger SEO usually also needs dedicated routes, shareable URLs, and server-rendered content. This update prepares the structure without forcing a larger framework migration yet.',
  },
];
