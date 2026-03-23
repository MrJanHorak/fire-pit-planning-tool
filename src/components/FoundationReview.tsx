import type { ReactNode } from 'react';
import type { FoundationRisk } from '../utils/foundationAdvisory';
import HelpTip from './HelpTip';

function getFoundationRiskBadgeClasses(risk: FoundationRisk) {
  if (risk === 'high') {
    return 'border-red-800/25 bg-red-100 text-red-900';
  }
  if (risk === 'moderate') {
    return 'border-amber-900/20 bg-amber-100 text-amber-950';
  }
  return 'border-emerald-800/25 bg-emerald-100 text-emerald-900';
}

function getFoundationRiskDotClasses(risk: FoundationRisk) {
  if (risk === 'high') {
    return 'bg-red-700';
  }
  if (risk === 'moderate') {
    return 'bg-amber-700';
  }
  return 'bg-emerald-700';
}

interface FoundationRiskBadgeProps {
  risk: FoundationRisk;
  children?: ReactNode;
}

export function FoundationRiskBadge({
  risk,
  children,
}: FoundationRiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getFoundationRiskBadgeClasses(
        risk,
      )}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${getFoundationRiskDotClasses(risk)}`}
      />
      {children ?? `${risk} review`}
    </span>
  );
}

export function FoundationRiskLegend() {
  return (
    <div className='flex flex-wrap items-center gap-2 text-xs text-amber-950/75'>
      <span className='font-medium'>Review scale</span>
      <FoundationRiskBadge risk='low'>Low</FoundationRiskBadge>
      <FoundationRiskBadge risk='moderate'>Moderate</FoundationRiskBadge>
      <FoundationRiskBadge risk='high'>High</FoundationRiskBadge>
      <HelpTip label='Why this foundation review level was assigned'>
        The review level combines footprint size with site context such as soil,
        drainage, and freeze-thaw exposure. It does not override the locked base
        quantity calculation.
      </HelpTip>
    </div>
  );
}
