// ============================================
// UI Controls - Event handlers
// ============================================

import type { Config } from '../types';
import { WordField } from '../systems/WordField';
import { VerseAnimationSystem } from '../systems/VerseAnimation';
import { FoamSystem } from '../systems/FoamSystem';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function setupControls(
  config: Config,
  wordField: WordField,
  foamSystem: FoamSystem,
  verseAnimation: VerseAnimationSystem,
  bloomPass: UnrealBloomPass,
  _noise: unknown,
  poems: { lines: string[]; excerpt?: string }[],
  _showVerseFn: () => void
) {
  // Ocean speed
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      config.speed = parseFloat(speedSlider.value);
    });
  }
  
  // Wave amplitude
  const waveSlider = document.getElementById('wave-slider') as HTMLInputElement;
  if (waveSlider) {
    waveSlider.addEventListener('input', () => {
      config.waveAmplitude = parseFloat(waveSlider.value);
    });
  }
  
  // Density - rebuild word field
  const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
  if (densitySlider) {
    densitySlider.addEventListener('change', () => {
      config.density = parseInt(densitySlider.value);
      wordField.create(poems, config.density);
      foamSystem.updateDensity(wordField.getWordCount());
    });
  }
  
  // Letter settings panel toggle
  const toggleLettersBtn = document.getElementById('toggle-letters');
  const letterSettings = document.getElementById('letter-settings');
  if (toggleLettersBtn && letterSettings) {
    toggleLettersBtn.addEventListener('click', () => {
      letterSettings.classList.toggle('visible');
    });
  }
  
  // Color preview
  const hueSlider = document.getElementById('letter-hue') as HTMLInputElement;
  const satSlider = document.getElementById('letter-saturation') as HTMLInputElement;
  const contrastSlider = document.getElementById('letter-contrast') as HTMLInputElement;
  const colorPreview = document.getElementById('color-preview');
  
  const updateColorPreview = () => {
    if (colorPreview) {
      const h = parseFloat(hueSlider?.value || '0.55');
      const s = parseFloat(satSlider?.value || '0.6');
      const l = parseFloat(contrastSlider?.value || '0.6');
      colorPreview.style.background = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
    }
  };
  
  if (hueSlider) {
    hueSlider.addEventListener('input', updateColorPreview);
    satSlider?.addEventListener('input', updateColorPreview);
    contrastSlider?.addEventListener('input', updateColorPreview);
    updateColorPreview();
  }
  
  // Apply letter changes
  const applyBtn = document.getElementById('apply-letter-changes');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const letterSizeInput = document.getElementById('letter-size') as HTMLInputElement;
      const letterBloomInput = document.getElementById('letter-bloom') as HTMLInputElement;
      const letterOpacityInput = document.getElementById('letter-opacity') as HTMLInputElement;
      const letterHueInput = document.getElementById('letter-hue') as HTMLInputElement;
      const letterSatInput = document.getElementById('letter-saturation') as HTMLInputElement;
      const letterContrastInput = document.getElementById('letter-contrast') as HTMLInputElement;
      
      if (letterSizeInput) config.letterSize = parseInt(letterSizeInput.value);
      if (letterBloomInput) {
        config.letterBloom = parseFloat(letterBloomInput.value);
        bloomPass.strength = config.letterBloom;
      }
      if (letterOpacityInput) config.letterOpacity = parseFloat(letterOpacityInput.value);
      if (letterHueInput) config.letterHue = parseFloat(letterHueInput.value);
      if (letterSatInput) config.letterSaturation = parseFloat(letterSatInput.value);
      if (letterContrastInput) config.letterContrast = parseFloat(letterContrastInput.value);
      
      // Apply to words
      wordField.applyAppearance({
        opacity: config.letterOpacity,
        hue: config.letterHue,
        saturation: config.letterSaturation,
        contrast: config.letterContrast,
        size: config.letterSize
      });
    });
  }
  
  // Verse position panel toggle
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
    const x = parseFloat(verseXSlider?.value || '0');
    const y = parseFloat(verseYSlider?.value || '100');
    const z = parseFloat(verseZSlider?.value || '200');
    const scale = parseFloat(verseScaleSlider?.value || '1');
    verseAnimation.setPosition(x, y, z, scale);
  };
  
  if (verseXSlider) {
    verseXSlider.addEventListener('input', updateVersePosition);
    verseYSlider?.addEventListener('input', updateVersePosition);
    verseZSlider?.addEventListener('input', updateVersePosition);
    verseScaleSlider?.addEventListener('input', updateVersePosition);
  }
}