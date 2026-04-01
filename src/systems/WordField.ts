// ============================================
// Word Field System - Manages floating words
// ============================================

import * as THREE from 'three';
import type { WordData, Config, SimpleMouse } from '../types';
import { TextRenderer } from '../utils/TextRenderer';

export class WordField {
  private words: WordData[] = [];
  private scene: THREE.Scene;
  private textRenderer: TextRenderer;
  private config: Config;
  
  constructor(scene: THREE.Scene, textRenderer: TextRenderer, config: Config) {
    this.scene = scene;
    this.textRenderer = textRenderer;
    this.config = config;
  }
  
  // Create word field from poems
  create(poems: { lines: string[] }[], density: number) {
    // Clear existing
    this.clear();
    
    const allWords = this.extractWords(poems);
    // Make grid larger to cover more area
    const gridSize = Math.ceil(Math.sqrt(density)) * 1.3;
    
    // Dynamic spacing: higher density = closer words, but cover more area
    const spacing = Math.max(18, 45 - (density - 400) * 0.015);
    const offset = (gridSize * spacing) / 2;
    
    // Measure canvas for character widths
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d')!;
    measureCtx.font = 'bold 14px "Crimson Pro", Georgia, serif';
    
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        if (this.words.length >= density) break;
        
        const word = allWords[Math.floor(Math.random() * allWords.length)];
        const wordWidth = measureCtx.measureText(word).width;
        
        const baseX = x * spacing - offset + (Math.random() - 0.5) * 20;
        const baseZ = z * spacing - offset + (Math.random() - 0.5) * 20;
        // More variation in Y for wave effect - waves rise in center, fall at edges
        const centerDist = Math.sqrt(Math.pow(x - gridSize/2, 2) + Math.pow(z - gridSize/2, 2));
        const centerFactor = 1 - (centerDist / (gridSize * 0.7));
        const baseY = centerFactor * 30 + (Math.random() - 0.5) * 20;
        const depth = (z / gridSize);
        
        // Create sprites for each letter
        const sprites = this.createWordSprites(word, baseX, baseY, baseZ, wordWidth, depth);
        
        this.words.push({
          sprites,
          baseX,
          baseY,
          baseZ,
          word,
          depth
        });
      }
    }
    
    console.log('Words created:', this.words.length);
  }
  
  private extractWords(poems: { lines: string[] }[]): string[] {
    const allWords: string[] = [];
    
    poems.forEach(poem => {
      poem.lines.forEach(line => {
        const words = line.toLowerCase()
          .replace(/[¿?¡!.,;:'"()]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2 && /^[a-záéíóúñ]+$/i.test(w));
        allWords.push(...words);
      });
    });
    
    // Remove duplicates
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
  
  private createWordSprites(word: string, baseX: number, baseY: number, baseZ: number, wordWidth: number, depth: number): THREE.Sprite[] {
    const sprites: THREE.Sprite[] = [];
    let currentX = baseX - wordWidth / 2;
    
    const depthFactor = 1 - depth * 0.4;
    const hue = 0.55 + (1 - depth) * 0.2;
    const color = new THREE.Color().setHSL(hue, 0.6, 0.55);
    const opacity = 0.3 + depthFactor * 0.5;
    
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const texture = this.textRenderer.createLetterTexture(char, 64);
      
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        color: color
      });
      
      const sprite = new THREE.Sprite(material);
      const charWidth = 8; // Approximate
      
      sprite.scale.set(charWidth * 1.3, this.config.fontSize * 1.6, 1);
      sprite.position.set(currentX + charWidth / 2, baseY, baseZ);
      
      this.scene.add(sprite);
      sprites.push(sprite);
      currentX += charWidth;
    }
    
    return sprites;
  }
  
  // Update word positions - HIGHLY OPTIMIZED with ripple support
  update(time: number, waveFn: (x: number, z: number, time: number, amp: number) => number, amp: number, mouse: SimpleMouse, ripples?: { x: number; z: number; time: number; strength: number }[]) {
    const timeFactor = time * 0.7;
    const mouseActive = mouse.pressed;
    const mouseX = mouse.worldX;
    const mouseZ = mouse.worldZ;
    const mouseRadiusSq = 250 * 250;
    const mouseCheckRadius = 250;
    
    // Pre-calculate once
    const sinTime = Math.sin(time * 0.5);
    const wordCount = this.words.length;
    const ampFactor = amp * 0.08;
    
    for (let w = 0; w < wordCount; w++) {
      const word = this.words[w];
      const { sprites, baseX, baseY, baseZ, depth } = word;
      
      // Only skip very far words (depth > 0.95)
      if (depth > 0.95) continue;
      
      const depthFactor = 1 - (depth * 0.35);
      const waveHeight = waveFn(baseX * 0.008, baseZ * 0.008, timeFactor * depthFactor, amp);
      
      // Mouse/touch effect - only when pressed
      let mouseEffect = 0;
      if (mouseActive && Math.abs(baseX - mouseX) < mouseCheckRadius && Math.abs(baseZ - mouseZ) < mouseCheckRadius) {
        const dx = baseX - mouseX;
        const dz = baseZ - mouseZ;
        const distSq = dx * dx + dz * dz;
        if (distSq < mouseRadiusSq) {
          mouseEffect = (1 - distSq / mouseRadiusSq) * 100;
        }
      }
      
      // Additional ripple effect on words - gentle
      let rippleEffect = 0;
      if (ripples && ripples.length > 0) {
        for (const ripple of ripples) {
          if (ripple.time >= 0 && ripple.time < 3) {
            const dx = baseX - ripple.x;
            const dz = baseZ - ripple.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const rippleRadius = ripple.time * 100;
            const rippleWidth = 80;
            
            if (dist < rippleRadius + rippleWidth && dist > rippleRadius - rippleWidth) {
              const ripplePhase = (dist - rippleRadius) / rippleWidth;
              rippleEffect += Math.sin(ripplePhase * Math.PI) * ripple.strength * 0.15 * (1 - ripple.time / 3);
            }
          }
        }
      }
      
      const baseOffset = baseY + waveHeight + mouseEffect + rippleEffect;
      const sinBaseX = Math.sin(baseX * 0.003);
      const zOffset = baseZ + sinTime * sinBaseX * 2;
      
      // Update letters - use simpler math
      const spriteCount = sprites.length;
      const timeOffset = time;
      for (let i = 0; i < spriteCount; i++) {
        const sprite = sprites[i];
        // Replace sin with simple wave
        const letterWave = Math.sin(i * 0.3 + timeOffset) * ampFactor;
        sprite.position.y = baseOffset + letterWave;
        sprite.position.z = zOffset;
      }
    }
  }
  
  // Apply appearance settings
  applyAppearance(settings: { opacity: number; hue: number; saturation: number; contrast: number; size: number }) {
    this.config.letterSize = settings.size;
    
    this.words.forEach(word => {
      const { sprites, depth } = word;
      const depthFactor = 1 - depth * 0.4;
      
      sprites.forEach((sprite, i) => {
        const material = sprite.material as THREE.SpriteMaterial;
        material.opacity = settings.opacity * depthFactor;
        
        const hue = settings.hue + (i * 0.02) % 0.1;
        material.color.setHSL(hue % 1, settings.saturation, settings.contrast);
        
        sprite.scale.set(8 * (settings.size / 10) * 1.3, settings.size * 1.6, 1);
      });
    });
  }
  
  // Clear all words
  clear() {
    this.words.forEach(word => {
      word.sprites.forEach(sprite => {
        this.scene.remove(sprite);
        sprite.material.dispose();
        (sprite.material as THREE.SpriteMaterial).map?.dispose();
      });
    });
    this.words = [];
  }
  
  getWordCount(): number {
    return this.words.length;
  }
}
