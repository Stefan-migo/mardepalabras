// ============================================
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ============================================
// Letter Renderer - Enhanced sprites with better visuals
// ============================================
class LetterRenderer {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private glowMaterial: THREE.ShaderMaterial;
  
  constructor() {
    this.glowMaterial = this.createGlowMaterial();
  }
  
  private createGlowMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(1, 1, 1) },
        uOpacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          
          // Soft edge with glow
          float alpha = smoothstep(0.5, 0.2, dist);
          float glow = exp(-dist * 3.0) * 0.5;
          
          // Subtle pulse
          float pulse = 0.9 + 0.1 * sin(uTime * 2.0 + vUv.x * 10.0);
          
          vec3 finalColor = uColor * (1.0 + glow);
          float finalAlpha = alpha * uOpacity * pulse;
          
          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }
  
  createLetterTexture(char: string, size: number = 64): THREE.Texture {
    const cacheKey = `${char}_${size}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // High-quality letter rendering
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Use a nicer font with shadow for depth
    ctx.font = `bold ${size * 0.6}px "Crimson Pro", Georgia, serif`;
    
    // Add subtle glow/shadow effect in the texture itself
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = size * 0.1;
    ctx.fillText(char, size / 2, size / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    this.textureCache.set(cacheKey, texture);
    return texture;
  }
  
  createLetterSprite(char: string, color: THREE.Color, baseOpacity: number): THREE.Sprite {
    const texture = this.createLetterTexture(char, 64);
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: color,
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    
    const sprite = new THREE.Sprite(material);
    return sprite;
  }
  
  updateGlow(time: number) {
    this.glowMaterial.uniforms.uTime.value = time;
  }
  
  clearCache() {
    this.textureCache.clear();
  }
}

// ============================================
// Foam Particle System - Dynamic density based on word coverage
// ============================================
class FoamParticleSystem {
  private particles: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private basePositions: Float32Array;
  private particleCount: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private activeParticleCount: number;
  
  constructor(maxParticles: number = 8000) {
    this.particleCount = maxParticles;
    this.activeParticleCount = maxParticles;
    
    // Initialize arrays
    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.basePositions = new Float32Array(maxParticles * 3);
    
    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    
    // Optimized material
    this.material = new THREE.PointsMaterial({
      color: 0x88aaff,
      size: 1.5,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(this.geometry, this.material);
    
    // Initial placement
    this.initializeParticles();
  }
  
  private initializeParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * 2000;
      this.positions[i * 3 + 1] = Math.random() * 20 - 10;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
      
      this.basePositions[i * 3] = this.positions[i * 3];
      this.basePositions[i * 3 + 1] = this.positions[i * 3 + 1];
      this.basePositions[i * 3 + 2] = this.positions[i * 3 + 2];
      
      this.velocities[i * 3] = 0;
      this.velocities[i * 3 + 1] = 0;
      this.velocities[i * 3 + 2] = 0;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
  
  // Update density based on word coverage area
  updateDensity(wordCount: number, _coverageArea: number) {
    // Calculate target particle density
    const densityFactor = Math.min(1, Math.max(0.1, wordCount / 1500));
    const targetCount = Math.floor(this.particleCount * densityFactor * 0.5);
    
    // Scale active particles
    this.activeParticleCount = targetCount;
    
    // Update material opacity based on density
    this.material.opacity = 0.15 + densityFactor * 0.25;
    
    // Update visibility by setting unused particles far away
    for (let i = targetCount; i < this.particleCount; i++) {
      this.positions[i * 3] = 10000;
      this.positions[i * 3 + 1] = 10000;
      this.positions[i * 3 + 2] = 10000;
    }
    
    this.geometry.setDrawRange(0, this.activeParticleCount);
    this.geometry.attributes.position.needsUpdate = true;
  }
  
  update(time: number, waveHeight: (x: number, z: number) => number) {
    for (let i = 0; i < this.activeParticleCount; i++) {
      const i3 = i * 3;
      
      // Get base position
      const x = this.basePositions[i3];
      const z = this.basePositions[i3 + 2];
      
      // Calculate wave height at this position
      const waveY = waveHeight(x * 0.008, z * 0.008) * 0.5;
      
      // Apply wave motion with slight randomness
      this.positions[i3] = x + Math.sin(time * 0.5 + i * 0.01) * 2;
      this.positions[i3 + 1] = waveY + Math.sin(time * 2 + i * 0.1) * 1.5;
      this.positions[i3 + 2] = z + Math.cos(time * 0.3 + i * 0.02) * 2;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }
  
  getMesh(): THREE.Points {
    return this.particles;
  }
  
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// ============================================
// Verse 3D Animation System - Full phrases in 3D space
// ============================================
class Verse3DAnimationSystem {
  private verseSprites: THREE.Sprite[] = [];
  private isAnimating: boolean = false;
  private currentVerse: string = '';
  private currentIndex: number = 0;
  private typingSpeed: number = 60;
  private lastTypedTime: number = 0;
  private animationGroup: THREE.Group;
  
  // Position in front of camera
  private versePosition = new THREE.Vector3(0, 100, 200);
  private verseScale: number = 1;
  private readonly letterSpacing = 12;
  private readonly lineHeight = 20;
  
  constructor() {
    this.animationGroup = new THREE.Group();
    this.animationGroup.position.copy(this.versePosition);
    this.animationGroup.visible = false;
    scene.add(this.animationGroup);
  }
  
  setPosition(x: number, y: number, z: number, scale: number = 1) {
    this.versePosition.set(x, y, z);
    this.verseScale = scale;
    if (this.animationGroup.visible) {
      this.animationGroup.position.copy(this.versePosition);
      this.animationGroup.scale.set(scale, scale, scale);
    }
  }
  
  // Animate a full verse in 3D
  animateVerse(text: string, duration: number = 5000) {
    if (this.isAnimating) return;
    
    this.clearVerse();
    this.currentVerse = text;
    this.currentIndex = 0;
    this.isAnimating = true;
    this.typingSpeed = Math.max(30, text.length * 60 / (duration / 1000 * 60));
    
    this.animationGroup.visible = true;
    this.animationGroup.position.copy(this.versePosition);
    this.animationGroup.scale.set(this.verseScale, this.verseScale, this.verseScale);
    
    this.lastTypedTime = performance.now();
    this.animateNextChar();
  }
  
  private animateNextChar() {
    if (!this.isAnimating || this.currentIndex >= this.currentVerse.length) {
      this.finishAnimation();
      return;
    }
    
    const now = performance.now();
    if (now - this.lastTypedTime < this.typingSpeed) {
      requestAnimationFrame(() => this.animateNextChar());
      return;
    }
    
    this.lastTypedTime = now;
    
    const char = this.currentVerse[this.currentIndex];
    this.currentIndex++;
    
    // Create 3D sprite for this character
    this.addCharSprite(char, this.currentIndex - 1);
    
    requestAnimationFrame(() => this.animateNextChar());
  }
  
  private addCharSprite(char: string, index: number) {
    // Handle newlines
    if (char === '\n') {
      return; // Handled by position calculation
    }
    
    const texture = letterRenderer.createLetterTexture(char, 48);
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color().setHSL(0.58, 0.7, 0.7) // Soft blue-purple
    });
    
    const sprite = new THREE.Sprite(material);
    
    // Calculate position - center the verse
    const lines = this.currentVerse.split('\n');
    const currentLineIndex = this.currentVerse.substring(0, index).split('\n').length - 1;
    
    const xOffset = (index - this.currentVerse.lastIndexOf('\n', index - 1) - 1) * this.letterSpacing;
    const yOffset = -currentLineIndex * this.lineHeight;
    
    // Center the entire verse
    const totalWidth = Math.max(...lines.map(l => l.length)) * this.letterSpacing;
    const centerX = -totalWidth / 2;
    
    sprite.position.set(centerX + xOffset, yOffset, 0);
    sprite.scale.set(24, 32, 1);
    
    // Fade in animation
    material.opacity = 0;
    this.animateSpriteIn(sprite);
    
    this.animationGroup.add(sprite);
    this.verseSprites.push(sprite);
  }
  
  private animateSpriteIn(sprite: THREE.Sprite) {
    const material = sprite.material as THREE.SpriteMaterial;
    const startTime = performance.now();
    const duration = 100;
    
    const animate = () => {
      if (!this.isAnimating) return;
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Ease out
      material.opacity = progress * 0.9;
      sprite.scale.set(24 * (1 + (1 - progress) * 0.3), 32 * (1 + (1 - progress) * 0.3), 1);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  private finishAnimation() {
    this.isAnimating = false;
    
    // Auto-hide after duration
    setTimeout(() => {
      if (!this.isAnimating) {
        this.clearVerse();
      }
    }, 5000);
  }
  
  private clearVerse() {
    this.verseSprites.forEach(sprite => {
      this.animationGroup.remove(sprite);
      sprite.material.dispose();
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
    });
    this.verseSprites = [];
    this.animationGroup.visible = false;
    this.currentVerse = '';
  }
  
  // Update position to face camera
  update(camera: THREE.Camera) {
    if (this.animationGroup.visible && this.verseSprites.length > 0) {
      // Make the group face the camera
      this.animationGroup.lookAt(camera.position);
    }
  }
  
  getIsAnimating(): boolean {
    return this.isAnimating;
  }
}

// Calculate coverage area based on word positions
function calculateCoverageArea(): number {
  if (words.length === 0) return 0;
  
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  words.forEach(wordData => {
    minX = Math.min(minX, wordData.baseX);
    maxX = Math.max(maxX, wordData.baseX);
    minZ = Math.min(minZ, wordData.baseZ);
    maxZ = Math.max(maxZ, wordData.baseZ);
  });
  
  return (maxX - minX) * (maxZ - minZ);
}
class SimplexNoise {
  private perm: number[] = [];
  
  constructor() {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  
  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    
    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    
    const grad = (hash: number, x: number, y: number) => {
      const h = hash & 7;
      const u = h < 4 ? x : y;
      const v = h < 4 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
    };
    
    let n0 = 0, n1 = 0, n2 = 0;
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
    }
    
    return 70 * (n0 + n1 + n2);
  }
  
  oceanWaves(x: number, z: number, time: number, amplitude: number = 60): number {
    let y = 0;
    y += this.noise2D(x * 0.003 + time * 0.1, z * 0.003) * amplitude;
    y += this.noise2D(x * 0.01 + time * 0.3, z * 0.01) * amplitude * 0.4;
    y += this.noise2D(x * 0.03 + time * 0.8, z * 0.03) * amplitude * 0.15;
    return y;
  }
}

// ============================================
// Types
// ============================================
interface Poem {
  title: string;
  author: string;
  lines: string[];
  excerpt?: string;
}

interface WordData {
  sprites: THREE.Sprite[];
  baseX: number;
  baseY: number;
  baseZ: number;
  word: string;
  depth: number;
}

// ============================================
// Global State
// ============================================
console.log('=== MAR DE PALABRAS V2 - POESÍA LATINA ===');

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let words: WordData[] = [];
let tiempo = 0;
let poems: Poem[] = [];
let noise: SimplexNoise;
let letterRenderer: LetterRenderer;

// Foam system - optimized for dynamic density
let foamSystem: FoamParticleSystem;

// Word animation system - 3D verses
let verse3DAnimationSystem: Verse3DAnimationSystem;

// Physics / Interaction
const mouse = { x: 0, y: 0, pressed: false, worldX: 0, worldZ: 0 };
const ripples: Array<{ x: number, z: number, time: number, strength: number }> = [];

// Config - adjustable via UI
let config = {
  speed: 0.04,
  waveAmplitude: 60,
  density: 1500,
  fontSize: 14,
  // Letter appearance settings
  letterSize: 14,
  letterBloom: 0.8,
  letterOpacity: 0.7,
  letterHue: 0.55,
  letterSaturation: 0.6,
  letterContrast: 0.6
};

// Post-processing reference
let bloomPass: UnrealBloomPass;

const font = 'bold 14px "Crimson Pro", Georgia, serif';

// ============================================
// API: Fetch Latin American Poetry
// ============================================
async function fetchLatinAmericanPoetry(): Promise<Poem[]> {
  const collectedPoems: Poem[] = [];
  
  // Latin American authors to fetch
  const authors = [
    'Pablo+Neruda',
    'Gabriela+Mistral', 
    'Octavio+Paz',
    'Sor+Juana+Inés+de+la+Cruz',
    'Jorge+Luis+Borges',
    'Mario+Benedetti',
    ' César+Vallejo',
    'José+Martí',
    'Rubén+Darío'
  ];
  
  try {
    console.log('Fetching from PoetryDB...');
    
    // Fetch from PoetryDB
    for (const author of authors.slice(0, 5)) {
      try {
        const response = await fetch(
          `https://poetrydb.org/author/${author}`,
          { method: 'GET' }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            data.slice(0, 3).forEach((poem: any) => {
              if (poem.lines && Array.isArray(poem.lines)) {
                collectedPoems.push({
                  title: poem.title || 'Sin título',
                  author: author.replace(/\+/g, ' '),
                  lines: poem.lines,
                  excerpt: poem.lines.slice(0, 4).join('\n')
                });
              }
            });
          }
        }
      } catch {
        console.log(`Error fetching ${author}`);
      }
    }
    
    // If we don't have enough, add some classic texts
    if (collectedPoems.length < 10) {
      console.log('Adding classic poems...');
      collectedPoems.push(...getClassicPoems());
    }
    
  } catch {
    console.error('Error fetching poetry');
    collectedPoems.push(...getClassicPoems());
  }
  
  return collectedPoems;
}

