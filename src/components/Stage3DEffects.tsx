import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import type { Stage3DGeometry } from './Stage3D';

interface Stage3DEffectsProps {
  enabled: boolean;
  geometry?: Stage3DGeometry;
}

export function Stage3DEffects({ enabled }: Stage3DEffectsProps) {
  if (!enabled) {
    return null;
  }

  return (
    <EffectComposer multisampling={4} enableNormalPass>
      {/* Bloom: Makes flames glow dramatically */}
      <Bloom
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        intensity={1.8}
        blendFunction={BlendFunction.SCREEN}
      />
      {/* SSAO: Subtle ambient occlusion for depth in brick joints */}
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={11}
        radius={0.25}
        intensity={2.0}
        bias={0.5}
      />
    </EffectComposer>
  );
}

export interface CameraPreset {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export function getCameraPresets(geometry: Stage3DGeometry): Record<string, CameraPreset> {
  const wallRadius = geometry.wallRadiusFt;
  const wallHeight = Math.max(0.8, geometry.capRiseFt);
  const viewDistance = Math.max(wallRadius * 3.5, 6);

  return {
    'plan-view': {
      label: 'Plan View',
      position: [0, wallRadius * 5, 0.001],
      target: [0, 0, 0],
      fov: 48,
    },
    'inside-view': {
      label: 'Inside View',
      position: [wallRadius * 0.4, wallHeight * 0.45, 0],
      target: [0, wallHeight * 0.8, 0],
      fov: 55,
    },
    'front-view': {
      label: 'Front View',
      position: [0, wallHeight * 0.6, viewDistance],
      target: [0, wallHeight * 0.4, 0],
      fov: 50,
    },
    'side-view': {
      label: 'Side View',
      position: [viewDistance, wallHeight * 0.5, 0],
      target: [0, wallHeight * 0.3, 0],
      fov: 50,
    },
    'eye-level': {
      label: 'Eye Level',
      position: [0, wallHeight * 2.25, viewDistance * 0.9],
      target: [0, wallHeight * 0.65, 0],
      fov: 48,
    },
  };
}

export interface CameraAnimationOptions {
  duration?: number; // milliseconds
  easing?: (t: number) => number;
}

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

export interface AdvancedLightingConfig {
  ambientIntensity: number;
  hemisphereIntensity: number;
  directionalIntensity: number;
  directionalPosition: [number, number, number];
  fillLightIntensity?: number;
  castShadows: boolean;
  shadowMapSize: number;
}

export const PHOTOREAL_LIGHTING: AdvancedLightingConfig = {
  ambientIntensity: 0.4,
  hemisphereIntensity: 0.32,
  directionalIntensity: 1.6,
  directionalPosition: [4, 6.5, 3.5],
  fillLightIntensity: 0.4,
  castShadows: true,
  shadowMapSize: 2048,
};

export const STYLIZED_LIGHTING: AdvancedLightingConfig = {
  ambientIntensity: 0.65,
  hemisphereIntensity: 0.48,
  directionalIntensity: 1.2,
  directionalPosition: [3.5, 5.5, 3],
  fillLightIntensity: 0.3,
  castShadows: false,
  shadowMapSize: 1024,
};

export function getActiveHemisphereLightArgs(
  config: AdvancedLightingConfig,
): [string, string, number] {
  return ['#fff4dd', '#8e7a5b', config.hemisphereIntensity];
}
