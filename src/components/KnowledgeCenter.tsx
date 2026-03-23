import {
  designBestPractices,
  faqItems,
  quickStartSteps,
  researchHighlights,
  safetyTips,
  type ContentSection,
} from '../content/siteContent';

export type LibraryView = 'guide' | 'tips' | 'research';

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
    view === 'guide'
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
            title:
              'Field notes for planning, locating, and building a fire pit',
            intro:
              'Use these notes when you are comparing layouts, checking site conditions, or thinking through the build before materials are ordered.',
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
      </article>

      <div className='grid gap-4 lg:grid-cols-2'>
        {content.sections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </div>

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
    </section>
  );
}
