import { describe, expect, it } from 'vitest'
import { MasonryEngine } from '../../engine/MasonryEngine'
import type { MasonryInput } from '../../types'
import { buildConstructionPacketHtml, buildCoursePlanSvg, buildSafetyClearanceSvg } from '../constructionPacket'

const input: MasonryInput = {
  innerDiameterIn: 36,
  wallHeightIn: 18,
  proximityToStructuresFt: 8,
  fuelType: 'propane',
  mortarJointIn: 0.375,
  orientation: 'stretcher',
  bondPattern: 'running-bond',
  ventCount: 4,
  capstoneOverhangIn: 2,
}

describe('construction packet export', () => {
  it('builds SVG with course labels', () => {
    const output = new MasonryEngine().calculateDesign(input)
    const svg = buildCoursePlanSvg(output)

    expect(svg).toContain('<svg')
    expect(svg).toContain('C1')
  })

  it('builds packet HTML with quantities and safety section', () => {
    const output = new MasonryEngine().calculateDesign(input)
    const html = buildConstructionPacketHtml(input, output)

    expect(html).toContain('Construction Packet')
    expect(html).toContain('Purchased Units')
    expect(html).toContain('Safety Check')
    expect(html).toContain('Minimum horizontal clearance is 10 ft')
    expect(html).toContain('print-break-before')
    expect(html).toContain('10 ft Clearance Ring Diagram')
    expect(html).toContain('Status = FAIL')
    expect(html).toContain('Capstone Overhang')
    expect(html).toContain('Cap Units')
  })

  it('builds clearance diagram with pass status when distance meets code', () => {
    const output = new MasonryEngine().calculateDesign({ ...input, proximityToStructuresFt: 12 })
    const svg = buildSafetyClearanceSvg({ ...input, proximityToStructuresFt: 12 }, output)

    expect(svg).toContain('10 ft Clearance Ring Diagram')
    expect(svg).toContain('Status = PASS')
  })
})