function getClassicPoems(): Poem[] {
  return [
    {
      title: 'Veinte poemas de amor y una canción desesperada',
      author: 'Pablo Neruda',
      lines: [
        'Puedo escribir los versos más tristes esta noche.',
        'Escribir, por ejemplo: "La noche está estrellada,',
        'y tiritan, azules, los astros, a lo lejos".',
        'El viento de la noche gira en el cielo y canta.'
      ],
      excerpt: 'Puedo escribir los versos más tristes esta noche.'
    },
    {
      title: 'Me gustas cuando callas',
      author: 'Pablo Neruda',
      lines: [
        'Me gustas cuando callas porque estás como ausente,',
        'y me oyes desde lejos y mi voz no te toca.',
        'Parece que los ojos se te hubieran volado',
        'y parece que un beso te cerrara la boca.'
      ],
      excerpt: 'Me gustas cuando callas porque estás como ausente.'
    },
    {
      title: 'Piececitos',
      author: 'Gabriela Mistral',
      lines: [
        'Piececitos de niño,',
        'grandes como dos rosas.',
        'Piececitos de niño,',
        'que no son de unaosa,',
        'sino de la pobleza.'
      ],
      excerpt: 'Piececitos de niño, grandes como dos rosas.'
    },
    {
      title: 'A una voz',
      author: 'Sor Juana Inés de la Cruz',
      lines: [
        'Hombres necios que acusáis',
        'a la mujer sin razón,',
        'sin ver que sois la causa',
        'de la misma condición.'
      ],
      excerpt: 'Hombres necios que acusáis a la mujer sin razón.'
    },
    {
      title: 'El río',
      author: 'Octavio Paz',
      lines: [
        'El río fluye,',
        'no es el agua, es el tiempo.',
        'El tiempo fluye',
        'y no hay río, no hay agua,',
        'sólo el presente.'
      ],
      excerpt: 'El río fluye, no es el agua, es el tiempo.'
    },
    {
      title: 'Versos Sencillos',
      author: 'José Martí',
      lines: [
        'Yo soy un hombre sincero',
        'de donde crece la palma,',
        'y antes de sermeister',
        'quisiera serarla.',
        'Cultivo una rosa blanca',
        'en julio como en enero.'
      ],
      excerpt: 'Yo soy un hombre sincero de donde crece la palma.'
    },
    {
      title: 'Canto a la patria',
      author: 'Rubén Darío',
      lines: [
        'Años, pueblos, idiomas,',
        'todo lo que vi, lo he visto en esta hora.',
        'Cual un caimán el río de la historia',
        'lentamente se mueve entre manglares.'
      ],
      excerpt: 'Años, pueblos, idiomas, todo lo que vi, lo he visto en esta hora.'
    },
    {
      title: 'Los heraldos negros',
      author: 'César Vallejo',
      lines: [
        'Hay tras los Andes soles, hay ms lunas.',
        'Hay ms dolor; infuse. Hay ms pobreza.',
        'Todo este placer对对对',
        'me viene a la cabeza.'
      ],
      excerpt: 'Hay tras los Andes soles, hay más lunas.'
    },
    {
      title: 'Canción de octubre',
      author: 'Mario Benedetti',
      lines: [
        'Octubre es el mes de las hojas muertas',
        'y de la melancolía.',
        'Pero también es el mes',
        'en que algo puede empezar.'
      ],
      excerpt: 'Octubre es el mes de las hojas muertas.'
    },
    {
      title: 'El-sur también existe',
      author: 'Jorge Luis Borges',
      lines: [
        'Yo he归还 muchos，通',
        'no he perdido nunca.',
        'Busco el-sur,ese карта',
        'que me llama.'
      ],
      excerpt: 'Yo he归还 muchos, no he perdido nunca.'
    }
  ];
}

