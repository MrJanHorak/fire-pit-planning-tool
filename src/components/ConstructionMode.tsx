import type { MasonryOutput } from '../types'
import type { MasonryInput } from '../types'
import { buildConstructionPacketHtml } from '../utils/constructionPacket'

interface ConstructionModeProps {
  input: MasonryInput
  output: MasonryOutput
}

export default function ConstructionMode({ input, output }: ConstructionModeProps) {
  const downloadPacket = () => {
    const html = buildConstructionPacketHtml(input, output)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'firepit-construction-packet.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const rowHeight = 26
  const svgHeight = output.courses.length * rowHeight + 28

  return (
    <section className="card-rise rounded-2xl border border-amber-900/20 bg-amber-50/80 p-4 shadow-lg">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Construction Mode (SVG)</h3>
        <button className="rounded-full bg-amber-900 px-4 py-2 text-xs font-semibold text-amber-50" onClick={downloadPacket}>
          Download Packet
        </button>
      </div>
      <p className="mb-3 text-sm text-amber-950/80">
        Each row is one course. Alternating start offsets implement running bond. Vent target courses are marked in red.
      </p>

      <svg viewBox={`0 0 940 ${svgHeight}`} className="w-full rounded-lg border border-amber-900/20 bg-white">
        {output.courses.map((course, idx) => {
          const y = 18 + idx * rowHeight
          const modulePx = 48
          const offsetPx = course.offsetIn > 0 ? modulePx / 2 : 0
          const ventCourse = output.ventSpec.targetCourseIndexes.includes(course.courseIndex)

          return (
            <g key={course.courseIndex}>
              <text x={8} y={y + 13} fontSize={11} fill="#3c2a11">
                C{course.courseIndex + 1}
              </text>
              {Array.from({ length: course.unitCount }, (_, brickIdx) => (
                <rect
                  key={`${course.courseIndex}-${brickIdx}`}
                  x={52 + offsetPx + brickIdx * modulePx}
                  y={y}
                  width={modulePx - 4}
                  height={16}
                  rx={2}
                  fill={ventCourse && brickIdx % 5 === 0 ? '#c13a1f' : '#b66a34'}
                  opacity={ventCourse && brickIdx % 5 === 0 ? 0.85 : 0.72}
                />
              ))}
            </g>
          )
        })}
      </svg>
    </section>
  )
}
