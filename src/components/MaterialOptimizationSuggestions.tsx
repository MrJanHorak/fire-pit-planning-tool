import type { MasonryInput, MasonryOutput } from '../types';
import {
  buildMaterialOptimizationSuggestions,
  type OptimizationImpact,
} from '../utils/materialOptimization';

interface MaterialOptimizationSuggestionsProps {
  input: MasonryInput;
  output: MasonryOutput;
}

function impactChipClass(impact: OptimizationImpact) {
  if (impact === 'high') {
    return 'border-indigo-800/25 bg-indigo-100 text-indigo-900';
  }
  if (impact === 'medium') {
    return 'border-sky-800/25 bg-sky-100 text-sky-900';
  }
  return 'border-amber-800/25 bg-amber-100 text-amber-900';
}

export default function MaterialOptimizationSuggestions({
  input,
  output,
}: MaterialOptimizationSuggestionsProps) {
  const suggestions = buildMaterialOptimizationSuggestions(input, output);

  return (
    <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/75'>
          Material / Cost Optimization
        </p>
        <span className='rounded-full border border-amber-900/20 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950'>
          {suggestions.length} recommendation{suggestions.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className='mt-3 space-y-2'>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.key}
            className='rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2'
          >
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm font-semibold text-amber-950'>{suggestion.title}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${impactChipClass(suggestion.impact)}`}
              >
                {suggestion.impact} impact
              </span>
            </div>
            <p className='mt-1 text-xs text-amber-900/80'>{suggestion.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