// ============================================
// Three.js Setup
// ============================================
function measureWord(word: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  return ctx.measureText(word).width;
}

function extractWordsFromPoems(poems: Poem[]): string[] {
  const allWords: string[] = [];
  
  poems.forEach(poem => {
    poem.lines.forEach(line => {
      // Clean and split line
      const words = line.toLowerCase()
        .replace(/[¿?¡!.,;:'"()]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && /^[a-záéíóúüñ]+$/i.test(w));
      
      allWords.push(...words);
    });
  });
  
  // Remove duplicates while preserving order
  const unique: string[] = [];
  const seen = new Set<string>();
  allWords.forEach(w => {
    if (!seen.has(w)) {
      seen.add(w);
      unique.push(w);
    }
  });
  
  return unique;
}

function init(loadedPoems: Poem[]) {
  console.log('=== INIT V2 ===');
  console.log('Poemas cargados:', loadedPoems.length);
  
  // Hide loading
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  
  poems = loadedPoems;
  noise = new SimplexNoise();
  letterRenderer = new LetterRenderer();
  
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010108);
  scene.fog = new THREE.FogExp2(0x010108, 0.00035);
  
  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 250, 700);
  camera.lookAt(0, 0, -300);
  
  // Renderer - optimized for performance
  renderer = new THREE.WebGLRenderer({ 
    antialias: false, // Disable for performance
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap at 1.5x
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById('canvas-container')!.appendChild(renderer.domElement);
  
  // Post-processing with Bloom - reduced quality for performance
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,  // Reduced strength
    0.3,  // Reduced radius
    0.85  // Higher threshold - fewer pixels affected
  );
  composer.addPass(bloomPass);
  
  // Lights
  const ambient = new THREE.AmbientLight(0x334466, 0.3);
  scene.add(ambient);
  
  const light1 = new THREE.PointLight(0x00ffff, 0.6, 1500);
  light1.position.set(300, 300, 300);
  scene.add(light1);
  
  const light2 = new THREE.PointLight(0xff00ff, 0.5, 1500);
  light2.position.set(-300, 150, -300);
  scene.add(light2);
  
  // Create words from poetry
  createWordField();
  
  // Create foam particles with dynamic density
  foamSystem = new FoamParticleSystem(8000);
  foamSystem.updateDensity(words.length, calculateCoverageArea());
  scene.add(foamSystem.getMesh());
  
  // Initialize word animation systems
  verse3DAnimationSystem = new Verse3DAnimationSystem();
  
  // Setup UI controls
  setupControls();
  
  // Start animation
  animate();
}

function createWordField() {
  const allWords = extractWordsFromPoems(poems);
  console.log('Palabras únicas extraídas:', allWords.length);
  
  // Clear existing
  words.forEach(w => {
    w.sprites.forEach(s => scene.remove(s));
  });
  words = [];
  
  const density = config.density;
  const gridSize = Math.ceil(Math.sqrt(density));
  const spacingX = 50;
  const spacingZ = 50;
  const offsetX = (gridSize * spacingX) / 2;
  const offsetZ = (gridSize * spacingZ) / 2;
  
  // Measure canvas
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = font;
  
  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      if (words.length >= density) break;
      
      const word = allWords[Math.floor(Math.random() * allWords.length)];
      const wordW = measureWord(word);
      
      const baseX = x * spacingX - offsetX + (Math.random() - 0.5) * 25;
      const baseZ = z * spacingZ - offsetZ + (Math.random() - 0.5) * 25;
      const baseY = (Math.random() - 0.5) * 15;
      const depth = (baseZ + offsetZ) / (gridSize * spacingZ);
      
      // Create sprites for each letter - using LetterRenderer for better quality
      const sprites: THREE.Sprite[] = [];
      let currentX = baseX - wordW / 2;
      
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const texture = letterRenderer.createLetterTexture(char, 64);
        
        // Enhanced color palette - more vibrant and varied
        const hue = 0.55 + (x / gridSize) * 0.25 - depth * 0.35;
        const saturation = 0.6 + depth * 0.25;
        const lightness = 0.55 + (1 - depth) * 0.35;
        
        const baseOpacity = 0.5 + (1 - depth) * 0.5;
        
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: baseOpacity,
          depthWrite: false,
          color: new THREE.Color().setHSL(hue % 1, saturation, lightness)
        });
        
        const sprite = new THREE.Sprite(material);
        const charW = measureCtx.measureText(char).width;
        
        // Slightly larger scale for better visibility
        sprite.scale.set(charW * 1.3, config.fontSize * 1.6, 1);
        sprite.position.set(currentX + charW / 2, baseY, baseZ);
        
        scene.add(sprite);
        sprites.push(sprite);
        currentX += charW;
      }
      
      words.push({
        sprites,
        baseX,
        baseY,
        baseZ,
        word,
        depth
      });
    }
  }
  
  console.log('Palabras creadas:', words.length);
}

