import type { MasonryInput, MasonryOutput } from '../types';
import {
  buildRegionalCodeReview,
  type RegionalCheckStatus,
} from '../utils/regionalCodeReview';

interface RegionalCodeCheckerProps {
  input: MasonryInput;
  output: MasonryOutput;
}

function statusChip(status: RegionalCheckStatus) {
  if (status === 'fail') {
    return 'border-red-800/25 bg-red-100 text-red-900';
  }
  if (status === 'review') {
    return 'border-amber-800/25 bg-amber-100 text-amber-900';
  }
  return 'border-emerald-800/25 bg-emerald-100 text-emerald-900';
}

export default function RegionalCodeChecker({
  input,
  output,
}: RegionalCodeCheckerProps) {
  const report = buildRegionalCodeReview(input, output);

  return (
    <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/75 p-4 shadow-lg'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.15em] text-amber-900/75'>
          Regional Code Checker
        </p>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusChip(report.overallStatus)}`}
        >
          {report.overallStatus === 'fail'
            ? 'Action required'
            : report.overallStatus === 'review'
              ? 'Needs local review'
              : 'Looks good'}
        </span>
      </div>
      <p className='mt-2 text-xs text-amber-900/70'>
        Covers IBC-style setbacks and venting, HOA constraints, and frost-line context.
      </p>
      <div className='mt-3 space-y-2'>
        {report.checks.map((check) => (
          <div
            key={check.key}
            className='rounded-lg border border-amber-900/15 bg-white/70 px-3 py-2'
          >
            <div className='flex items-center justify-between gap-2'>
              <p className='text-sm font-semibold text-amber-950'>{check.title}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusChip(check.status)}`}
              >
                {check.status.toUpperCase()}
              </span>
            </div>
            <p className='mt-1 text-xs text-amber-900/80'>{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
