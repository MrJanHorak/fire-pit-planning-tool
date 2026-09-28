import type { MasonryOutput } from '../types';

export interface BrickSelectionInfo {
  id: string;
  courseIndex: number;
  brickIndex: number;
  kind: 'wall-brick' | 'vent-opening';
  isSpacer: boolean;
  requiresTaperCut: boolean;
  isVent: boolean;
}

export function buildBrickSelectionInfo(
  output: MasonryOutput,
  courseIndex: number,
  brickIndex: number,
): BrickSelectionInfo | null {
  const course = output.courses.find((candidate) => candidate.courseIndex === courseIndex);
  if (!course || brickIndex < 0 || brickIndex >= course.unitCount) return null;

  const isSpacer =
    course.specialCourse === 'shim-spacer' &&
    !!course.spacerIndexes?.includes(brickIndex);
  const isVent =
    output.ventSpec.targetCourseIndexes.includes(courseIndex) &&
    output.ventSpec.ventBrickIndexes.includes(brickIndex);

  return {
    id: `${courseIndex}-${brickIndex}`,
    courseIndex,
    brickIndex,
    kind: isVent ? 'vent-opening' : 'wall-brick',
    isSpacer,
    requiresTaperCut:
      output.planShape === 'circular' && output.cutPlan.requiresCutting && !isSpacer && !isVent,
    isVent,
  };
}
