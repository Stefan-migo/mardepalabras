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

// Device detection for adaptive performance
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isLowEndDevice = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

// Adaptive config based on device
function getAdaptiveConfig() {
  if (isMobile) {
    console.log('📱 Mobile detected - using optimized settings');
    return {
      density: 1100,           // More words for sea
      foamCount: 800,         // Less foam dots
      pixelRatio: 1,
      bloomResolution: 0.5,
      skipFrames: false
    };
  } else if (isLowEndDevice) {
    console.log('💻 Low-end device detected');
    return {
      density: 1100,
      foamCount: 1000,
      pixelRatio: 1,
      bloomResolution: 0.75,
      skipFrames: false
    };
  } else {
    console.log('🖥️ High-end device detected');
    return {
      density: 1400,          // More words
      foamCount: 1200,       // Less foam dots
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      bloomResolution: 1,
      skipFrames: false
    };
  }
}

const adaptiveConfig = getAdaptiveConfig();

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

// Performance mode state
let performanceMode = false;
let cameraZoom = 1.6; // 1.0 = normal, >1 = zoomed out (farther camera)
let cameraY = 250; // Camera height (Y position)

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
  
  // Show mobile hint if on mobile
  if (isMobile) {
    const tapHint = document.getElementById('tap-hint');
    if (tapHint) tapHint.style.display = 'block';
    
    // Update hint text
    const hint = document.getElementById('hint');
    if (hint) hint.textContent = 'Toca para perturbación';
  }
  
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
  renderer.setPixelRatio(adaptiveConfig.pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById('canvas-container')!.appendChild(renderer.domElement);
  
  // Post-processing - optimized bloom (lower resolution on mobile)
  const bloomW = Math.floor(window.innerWidth * adaptiveConfig.bloomResolution);
  const bloomH = Math.floor(window.innerHeight * adaptiveConfig.bloomResolution);
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(bloomW, bloomH),
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
  wordField.create(poems, adaptiveConfig.density);
  
  foamSystem = new FoamSystem(scene, adaptiveConfig.foamCount);
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
  
  // Update word field - every frame for smooth animation, with ripple effects
  wordField.update(tiempo, noise.oceanWaves.bind(noise), config.waveAmplitude, mouse, ripples);
  
  // Update foam - every frame for smooth animation, with ripple effects
  foamSystem.update(tiempo, (x, z) => noise.oceanWaves(x, z, tiempo, config.waveAmplitude), ripples);
  
  // Update verse animation
  verseAnimation.update(camera);
  
  // Camera movement - simplified, with zoom support
  const camTime = tiempo * 0.2;
  const baseZ = 700 * cameraZoom;
  const baseX = 150 * cameraZoom;
  camera.position.set(
    Math.sin(camTime) * baseX,
    cameraY + Math.cos(camTime * 0.5) * 30,
    baseZ + Math.cos(camTime) * 80 * cameraZoom
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
  
  const bloomW = Math.floor(window.innerWidth * adaptiveConfig.bloomResolution);
  const bloomH = Math.floor(window.innerHeight * adaptiveConfig.bloomResolution);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(bloomW, bloomH);
});

// Use passive listener for mousemove (non-blocking)
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  mouse.worldX = x * 500;
  mouse.worldZ = y * 500 - 300;
}, { passive: true });

// Touch events for mobile
window.addEventListener('touchstart', (e) => {
  // Don't trigger ripple if touching UI elements
  const target = e.target as HTMLElement;
  if (target.closest('#mobile-menu-btn') || target.closest('#mobile-controls') || target.closest('#performance-mode-btn')) {
    return;
  }
  
  e.preventDefault();
  
  // Single touch = ripple effect
  if (e.touches.length === 1) {
    mouse.pressed = true;
    const touch = e.touches[0];
    const x = (touch.clientX / window.innerWidth - 0.5) * 2;
    const y = (touch.clientY / window.innerHeight - 0.5) * 2;
    mouse.worldX = x * 500;
    mouse.worldZ = y * 500 - 300;
    
    // Add ripple - gentler on mobile
    ripples.push({ x: mouse.worldX, z: mouse.worldZ, time: 0, strength: 40 });
    
    // Show verse on tap (more likely on mobile)
    if (poems.length > 0 && Math.random() > 0.4) {
      requestAnimationFrame(() => showRandomVerse());
    }
  }
  
  // Two-finger touch: disable ripples and enable camera control
  if (e.touches.length >= 2) {
    mouse.pressed = false;
  }
}, { passive: false });

