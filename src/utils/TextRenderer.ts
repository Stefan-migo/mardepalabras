// ============================================
// Text Renderer - Using Pretext for fast text measurement
// ============================================

import * as THREE from 'three';
import * as Pretext from '@chenglou/pretext';

export class TextRenderer {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private preparedTexts: Map<string, Pretext.PreparedText> = new Map();
  private font: string = 'bold 48px "Crimson Pro", Georgia, serif';
  private fontSize: number = 64;
  
  constructor() {
    // Pre-generate common letter textures
    const commonChars = 'abcdefghijklmnopqrstuvwxyzáéíóúüñABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.pregenerateTextures(commonChars, 64);
  }
  
  // Prepare text with Pretext (cached)
  prepareText(text: string): Pretext.PreparedText {
    if (this.preparedTexts.has(text)) {
      return this.preparedTexts.get(text)!;
    }
    const prepared = Pretext.prepare(text, this.font);
    this.preparedTexts.set(text, prepared);
    return prepared;
  }
  
  // Get text layout using Pretext (much faster than DOM)
  measureText(text: string, maxWidth: number = 500, lineHeight: number = 1.2): Pretext.LayoutResult {
    const prepared = this.prepareText(text);
    return Pretext.layout(prepared, maxWidth, lineHeight);
  }
  
  // Create texture for a single character
  createLetterTexture(char: string, size: number = 64): THREE.Texture {
    const cacheKey = `${char}_${size}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Clear and set styles
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size * 0.6}px "Crimson Pro", Georgia, serif`;
    
    // Subtle glow effect
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
  
  // Create sprite material for a letter
  createLetterMaterial(color: THREE.Color, opacity: number): THREE.SpriteMaterial {
    return new THREE.SpriteMaterial({
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
      color: color
    });
  }
  
  // Pre-generate textures for common characters
  pregenerateTextures(chars: string, size: number = 64) {
    for (const char of chars) {
      this.createLetterTexture(char, size);
    }
  }
  
  // Clear cache to free memory
  clearCache() {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    this.preparedTexts.clear();
    Pretext.clearCache();
  }
  
  // Update font
  setFont(font: string) {
    this.font = font;
    this.preparedTexts.clear();
  }
  
  // Get font size
  getFontSize(): number {
    return this.fontSize;
  }
}