function setupControls() {
  // Speed slider
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      config.speed = parseFloat(speedSlider.value);
    });
  }
  
  // Wave amplitude slider
  const waveSlider = document.getElementById('wave-slider') as HTMLInputElement;
  if (waveSlider) {
    waveSlider.addEventListener('input', () => {
      config.waveAmplitude = parseFloat(waveSlider.value);
    });
  }
  
  // Density slider - triggers rebuild
  const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
  if (densitySlider) {
    densitySlider.addEventListener('change', () => {
      config.density = parseInt(densitySlider.value);
      createWordField();
      
      // Update foam density based on new word count
      if (foamSystem) {
        foamSystem.updateDensity(words.length, calculateCoverageArea());
      }
    });
  }
  
  // ============================================
  // Letter Appearance UI Controls
  // ============================================
  
  // Toggle letter settings panel
  const toggleBtn = document.getElementById('toggle-letters');
  const letterSettings = document.getElementById('letter-settings');
  if (toggleBtn && letterSettings) {
    toggleBtn.addEventListener('click', () => {
      letterSettings.classList.toggle('visible');
    });
  }
  
  // Update color preview on hue change
  const hueSlider = document.getElementById('letter-hue') as HTMLInputElement;
  const saturationSlider = document.getElementById('letter-saturation') as HTMLInputElement;
  const contrastSlider = document.getElementById('letter-contrast') as HTMLInputElement;
  const colorPreview = document.getElementById('color-preview');
  
  const updateColorPreview = () => {
    if (colorPreview) {
      const h = parseFloat(hueSlider?.value || '0.55');
      const s = parseFloat(saturationSlider?.value || '0.6');
      const l = parseFloat(contrastSlider?.value || '0.6');
      colorPreview.style.background = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
    }
  };
  
  if (hueSlider) {
    hueSlider.addEventListener('input', updateColorPreview);
    saturationSlider?.addEventListener('input', updateColorPreview);
    contrastSlider?.addEventListener('input', updateColorPreview);
    updateColorPreview();
  }
  
  // Apply letter changes button
  const applyBtn = document.getElementById('apply-letter-changes');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      // Get values from sliders
      const letterSizeInput = document.getElementById('letter-size') as HTMLInputElement;
      const letterBloomInput = document.getElementById('letter-bloom') as HTMLInputElement;
      const letterOpacityInput = document.getElementById('letter-opacity') as HTMLInputElement;
      const letterHueInput = document.getElementById('letter-hue') as HTMLInputElement;
      const letterSatInput = document.getElementById('letter-saturation') as HTMLInputElement;
      const letterContrastInput = document.getElementById('letter-contrast') as HTMLInputElement;
      
      if (letterSizeInput) config.letterSize = parseInt(letterSizeInput.value);
      if (letterBloomInput) config.letterBloom = parseFloat(letterBloomInput.value);
      if (letterOpacityInput) config.letterOpacity = parseFloat(letterOpacityInput.value);
      if (letterHueInput) config.letterHue = parseFloat(letterHueInput.value);
      if (letterSatInput) config.letterSaturation = parseFloat(letterSatInput.value);
      if (letterContrastInput) config.letterContrast = parseFloat(letterContrastInput.value);
      
      // Apply bloom changes
      if (bloomPass) {
        bloomPass.strength = config.letterBloom;
      }
      
      // Update existing letters with new appearance
      applyLetterAppearance();
      
      console.log('Letter appearance updated:', config);
    });
  }
  
  // ============================================
  // Verse Position Panel Toggle
  // ============================================
  const toggleVerseBtn = document.getElementById('toggle-verse-position');
  const versePositionPanel = document.getElementById('verse-position-panel');
  if (toggleVerseBtn && versePositionPanel) {
    toggleVerseBtn.addEventListener('click', () => {
      versePositionPanel.classList.toggle('visible');
    });
  }
  
  // Verse position controls
  const verseXSlider = document.getElementById('verse-x') as HTMLInputElement;
  const verseYSlider = document.getElementById('verse-y') as HTMLInputElement;
  const verseZSlider = document.getElementById('verse-z') as HTMLInputElement;
  const verseScaleSlider = document.getElementById('verse-scale') as HTMLInputElement;
  
  const updateVersePosition = () => {
    if (verse3DAnimationSystem) {
      const x = parseFloat(verseXSlider?.value || '0');
      const y = parseFloat(verseYSlider?.value || '100');
      const z = parseFloat(verseZSlider?.value || '200');
      const scale = parseFloat(verseScaleSlider?.value || '1');
      verse3DAnimationSystem.setPosition(x, y, z, scale);
    }
  };
  
  if (verseXSlider) {
    verseXSlider.addEventListener('input', updateVersePosition);
    verseYSlider?.addEventListener('input', updateVersePosition);
    verseZSlider?.addEventListener('input', updateVersePosition);
    verseScaleSlider?.addEventListener('input', updateVersePosition);
  }
}

