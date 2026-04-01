// ============================================
// Foam Particle System - Optimized for performance
// ============================================

import * as THREE from 'three';

export class FoamSystem {
  private particles: THREE.Points;
  private positions: Float32Array;
  private basePositions: Float32Array;
  private particleCount: number;
  private activeCount: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private scene: THREE.Scene;
  
  constructor(scene: THREE.Scene, maxParticles: number = 5000) {
    this.scene = scene;
    this.particleCount = maxParticles;
    this.activeCount = maxParticles;
    
    // Initialize arrays
    this.positions = new Float32Array(maxParticles * 3);
    this.basePositions = new Float32Array(maxParticles * 3);
    
    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, maxParticles);
    
    // Optimized material
    this.material = new THREE.PointsMaterial({
      color: 0x88aaff,
      size: 1.2,
      transparent: true,
      opacity: 0.25,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(this.geometry, this.material);
    this.initializeParticles();
    scene.add(this.particles);
  }
  
  private initializeParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = (Math.random() - 0.5) * 2000;
      this.positions[i3 + 1] = Math.random() * 20 - 10;
      this.positions[i3 + 2] = (Math.random() - 0.5) * 2000;
      
      this.basePositions[i3] = this.positions[i3];
      this.basePositions[i3 + 1] = this.positions[i3 + 1];
      this.basePositions[i3 + 2] = this.positions[i3 + 2];
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
  
  // Update density based on word count
  updateDensity(wordCount: number) {
    const factor = Math.min(1, Math.max(0.2, wordCount / 1500));
    this.activeCount = Math.floor(this.particleCount * factor);
    this.material.opacity = 0.1 + factor * 0.2;
    this.geometry.setDrawRange(0, this.activeCount);
  }
  
  // Update particle positions with wave motion
  update(time: number, waveFn: (x: number, z: number) => number) {
    const sin05 = Math.sin(time * 0.5);
    const sin2 = Math.sin(time * 2);
    const cos03 = Math.cos(time * 0.3);
    
    for (let i = 0; i < this.activeCount; i++) {
      const i3 = i * 3;
      const x = this.basePositions[i3];
      const z = this.basePositions[i3 + 2];
      
      const waveY = waveFn(x * 0.008, z * 0.008) * 0.3;
      
      this.positions[i3] = x + sin05 * 2;
      this.positions[i3 + 1] = waveY + sin2;
      this.positions[i3 + 2] = z + cos03 * 2;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }
  
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.particles);
  }
  
  // Recreate with new particle count (for performance mode)
  recreate(newCount: number) {
    this.dispose();
    this.particleCount = newCount;
    this.activeCount = newCount;
    this.positions = new Float32Array(newCount * 3);
    this.basePositions = new Float32Array(newCount * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, newCount);
    this.material = new THREE.PointsMaterial({
      color: 0x88aaff,
      size: 1.2,
      transparent: true,
      opacity: 0.25,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(this.geometry, this.material);
    this.initializeParticles();
    this.scene.add(this.particles);
  }
}