// ============================================
// Types and Interfaces - Mar de Palabras
// ============================================

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Poem data from API
export interface Poem {
  title: string;
  author: string;
  lines: string[];
  excerpt?: string;
}

// Word data for 3D rendering
export interface WordData {
  sprites: THREE.Sprite[];
  baseX: number;
  baseY: number;
  baseZ: number;
  word: string;
  depth: number;
}

// Configuration
export interface Config {
  speed: number;
  waveAmplitude: number;
  density: number;
  fontSize: number;
  // Letter appearance
  letterSize: number;
  letterBloom: number;
  letterOpacity: number;
  letterHue: number;
  letterSaturation: number;
  letterContrast: number;
}

// Ripple physics
export interface Ripple {
  x: number;
  z: number;
  time: number;
  strength: number;
}

// Mouse state
export interface MouseState {
  x: number;
  y: number;
  pressed: boolean;
  worldX: number;
  worldZ: number;
}

// Scene references (exported from core)
export interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
}

// Noise function type
export type NoiseFn = (x: number, z: number, time: number, amp: number) => number;

// Default config
export const defaultConfig: Config = {
  speed: 0.04,
  waveAmplitude: 60,
  density: 1000,
  fontSize: 14,
  letterSize: 14,
  letterBloom: 0.5,
  letterOpacity: 0.7,
  letterHue: 0.55,
  letterSaturation: 0.6,
  letterContrast: 0.6
};