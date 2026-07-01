import { useMemo, useState } from 'react';
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
import { FoundationRiskLegend } from './FoundationReview';

export type LibraryView = 'guide' | 'tips' | 'research' | 'privacy' | 'terms';

interface KnowledgeCenterProps {
  view: LibraryView;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function SectionCard({
  section,
  sectionId,
}: {
  section: ContentSection;
  sectionId: string;
}) {
  return (
    <details
      id={sectionId}
      className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-5 shadow-lg'
    >
      <summary className='cursor-pointer list-none'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='text-lg font-semibold text-amber-950'>{section.title}</h3>
          <span className='rounded-full border border-amber-900/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900'>
            {section.bullets.length} points
          </span>
        </div>
      </summary>
      {section.intro && (
        <p className='mt-2 text-sm leading-6 text-amber-950/80'>{section.intro}</p>
      )}
      <ul className='mt-3 space-y-2 text-sm leading-6 text-amber-950/85'>
        {section.bullets.map((bullet) => (
          <li key={bullet} className='rounded-xl bg-white/70 px-3 py-2'>
            {bullet}
          </li>
        ))}
      </ul>
    </details>
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
                title:
                  'Practical fire pit design guidance and field-tested checks',
                intro:
                  'Use these notes as design guardrails before you finalize materials or start layout on site.',
                sections: [...designBestPractices, ...safetyTips],
              }
            : {
                eyebrow: 'Field Notes',
                title:
                  'Research-backed field notes for smarter fire pit decisions',
                intro:
                  "Use this like a builder's brief: each section explains the engineering logic in plain language so your design choices hold up in the field.",
                sections: researchHighlights,
              };
  const [faqQuery, setFaqQuery] = useState('');
  const sectionAnchors = useMemo(
    () =>
      content.sections.map((section) => ({
        title: section.title,
        id: `section-${toSlug(section.title)}`,
      })),
    [content.sections],
  );
  const filteredFaq = useMemo(() => {
    const query = faqQuery.trim().toLowerCase();
    if (!query) {
      return faqItems;
    }
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query),
    );
  }, [faqQuery]);

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

      <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-4 shadow-lg'>
        <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/70'>
          Quick Topic Index
        </p>
        <div className='mt-2 flex flex-wrap gap-2'>
          {sectionAnchors.map((anchor) => (
            <a
              key={anchor.id}
              href={`#${anchor.id}`}
              className='rounded-full border border-amber-900/20 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-50'
            >
              {anchor.title}
            </a>
          ))}
        </div>
      </section>

      <div className='grid gap-4 lg:grid-cols-2'>
        {content.sections.map((section) => (
          <SectionCard
            key={section.title}
            section={section}
            sectionId={`section-${toSlug(section.title)}`}
          />
        ))}
      </div>

      {view === 'guide' && (
        <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-5 shadow-lg'>
          <h3 className='text-lg font-semibold text-amber-950'>
            Foundation Review Scale
          </h3>
          <p className='mt-2 text-sm leading-6 text-amber-950/80'>
            Use this legend when reading foundation advisory output. It is a
            planning guide, not a substitute for local engineering or code
            review.
          </p>
          <div className='mt-3'>
            <FoundationRiskLegend />
          </div>
        </section>
      )}

      {(view === 'guide' || view === 'tips' || view === 'research') && (
        <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-5 shadow-lg'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h3 className='text-lg font-semibold text-amber-950'>
              Common questions
            </h3>
            <input
              type='search'
              value={faqQuery}
              onChange={(event) => setFaqQuery(event.target.value)}
              placeholder='Filter FAQ...'
              aria-label='Filter FAQ'
              className='w-full rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm text-amber-950 sm:w-64'
            />
          </div>
          <p className='mt-2 text-xs text-amber-900/70'>
            Showing {filteredFaq.length} of {faqItems.length} questions.
          </p>
          <div className='mt-3 space-y-3'>
            {filteredFaq.map((item) => (
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
            {filteredFaq.length === 0 && (
              <p className='rounded-xl border border-amber-900/15 bg-white/80 p-4 text-sm text-amber-950/80'>
                No FAQ entries match that filter yet.
              </p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
