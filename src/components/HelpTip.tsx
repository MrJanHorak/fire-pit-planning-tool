import { useEffect, useRef, type ReactNode } from 'react';

interface HelpTipProps {
  label: string;
  children: ReactNode;
}

export default function HelpTip({ label, children }: HelpTipProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const detailsElement = detailsRef.current;
      if (!detailsElement?.open) {
        return;
      }

      const targetNode = event.target;
      if (targetNode instanceof Node && !detailsElement.contains(targetNode)) {
        detailsElement.open = false;
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <details ref={detailsRef} className='group relative inline-flex'>
      <summary
        className='flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-amber-900/25 bg-white text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700'
        aria-label={label}
      >
        ?
      </summary>
      <div className='absolute left-0 top-7 z-50 w-64 rounded-xl border border-amber-900/20 bg-white p-3 text-xs font-normal leading-5 text-amber-950 shadow-xl'>
        {children}
      </div>
    </details>
  );
}