window.addEventListener('touchend', (e) => {
  // Don't reset mouse if touching UI elements
  const target = e.target as HTMLElement;
  if (target.closest('#mobile-menu-btn') || target.closest('#mobile-controls')) {
    return;
  }
  mouse.pressed = false;
});

window.addEventListener('touchmove', (e) => {
  // Don't update mouse position if touching UI elements
  const target = e.target as HTMLElement;
  if (target.closest('#mobile-menu-btn') || target.closest('#mobile-controls')) {
    return;
  }
  
  // Two-finger gesture: move camera freely (no pinch zoom)
  if (e.touches.length >= 2) {
    e.preventDefault();
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    
    // Map center to camera position (drag to move)
    const x = (centerX / window.innerWidth - 0.5) * 2;
    const y = (centerY / window.innerHeight - 0.5) * 2;
    
    // Update camera position manually (disable auto movement)
    camera.position.x = x * 400;
    camera.position.z = 500 - y * 300;
    camera.lookAt(0, 0, -250);
    
    return;
  }
  
  // Single finger - update mouse position for continuous ripple effect
  e.preventDefault();
  const touch = e.touches[0];
  const x = (touch.clientX / window.innerWidth - 0.5) * 2;
  const y = (touch.clientY / window.innerHeight - 0.5) * 2;
  mouse.worldX = x * 500;
  mouse.worldZ = y * 500 - 300;
  
  // Add ripples continuously while dragging on mobile - gentle effect
  if (mouse.pressed) {
    ripples.push({ x: mouse.worldX, z: mouse.worldZ, time: 0, strength: 20 });
  }
}, { passive: false });

window.addEventListener('touchend', (e) => {
  // Don't reset mouse if touching UI elements
  const target = e.target as HTMLElement;
  if (target.closest('#mobile-menu-btn') || target.closest('#mobile-controls')) {
    return;
  }
  mouse.pressed = false;
});

window.addEventListener('touchmove', (e) => {
  // Don't update mouse position if touching UI elements
  const target = e.target as HTMLElement;
  if (target.closest('#mobile-menu-btn') || target.closest('#mobile-controls')) {
    return;
  }
  
  // Two-finger gesture: move camera freely
  if (e.touches.length >= 2) {
    e.preventDefault();
    
    // Calculate two-finger center movement
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    
    // Map to camera position (drag to move)
    const x = (centerX / window.innerWidth - 0.5) * 2;
    const y = (centerY / window.innerHeight - 0.5) * 2;
    
    // Update camera position manually (disable auto movement)
    camera.position.x = x * 300;
    camera.position.z = 400 - y * 200;
    camera.lookAt(0, 0, -250);
    return;
  }
  
  e.preventDefault();
  const touch = e.touches[0];
  const x = (touch.clientX / window.innerWidth - 0.5) * 2;
  const y = (touch.clientY / window.innerHeight - 0.5) * 2;
  mouse.worldX = x * 500;
  mouse.worldZ = y * 500 - 300;
}, { passive: false });

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

// ============================================
// Performance Mode & Mobile Controls
// ============================================

