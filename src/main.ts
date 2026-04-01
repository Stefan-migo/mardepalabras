// ============================================
// Mar de Palabras - Main Entry Point
// ============================================

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import type { Config, Poem } from './types';
import { defaultConfig } from './types';
import { SimplexNoise } from './utils/Noise';
import { TextRenderer } from './utils/TextRenderer';
import { WordField } from './systems/WordField';
import { FoamSystem } from './systems/FoamSystem';
import { VerseAnimationSystem } from './systems/VerseAnimation';
import { setupControls } from './ui/Controls';

// ============================================
// Global State
// ============================================
console.log('=== MAR DE PALABRAS - Refactored ===');

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let bloomPass: UnrealBloomPass;

// Systems
let noise: SimplexNoise;
let textRenderer: TextRenderer;
let wordField: WordField;
let foamSystem: FoamSystem;
let verseAnimation: VerseAnimationSystem;

// State
let config: Config = { ...defaultConfig };
let poems: Poem[] = [];
let tiempo = 0;

// Simplified mouse state for performance
const mouse = { pressed: false, worldX: 0, worldZ: 0 };
const ripples: { x: number; z: number; time: number; strength: number }[] = [];

// ============================================
// Poetry - Curated Latin American Anti-Colonial, Anarchist, Feminist
// ============================================
import { curatedPoems } from './data/curatedPoetry';

async function fetchPoetry(): Promise<Poem[]> {
  // Use curated poetry library instead of external API
  // This ensures thematic consistency and avoids network issues
  console.log('Using curated poetry library');
  
  // Shuffle and return curated poems
  const shuffled = [...curatedPoems].sort(() => Math.random() - 0.5);
  return shuffled;
}

// ============================================
// Initialization
// ============================================
function init(loadedPoems: Poem[]) {
  console.log('Init with', loadedPoems.length, 'poems');
  
  // Hide loading
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  
  poems = loadedPoems;
  noise = new SimplexNoise();
  textRenderer = new TextRenderer();
  
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010108);
  scene.fog = new THREE.FogExp2(0x010108, 0.00035);
  
  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 250, 700);
  camera.lookAt(0, 0, -300);
  
  // Renderer - optimized
  renderer = new THREE.WebGLRenderer({ 
    antialias: false, 
    powerPreference: 'high-performance' 
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById('canvas-container')!.appendChild(renderer.domElement);
  
  // Post-processing - optimized bloom
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.3, 0.85
  );
  composer.addPass(bloomPass);
  
  // Lights
  scene.add(new THREE.AmbientLight(0x334466, 0.3));
  const light1 = new THREE.PointLight(0x00ffff, 0.6, 1500);
  light1.position.set(300, 300, 300);
  scene.add(light1);
  const light2 = new THREE.PointLight(0xff00ff, 0.5, 1500);
  light2.position.set(-300, 150, -300);
  scene.add(light2);
  
  // Initialize systems
  wordField = new WordField(scene, textRenderer, config);
  wordField.create(poems, config.density);
  
  foamSystem = new FoamSystem(scene, 5000);
  foamSystem.updateDensity(wordField.getWordCount());
  
  verseAnimation = new VerseAnimationSystem({ scene, camera, renderer, composer, bloomPass });
  
  // Set default verse position from config
  verseAnimation.setPosition(config.verseX, config.verseY, config.verseZ, config.verseScale);
  
  // Setup UI
  setupControls(config, wordField, foamSystem, verseAnimation, bloomPass, noise, poems, showRandomVerse);
  
  // Start animation
  animate();
}

// ============================================
// Animation Loop - Optimized for INP
// ============================================
function animate() {
  requestAnimationFrame(animate);
  tiempo += config.speed;
  
  // Update ripples (limit to 3)
  const maxRipples = Math.min(ripples.length, 3);
  for (let i = 0; i < maxRipples; i++) {
    ripples[i].time += 0.05;
    if (ripples[i].time > 3) {
      ripples[i].time = -1;
    }
  }
  // Clean up marked ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (ripples[i].time === -1) ripples.splice(i, 1);
  }
  
  // Update word field (every 2nd frame for performance)
  if (Math.floor(tiempo * 60) % 2 === 0) {
    wordField.update(tiempo, noise.oceanWaves.bind(noise), config.waveAmplitude, mouse);
  }
  
  // Update foam (every 3rd frame to save CPU)
  if (Math.floor(tiempo * 60) % 3 === 0) {
    foamSystem.update(tiempo, (x, z) => noise.oceanWaves(x, z, tiempo, config.waveAmplitude));
  }
  
  // Update verse animation
  verseAnimation.update(camera);
  
  // Camera movement - simplified
  const camTime = tiempo * 0.2;
  camera.position.set(
    Math.sin(camTime) * 150,
    250 + Math.cos(camTime * 0.5) * 30,
    700 + Math.cos(camTime) * 80
  );
  camera.lookAt(0, 0, -250);
  
  // Render
  composer.render();
}

// ============================================
// Events - Optimized for INP (Interaction to Next Paint)
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Use passive listener for mousemove (non-blocking)
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  mouse.worldX = x * 500;
  mouse.worldZ = y * 500 - 300;
}, { passive: true });

// Defer heavy operations to avoid blocking UI
window.addEventListener('mousedown', () => {
  mouse.pressed = true;
  
  // Add ripple (lightweight)
  ripples.push({ x: mouse.worldX, z: mouse.worldZ, time: 0, strength: 80 });
  
  // Defer DOM and animation operations
  if (poems.length > 0 && Math.random() > 0.6) {
    requestAnimationFrame(() => showRandomVerse());
  }
});

window.addEventListener('mouseup', () => {
  mouse.pressed = false;
});

// Cache DOM elements to avoid repeated lookups
let verseDisplayEl: HTMLElement | null = null;
let authorDisplayEl: HTMLElement | null = null;

function getVerseElements() {
  if (!verseDisplayEl) verseDisplayEl = document.getElementById('verse-display');
  if (!authorDisplayEl) authorDisplayEl = document.getElementById('author-display');
  return { verseEl: verseDisplayEl, authorEl: authorDisplayEl };
}

function showRandomVerse() {
  const { verseEl, authorEl } = getVerseElements();
  const poem = poems[Math.floor(Math.random() * poems.length)];
  
  if (verseEl && authorEl) {
    const verseText = poem.excerpt || poem.lines[0];
    verseEl.textContent = verseText;
    authorEl.textContent = `— ${poem.author}, "${poem.title}"`;
    verseEl.classList.add('visible');
    
    // Trigger 3D animation - will be processed in animation loop
    verseAnimation.animate(verseText, 4000);
    
    setTimeout(() => verseEl.classList.remove('visible'), 5000);
  }
}

// ============================================
// Start
// ============================================
async function start() {
  console.log('Loading poetry...');
  const loadedPoems = await fetchPoetry();
  console.log('Loaded', loadedPoems.length, 'poems');
  init(loadedPoems);
}

document.fonts.ready.then(start).catch(() => setTimeout(start, 100));