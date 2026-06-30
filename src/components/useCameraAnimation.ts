import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraPreset } from './Stage3DEffects';
import { easeInOutCubic } from './Stage3DEffects';

interface AnimationState {
  isAnimating: boolean;
  startTime: number;
  startPosition: [number, number, number];
  startTarget: [number, number, number];
  targetPreset: CameraPreset;
}

export function useCameraAnimation(
  orbitRef: React.RefObject<OrbitControlsImpl | null>,
) {
  const animationStateRef = useRef<AnimationState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationDurationMs = 600;

  const cancelAnimation = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const runAnimationFrame = () => {
    if (!animationStateRef.current || !orbitRef.current) {
      animationStateRef.current = null;
      animationFrameRef.current = null;
      return;
    }

    const state = animationStateRef.current;
    const controls = orbitRef.current;
    const elapsed = Date.now() - state.startTime;
    const progress = Math.min(elapsed / animationDurationMs, 1);
    const eased = easeInOutCubic(progress);

    const newPosX =
      state.startPosition[0] +
      (state.targetPreset.position[0] - state.startPosition[0]) * eased;
    const newPosY =
      state.startPosition[1] +
      (state.targetPreset.position[1] - state.startPosition[1]) * eased;
    const newPosZ =
      state.startPosition[2] +
      (state.targetPreset.position[2] - state.startPosition[2]) * eased;

    controls.object.position.set(newPosX, newPosY, newPosZ);

    const newTargetX =
      state.startTarget[0] +
      (state.targetPreset.target[0] - state.startTarget[0]) * eased;
    const newTargetY =
      state.startTarget[1] +
      (state.targetPreset.target[1] - state.startTarget[1]) * eased;
    const newTargetZ =
      state.startTarget[2] +
      (state.targetPreset.target[2] - state.startTarget[2]) * eased;

    controls.target.set(newTargetX, newTargetY, newTargetZ);
    controls.update();

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(runAnimationFrame);
      return;
    }

    animationStateRef.current = null;
    animationFrameRef.current = null;
  };

  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [orbitRef]);

  const animateToPreset = (
    preset: CameraPreset,
  ) => {
    if (!orbitRef.current) {
      return;
    }

    const controls = orbitRef.current;
    const currentPos = controls.object.position;
    const currentTarget = controls.target;

    animationStateRef.current = {
      isAnimating: true,
      startTime: Date.now(),
      startPosition: [currentPos.x, currentPos.y, currentPos.z],
      startTarget: [currentTarget.x, currentTarget.y, currentTarget.z],
      targetPreset: preset,
    };

    cancelAnimation();
    animationFrameRef.current = requestAnimationFrame(runAnimationFrame);
  };

  return { animateToPreset, isAnimating: animationStateRef.current?.isAnimating ?? false };
}