function applyLetterAppearance() {
  // Apply appearance settings to all existing letter sprites
  words.forEach(wordData => {
    const { sprites, depth } = wordData;
    const depthFactor = 1 - depth * 0.4;
    
    sprites.forEach((sprite, i) => {
      const material = sprite.material as THREE.SpriteMaterial;
      
      // Update opacity based on settings and depth
      material.opacity = config.letterOpacity * depthFactor;
      
      // Update color with new hue, saturation, contrast settings
      const hue = config.letterHue + (i * 0.02) % 0.1;
      material.color.setHSL(hue % 1, config.letterSaturation, config.letterContrast);
      
      // Update scale based on font size
      const charW = 8; // approximate
      sprite.scale.set(charW * (config.letterSize / 10) * 1.3, config.letterSize * 1.6, 1);
    });
  });
}

// ============================================
// Animation - Optimized for performance
// ============================================
function animate() {
  requestAnimationFrame(animate);
  tiempo += config.speed;
  
  // Update ripples - limit processing to 5 most recent
  const activeRipples = ripples.slice(0, 5);
  for (let i = ripples.length - 1; i >= 0; i++) {
    ripples[i].time += 0.05;
    if (ripples[i].time > 3) {
      ripples.splice(i, 1);
    }
  }
  
  // Pre-calculate wave parameters once per frame
  const timeFactor = tiempo * 0.7;
  
  // Update words - optimized with fewer calculations
  for (let w = 0; w < words.length; w++) {
    const wordData = words[w];
    const { sprites, baseX, baseY, baseZ, depth } = wordData;
    const depthFactor = 1 - depth * 0.4;
    
    // Single wave calculation per word (not per letter)
    const waveHeight = noise.oceanWaves(
      baseX * 0.008,
      baseZ * 0.008,
      timeFactor * depthFactor,
      config.waveAmplitude
    );
    
    // Simplified ripple effect - only check closest ripple
    let rippleEffect = 0;
    if (activeRipples.length > 0) {
      const ripple = activeRipples[0]; // Only check first ripple
      const dx = baseX - ripple.x;
      const dz = baseZ - ripple.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const rippleRadius = ripple.time * 400;
      const distFromRipple = Math.abs(dist - rippleRadius);
      
      if (distFromRipple < 100) {
        rippleEffect = Math.sin(distFromRipple * 0.05 - ripple.time * 10) * 
                      (1 - ripple.time / 3) * ripple.strength * 
                      (1 - distFromRipple / 100);
      }
    }
    
    // Mouse interaction - simplified
    let mouseWave = 0;
    if (mouse.pressed) {
      const dx = baseX - mouse.worldX;
      const dz = baseZ - mouse.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      mouseWave = Math.max(0, 250 - dist) / 250 * 60 * 2.5;
    }
    
    const baseOffset = baseY + waveHeight + rippleEffect + mouseWave;
    const baseZOffset = baseZ;
    
    // Update all letter sprites in this word
    const spriteCount = sprites.length;
    for (let i = 0; i < spriteCount; i++) {
      const sprite = sprites[i];
      // Simplified letter wave - skip per-letter noise calculation
      const letterWave = Math.sin(i * 0.5 + tiempo) * config.waveAmplitude * 0.1;
      
      sprite.position.y = baseOffset + letterWave;
      sprite.position.z = baseZOffset + Math.sin(tiempo * 0.5 + baseX * 0.005) * 3;
      
      // Update opacity less frequently (every 10 frames)
      if (w % 10 === 0) {
        (sprite.material as THREE.SpriteMaterial).opacity = (0.25 + depthFactor * 0.55);
      }
    }
  }
  
  // Camera movement - simplified
  const camTime = tiempo * 0.2;
  camera.position.x = Math.sin(camTime) * 150;
  camera.position.y = 250 + Math.cos(camTime * 0.5) * 30;
  camera.position.z = 700 + Math.cos(camTime) * 80;
  camera.lookAt(0, 0, -250);
  
  // Update foam system with wave function
  if (foamSystem) {
    foamSystem.update(tiempo, (x, z) => {
      return noise.oceanWaves(x, z, tiempo, config.waveAmplitude);
    });
  }
  
  // Update verse 3D animation to face camera
  if (verse3DAnimationSystem) {
    verse3DAnimationSystem.update(camera);
  }
  
  // Update letter renderer glow
  letterRenderer.updateGlow(tiempo);
  
  // Use composer for post-processing
  composer.render();
}

