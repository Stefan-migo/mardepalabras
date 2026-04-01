# Plan de Refactorización - Mar de Palabras

**Fecha:** 2026-04-01  
**Proyecto:** Mar de Palabras - Three.js Poetry Visualization  
**Repositorio:** https://github.com/Stefan-migo/mardepalabras

---

## 1. Diagnóstico del Estado Actual

### 1.1 Métricas del Código
- **Líneas de código:** ~1274 líneas (single file)
- **Modularización:** 0% - todo en un solo archivo `main.ts`
- **Dependencias:** Three.js, Pretext (no utilizado), Vite
- **Problemas identificados:**
  - Lag en animación de versos 3D
  - Rendering lento con 1500 palabras
  - Código spaghetti con clases mezcladas

### 1.2 Problemas de Performance
| Problema | Causa | Impacto |
|----------|-------|---------|
| Lag general | Cálculos por frame en loop anidado | Alto |
| Animación entrecortada | Creación de sprites durante typing | Alto |
| Memoria excesiva | Texturas sin dispose adecuado | Medio |
| Bloom costoso | Post-processing sin optimization | Medio |

---

## 2. Objetivos de la Refactorización

### 2.1 Objetivos Principales
1. **Modularizar** - Separar en múltiples archivos (< 300 líneas cada uno)
2. **Optimizar performance** - Reducir cálculos por frame
3. **Integrar Pretext** - Medición de texto sin DOM
4. **Suavizar animación** - Eliminar lag en versos 3D

### 2.2 Métricas Objetivo
- Reducir líneas por archivo a máximo 300
- Lograr 60 FPS con 1000 palabras
- Animación de verso fluida (sin lag)

---

## 3. Arquitectura Propuesta

### 3.1 Estructura de Archivos

```
src/
├── main.ts              # Entry point, configuración inicial
├── core/
│   ├── Scene.ts         # Configuración Three.js scene, camera, renderer
│   └── PostProcessing.ts # Composer, bloom pass
├── systems/
│   ├── WordField.ts    # Sistema de palabras flotantes
│   ├── FoamSystem.ts   # Partículas de espuma
│   ├── VerseAnimation.ts # Animación de versos 3D
│   └── Physics.ts      # Ondas, ripples, mouse interaction
├── utils/
│   ├── Noise.ts        # Simplex noise
│   ├── TextRenderer.ts # Pretext integration
│   └── Resources.ts    # Texture cache, memory management
├── ui/
│   └── Controls.ts     # UI event handlers
└── types.ts            # Interfaces y tipos
```

### 3.2 Diagrama de Dependencias

```
main.ts
  ├── Scene.ts (exporta scene, camera, renderer, composer)
  ├── WordField.ts (depende de: TextRenderer, Physics)
  ├── FoamSystem.ts (depende de: Noise)
  ├── VerseAnimation.ts (depende de: TextRenderer)
  ├── Controls.ts (depende de: todos los sistemas)
  │
  └── types.ts (interfaces compartidas)
```

---

## 4. Plan de Implementación

### Fase 1: Infraestructura (Día 1)
- [ ] Crear estructura de directorios
- [ ] Mover tipos a `types.ts`
- [ ] Crear `Scene.ts` - inicialización Three.js
- [ ] Crear `Noise.ts` - noise functions

### Fase 2: Sistemas Core (Día 2)
- [ ] Crear `TextRenderer.ts` con Pretext
- [ ] Refactorizar `WordField.ts` - palabras flotantes
- [ ] Refactorizar `FoamSystem.ts` - partículas

### Fase 3: Animación y Physics (Día 3)
- [ ] Crear `Physics.ts` - ondas, ripples, mouse
- [ ] Corregir `VerseAnimation.ts` - Fix lag
- [ ] Optimizar loop de animación

### Fase 4: UI y Testing (Día 4)
- [ ] Crear `Controls.ts` - event handlers
- [ ] Integrar todo en `main.ts`
- [ ] Testing y fixes

---

## 5. Optimizaciones Específicas

### 5.1 Performance del Loop de Animación

**Problema actual:**
```typescript
// Cada palabra, cada letra - muchos cálculos
words.forEach(wordData => {
  sprites.forEach((sprite, i) => {
    const letterWave = noise.noise2D(...) // CARO
    sprite.position.y = baseY + waveHeight + letterWave...
  });
});
```

**Solución propuesta:**
```typescript
// Pre-calcular por palabra (no por letra)
const waveHeight = noise.oceanWaves(baseX, baseZ, time, amp);
// Aplicar a todas las letras de la palabra
sprites.forEach(sprite => {
  sprite.position.y = baseOffset + Math.sin(i) * factor; // Más barato
});
```

### 5.2 Animación de Verso - Fix Lag

**Problema actual:**
- Crear sprites dentro del loop de typing
- Cada `addCharSprite` llama a `letterRenderer.createLetterTexture()`
- Sin pooling de sprites

**Solución propuesta:**
- Pre-crear pool de sprites para el verso
- Reutilizar sprites entre animaciones
- Usar `requestAnimationFrame` con timing controlado
- Considerar usar `InstancedMesh` para muchas letras

### 5.3 Integración de Pretext

```typescript
import * as Pretext from '@chenglou/pretext';

const pretext = Pretext.create({
  fontFamily: 'Crimson Pro',
  fontSize: 48,
  fontWeight: 'bold'
});

// Preparar texto una vez (cached)
const layout = pretext.layout(verseText);

// Obtener posiciones sin tocar DOM
const positions = layout.graphemes.map(g => ({
  x: g.x,
  y: g.y
}));
```

---

## 6. Checklist de Éxito

- [ ] Cada archivo < 300 líneas
- [ ] No hay funciones > 50 líneas
- [ ] Todas las dependencias son explícitas
- [ ] 60 FPS con 1000 palabras en laptop
- [ ] Animación de verso fluida (no lag)
- [ ] Tests compilan sin errores

---

## 7. Notas Adicionales

- Usar `readonly` donde sea posible
- Evitar `any` - usar tipos específicos
- Documentar funciones complejas
- Mantener backwards compatibility con la API actual

---

*Documento creado para guía de refactorización*