// Performance mode toggle
document.getElementById('performance-mode-btn')?.addEventListener('click', () => {
  performanceMode = !performanceMode;
  const btn = document.getElementById('performance-mode-btn');
  if (btn) {
    btn.textContent = performanceMode ? '✓ Performance' : '⚡ Performance';
    btn.style.background = performanceMode ? 'rgba(99, 102, 241, 0.5)' : 'rgba(10, 10, 20, 0.7)';
  }
  
  if (performanceMode) {
    // Apply performance settings
    console.log('Performance mode ON');
    wordField.clear();
    wordField.create(poems, 300); // Reduced density
    foamSystem.recreate(1000); // Reduced foam
    bloomPass.strength = 0.3; // Reduced bloom
  } else {
    // Restore normal settings
    console.log('Performance mode OFF');
    wordField.clear();
    wordField.create(poems, adaptiveConfig.density);
    foamSystem.recreate(adaptiveConfig.foamCount);
    bloomPass.strength = 0.5;
  }
});

// Mobile menu toggle
let mobileMenuOpen = false;

function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const panel = document.getElementById('mobile-controls');
  const btn = document.getElementById('mobile-menu-btn');
  console.log('Mobile menu toggle:', mobileMenuOpen);
  if (panel && btn) {
    if (mobileMenuOpen) {
      panel.style.display = 'block';
      btn.textContent = '✕';
      btn.style.background = 'rgba(99, 102, 241, 0.7)';
    } else {
      panel.style.display = 'none';
      btn.textContent = '☰';
      btn.style.background = 'rgba(10, 10, 20, 0.7)';
    }
  }
}

// Add both click and touchstart listeners for mobile menu
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMobileMenu();
  });
  mobileMenuBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMobileMenu();
  }, { passive: false });
}

// Camera zoom control (mobile)
document.getElementById('camera-zoom-slider')?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  cameraZoom = parseFloat(target.value);
  console.log('Camera zoom:', cameraZoom);
});

// Mobile speed control
document.getElementById('mobile-speed-slider')?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  config.speed = parseFloat(target.value);
  console.log('Speed:', config.speed);
});

// Mobile wave control
document.getElementById('mobile-wave-slider')?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  config.waveAmplitude = parseFloat(target.value);
  console.log('Wave amplitude:', config.waveAmplitude);
});

// Mobile density control
document.getElementById('mobile-density-slider')?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  const newDensity = parseInt(target.value);
  console.log('Density:', newDensity);
  
  // Recreate word field with new density
  wordField.clear();
  wordField.create(poems, newDensity);
  
  // Update foam density accordingly
  foamSystem.updateDensity(newDensity);
});

// Mobile camera Y (height) control
document.getElementById('mobile-camera-y')?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement;
  cameraY = parseFloat(target.value);
  console.log('Camera Y:', cameraY);
});

// Cache DOM elements to avoid repeated lookups
let authorDisplayEl: HTMLElement | null = null;

function getVerseElements() {
  if (!authorDisplayEl) authorDisplayEl = document.getElementById('author-display');
  return { authorEl: authorDisplayEl };
}

// Track shown poems to avoid repetition
let shownPoemIndices = new Set<number>();

function showRandomVerse() {
  // Get available poems (not yet shown)
  const availableIndices: number[] = [];
  for (let i = 0; i < poems.length; i++) {
    if (!shownPoemIndices.has(i)) {
      availableIndices.push(i);
    }
  }
  
  // If all poems have been shown, reset and start over
  if (availableIndices.length === 0) {
    shownPoemIndices.clear();
    for (let i = 0; i < poems.length; i++) {
      availableIndices.push(i);
    }
  }
  
  // Pick random poem from available
  const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  shownPoemIndices.add(randomIndex);
  
  const poem = poems[randomIndex];
  const { authorEl } = getVerseElements();
  
  // Only show author (verse appears in 3D animation)
  if (authorEl) {
    authorEl.textContent = `— ${poem.author}`;
    
    // Get verse text for 3D animation
    const verseText = poem.excerpt || poem.lines[0];
    
    // Trigger 3D animation - will be processed in animation loop
    verseAnimation.animate(verseText);
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