// ============================================
// Events
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  
  // Convert to world coordinates
  mouse.worldX = mouse.x * 500;
  mouse.worldZ = mouse.y * 500 - 300;
});

window.addEventListener('mousedown', () => {
  mouse.pressed = true;
  
  // Create ripple at click position
  ripples.push({
    x: mouse.worldX,
    z: mouse.worldZ,
    time: 0,
    strength: 80
  });
  
  // Randomly show a verse from poetry
  if (poems.length > 0 && Math.random() > 0.6) {
    showRandomVerse();
  }
});

window.addEventListener('mouseup', () => {
  mouse.pressed = false;
});

function showRandomVerse() {
  const poem = poems[Math.floor(Math.random() * poems.length)];
  const verseEl = document.getElementById('verse-display');
  const authorEl = document.getElementById('author-display');
  
  if (verseEl && authorEl) {
    const verseText = poem.excerpt || poem.lines[0];
    verseEl.textContent = verseText;
    authorEl.textContent = `— ${poem.author}, "${poem.title}"`;
    verseEl.classList.add('visible');
    
    // Animate verse in 3D
    if (verse3DAnimationSystem) {
      verse3DAnimationSystem.animateVerse(verseText);
    }
    
    setTimeout(() => {
      verseEl.classList.remove('visible');
    }, 5000);
  }
}

// ============================================
// Start
// ============================================
async function start() {
  console.log('Iniciando carga de poesía...');
  
  const loadedPoems = await fetchLatinAmericanPoetry();
  console.log('Poemas obtenidos:', loadedPoems.length);
  init(loadedPoems);
}

document.fonts.ready.then(start).catch(() => setTimeout(start, 100));
