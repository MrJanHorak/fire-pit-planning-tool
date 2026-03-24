import {
  designBestPractices,
  faqItems,
  LEGAL_LAST_UPDATED,
  privacyPolicySections,
  quickStartSteps,
  researchHighlights,
  safetyTips,
  termsOfUseSections,
  type ContentSection,
} from '../content/siteContent';

export type LibraryView =
  | 'guide'
  | 'tips'
  | 'research'
  | 'privacy'
  | 'terms';

interface KnowledgeCenterProps {
  view: LibraryView;
}

function SectionCard({ section }: { section: ContentSection }) {
  return (
    <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-5 shadow-lg'>
      <h3 className='text-lg font-semibold text-amber-950'>{section.title}</h3>
      {section.intro && (
        <p className='mt-2 text-sm leading-6 text-amber-950/80'>
          {section.intro}
        </p>
      )}
      <ul className='mt-3 space-y-2 text-sm leading-6 text-amber-950/85'>
        {section.bullets.map((bullet) => (
          <li key={bullet} className='rounded-xl bg-white/70 px-3 py-2'>
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function KnowledgeCenter({ view }: KnowledgeCenterProps) {
  const content =
    view === 'privacy'
      ? {
          eyebrow: 'Privacy Policy',
          title: 'Privacy and data handling for this firepit designer',
          intro:
            'This page explains what is stored, when analytics can run, and how you can control or remove your data.',
          sections: privacyPolicySections,
        }
      : view === 'terms'
        ? {
            eyebrow: 'Terms Of Use',
            title: 'Terms and usage responsibilities',
            intro:
              'Use these terms to understand scope, safety responsibilities, and operational limitations of this app.',
            sections: termsOfUseSections,
          }
        : view === 'guide'
      ? {
          eyebrow: 'Instructions',
          title: 'A simple way to size and review a masonry fire pit',
          intro:
            'Start with the opening and wall size, then work through fuel, liner, and cap details before checking quantities and clearances.',
          sections: quickStartSteps,
        }
      : view === 'tips'
        ? {
            eyebrow: 'Design Tips',
            title: 'Practical fire pit design guidance and field-tested checks',
            intro:
              'Use these notes as design guardrails before you finalize materials or start layout on site.',
            sections: [...designBestPractices, ...safetyTips],
          }
        : {
            eyebrow: 'Field Notes',
            title: 'Research-backed field notes for smarter fire pit decisions',
            intro:
              "Use this like a builder's brief: each section explains the engineering logic in plain language so your design choices hold up in the field.",
            sections: researchHighlights,
          };

  return (
    <section className='space-y-5'>
      <article className='card-rise rounded-2xl border border-amber-900/20 bg-amber-100/75 p-6 shadow-lg'>
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/70'>
          {content.eyebrow}
        </p>
        <h2 className='mt-2 text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl'>
          {content.title}
        </h2>
        <p className='mt-3 max-w-3xl text-sm leading-6 text-amber-950/80 sm:text-base'>
          {content.intro}
        </p>
        {(view === 'privacy' || view === 'terms') && (
          <p className='mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70'>
            Last updated: {LEGAL_LAST_UPDATED}
          </p>
        )}
      </article>

      <div className='grid gap-4 lg:grid-cols-2'>
        {content.sections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </div>

      {(view === 'guide' || view === 'tips' || view === 'research') && (
        <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-5 shadow-lg'>
          <h3 className='text-lg font-semibold text-amber-950'>
            Common questions
          </h3>
          <div className='mt-3 space-y-3'>
            {faqItems.map((item) => (
              <details
                key={item.question}
                className='rounded-xl border border-amber-900/15 bg-white/80 p-4'
              >
                <summary className='cursor-pointer list-none font-semibold text-amber-950'>
                  {item.question}
                </summary>
                <p className='mt-2 text-sm leading-6 text-amber-950/80'>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
