import type { MasonryInput, MasonryOutput } from '../types';
import { buildSafetyClearanceSvg } from '../utils/constructionPacket';

interface SafetyClearanceDiagramProps {
  input: MasonryInput;
  output: MasonryOutput;
}

export default function SafetyClearanceDiagram({
  input,
  output,
}: SafetyClearanceDiagramProps) {
  const markup = buildSafetyClearanceSvg(input, output);

  return (
    <section className='card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-4 shadow-lg'>
      <h3 className='mb-2 text-base font-semibold'>Safety Clearance Diagram</h3>
      <p className='mb-3 text-sm text-amber-950/80'>
        Dashed boundary represents the required 10 ft clearance radius from
        combustible structures.
      </p>
      <div
        className='overflow-x-auto rounded-lg border border-amber-900/20 bg-white p-2'
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </section>
  );
}
