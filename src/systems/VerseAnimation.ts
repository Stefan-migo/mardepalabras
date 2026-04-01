// ============================================
// Verse 3D Animation System - Fixed for smooth animation
// ============================================

import * as THREE from 'three';
import type { SceneRefs } from '../types';

// Detect mobile for quality adjustments
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export class VerseAnimationSystem {
  private verseGroup: THREE.Group;
  private sprites: THREE.Sprite[] = [];
  private isAnimating: boolean = false;
  private currentText: string = '';
  private currentIndex: number = 0;
  private typingSpeed: number = 50; // ms per char - faster
  private lastTime: number = 0;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private scene: THREE.Scene;
  
  // Configurable position - further away for mobile for 3 lines max
  private position: THREE.Vector3 = new THREE.Vector3(0, isMobile ? 380 : 100, isMobile ? 380 : 200);
  private scale: number = isMobile ? 2.2 : 1; // Larger scale
  private letterSpacing: number = isMobile ? 20 : 14; // Wider spacing for bigger letters
  private lineHeight: number = isMobile ? 42 : 22; // Line height for 3 lines
  
  // Texture quality - higher on mobile
  private textureSize: number = isMobile ? 128 : 48;
  private fontSize: number = isMobile ? 0.7 : 0.55; // Larger font
  
  constructor(sceneRefs: SceneRefs) {
    this.scene = sceneRefs.scene;
    this.verseGroup = new THREE.Group();
    this.verseGroup.position.copy(this.position);
    this.verseGroup.visible = false;
    this.scene.add(this.verseGroup);
  }
  
  // Set position
  setPosition(x: number, y: number, z: number, scale: number = 1) {
    this.position.set(x, y, z);
    this.scale = scale;
    this.verseGroup.position.copy(this.position);
    this.verseGroup.scale.set(scale, scale, scale);
  }
  
  // Animate verse with smooth typing - DEFERRED to avoid blocking
  animate(text: string) {
    // Store text, actual animation starts in next frame
    this.pendingText = text;
    this.isAnimating = true;
  }
  
  // Auto-wrap text for mobile - MAX 3 LINES
  private wrapText(text: string, maxCharsPerLine: number = 25): string {
    const words = text.split(' ');
    let lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      // Stop at 3 lines max
      if (lines.length >= 3) {
        // Add remaining words to last line with "..."
        if (currentLine) {
          currentLine = currentLine.substring(0, maxCharsPerLine - 3) + '...';
          lines.push(currentLine);
        }
        break;
      }
      
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine && lines.length < 3) lines.push(currentLine);
    
    return lines.join('\n');
  }
  
  // Process pending animation - call this from animation loop
  processPendingAnimation() {
    if (!this.pendingText) return;
    
    // ALWAYS clear first - remove any old sprites and stop old animation
    this.isAnimating = false;
    this.clear();
    
    this.currentText = this.pendingText;
    this.pendingText = null;
    this.currentIndex = 0;
    
    // Auto-wrap on mobile FIRST (before calculating typing speed)
    if (isMobile) {
      const maxLineLength = window.innerWidth < 400 ? 20 : 24;
      this.currentText = this.wrapText(this.currentText, maxLineLength);
    }
    
    // Calculate typing speed AFTER wrapping - use minimum 5000ms for any length
    const minDuration = 5000;
    const duration = minDuration + (this.currentText.length > 50 ? (this.currentText.length - 50) * 30 : 0);
    this.typingSpeed = Math.max(15, duration / this.currentText.length);
    console.log(`Starting verse animation: ${this.currentText.length} chars, ${this.typingSpeed.toFixed(1)}ms per char, total ${duration}ms`);
    
    this.verseGroup.visible = true;
    this.verseGroup.position.copy(this.position);
    this.verseGroup.scale.set(this.scale, this.scale, this.scale);
    
    // Reset timing and START fresh animation
    this.isAnimating = true;
    this.lastTime = performance.now();
    
    console.log('Starting fresh animation loop');
    this.animateFrame();
  }

  private pendingText: string | null = null;
  
  // Animation loop - uses requestAnimationFrame properly
  private animateFrame() {
    if (!this.isAnimating) return;
    
    const now = performance.now();
    const elapsed = now - this.lastTime;
    
    if (elapsed >= this.typingSpeed) {
      this.lastTime = now;
      
      if (this.currentIndex < this.currentText.length) {
        const char = this.currentText[this.currentIndex];
        this.addCharacter(char, this.currentIndex);
        this.currentIndex++;
        
        // Debug: log progress every 10 characters
        if (this.currentIndex % 10 === 0) {
          console.log(`Verse animation: ${this.currentIndex}/${this.currentText.length} chars`);
        }
      } else {
        console.log('Verse animation: COMPLETE');
        this.finishAnimation();
        return;
      }
    }
    
    // Continue animation loop
    requestAnimationFrame(() => this.animateFrame());
  }
  
  // Add character efficiently
  private addCharacter(char: string, index: number) {
    // Handle newlines - they affect lineIndex but don't create sprites
    if (char === '\n') {
      // Still advance the animation by not rendering but counting
      return;
    }
    
    // Get or create texture
    let texture = this.textureCache.get(char);
    if (!texture) {
      texture = this.createTexture(char);
      this.textureCache.set(char, texture);
    }
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color().setHSL(0.58, 0.7, 0.7)
    });
    
    const sprite = new THREE.Sprite(material);
    
    // Calculate position - center the text
    const lines = this.currentText.split('\n');
    const lineIndex = this.currentText.substring(0, index).split('\n').length - 1;
    
    // Find position of this character in current line
    const lineStart = this.currentText.lastIndexOf('\n', index - 1) + 1;
    const charInLine = index - lineStart;
    
    const x = (charInLine - this.getLongestLineLength(lines) / 2) * this.letterSpacing;
    // First line starts higher, each subsequent line is below
    const y = isMobile 
      ? -lineIndex * this.lineHeight + 30  // Offset first line up by 30
      : -lineIndex * this.lineHeight;
    
    // Larger letters
    sprite.position.set(x, y, 0);
    sprite.scale.set(22, 30, 1); // Larger letters
    
    this.verseGroup.add(sprite);
    this.sprites.push(sprite);
    
    // Animate in
    this.animateSpriteIn(sprite, material);
  }
  
  // Get length of longest line for centering
  private getLongestLineLength(lines: string[]): number {
    return Math.max(...lines.map(l => l.length));
  }
  
  // Simple fade-in animation (no complex loops that could block)
  private animateSpriteIn(sprite: THREE.Sprite, material: THREE.SpriteMaterial) {
    const startTime = performance.now();
    const duration = isMobile ? 100 : 80;
    
    const animate = () => {
      // Stop animation if verse was cleared
      if (!this.isAnimating) {
        material.opacity = 0;
        return;
      }
      
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      
      // Simple ease out
      const ease = 1 - Math.pow(1 - t, 2);
      material.opacity = ease * 0.9;
      
      const scale = 16 * (1 + (1 - ease) * 0.2);
      sprite.scale.set(scale, scale * 1.4, 1);
      
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // Continuous floating animation for all sprites
  private animateFloating() {
    if (!this.isAnimating || this.sprites.length === 0) return;
    
    const time = performance.now() * 0.001;
    this.sprites.forEach((sprite, i) => {
      const offset = i * 0.1;
      sprite.position.y += Math.sin(time + offset) * 0.2;
    });
    
    requestAnimationFrame(() => this.animateFloating());
  }
  
  // Create texture for character - higher quality on mobile
  private createTexture(char: string): THREE.Texture {
    const size = this.textureSize;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size * this.fontSize}px "Crimson Pro", Georgia, serif`;
    ctx.shadowColor = 'rgba(200, 180, 255, 0.8)';
    ctx.shadowBlur = size * 0.12;
    ctx.fillText(char, size / 2, size / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }
  
  private finishAnimation() {
    this.isAnimating = false;
    
    // Auto-hide after delay
    setTimeout(() => {
      if (!this.isAnimating) {
        this.clear();
      }
    }, 5000);
  }
  
  // Clear all sprites
  clear() {
    this.sprites.forEach(sprite => {
      this.verseGroup.remove(sprite);
      sprite.material.dispose();
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
    });
    this.sprites = [];
    this.verseGroup.visible = false;
    this.currentText = '';
  }
  
  // Update to face camera - also process pending animation
  update(camera: THREE.Camera) {
    // Only process if there's pending text
    if (this.pendingText) {
      // Stop any existing animation first
      this.isAnimating = false;
      
      // Small delay to let old animation clean up
      setTimeout(() => {
        this.processPendingAnimation();
      }, 50);
    }
    
    if (this.verseGroup.visible && this.sprites.length > 0) {
      this.verseGroup.lookAt(camera.position);
    }
  }
  
  getIsAnimating(): boolean {
    return this.isAnimating;
  }
}