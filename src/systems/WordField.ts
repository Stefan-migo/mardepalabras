// ============================================
// Word Field System - Manages floating words
// ============================================

import * as THREE from 'three';
import type { WordData, Config } from '../types';
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
    const gridSize = Math.ceil(Math.sqrt(density));
    const spacing = 50;
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
        
        const baseX = x * spacing - offset + (Math.random() - 0.5) * 25;
        const baseZ = z * spacing - offset + (Math.random() - 0.5) * 25;
        const baseY = (Math.random() - 0.5) * 15;
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
  
  // Update word positions (called each frame)
  update(time: number, waveFn: (x: number, z: number, time: number, amp: number) => number, amp: number, mouse: { pressed: boolean, worldX: number, worldZ: number }) {
    const timeFactor = time * 0.7;
    
    for (let w = 0; w < this.words.length; w++) {
      const word = this.words[w];
      const { sprites, baseX, baseY, baseZ, depth } = word;
      const depthFactor = 1 - depth * 0.4;
      
      // Single wave calculation per word
      const waveHeight = waveFn(baseX * 0.008, baseZ * 0.008, timeFactor * depthFactor, amp);
      
      // Simplified ripple/mouse effect
      let mouseEffect = 0;
      if (mouse.pressed) {
        const dx = baseX - mouse.worldX;
        const dz = baseZ - mouse.worldZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        mouseEffect = Math.max(0, 250 - dist) / 250 * 60 * 2.5;
      }
      
      const baseOffset = baseY + waveHeight + mouseEffect;
      
      // Update each letter
      const spriteCount = sprites.length;
      for (let i = 0; i < spriteCount; i++) {
        const sprite = sprites[i];
        
        // Simplified letter wave - cheaper than noise
        const letterWave = Math.sin(i * 0.5 + time) * amp * 0.08;
        
        sprite.position.y = baseOffset + letterWave;
        sprite.position.z = baseZ + Math.sin(time * 0.5 + baseX * 0.005) * 3;
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