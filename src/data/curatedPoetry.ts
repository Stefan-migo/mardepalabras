// ============================================
// Curated Poetry Library - Latin American Anti-Colonial, Anarchist, Feminist
// ============================================

import type { Poem } from '../types';

// A curated collection of Latin American poetry and literature 
// from anti-colonial, anarchist, and feminist perspectives

export const curatedPoems: Poem[] = [
  // ============================================
  // POESÍA MAPUCHE Y CONTEMPORÁNEA
  // ============================================
  {
    title: 'La poesía es memoria',
    author: 'Elicura Chinhuailaf',
    lines: [
      'La poesía es el hondo susurro de los asesinados,',
      'el rumor de hojas que no alcanzaron a germinar.'
    ],
    excerpt: 'La poesía es el hondo susurro de los asesinados'
  },
  {
    title: 'Pensamiento de los ancestros',
    author: 'Elicura Chinhuailaf',
    lines: [
      'En cada uno de nosotros habita',
      'el pensamiento de nuestros mayores',
      'y de nuestros antepasados.'
    ],
    excerpt: 'En cada uno de nosotros habita el pensamiento de nuestros antepasados'
  },
  {
    title: 'Territorio cuerpo',
    author: 'Daniela Catrileo',
    lines: [
      'Escribo desde el territorio cuerpo,',
      'desde el territorio palabra,',
      'desde el territorio resistencia.'
    ],
    excerpt: 'Escribo desde el territorio cuerpo, palabra y resistencia'
  },
  {
    title: 'Duelo tras la fiesta',
    author: 'Roxana Miranda Rupailaf',
    lines: [
      'Sentirse solo es acordarse',
      'de quienes estuvieron en el duelo',
      'tras la fiesta.'
    ],
    excerpt: 'Sentirse solo es acordarse de quienes estiveram en el duelo'
  },
  {
    title: 'Pueblo de pie',
    author: 'Ana Tijoux',
    lines: [
      'No hay nada más bello',
      'que un pueblo de pie',
      'reclamando justicia.'
    ],
    excerpt: 'No hay nada más bello que un pueblo de pie reclamando justicia'
  },
  {
    title: 'Tierra lengua identidad',
    author: 'Puya',
    lines: [
      'Sin tierra no hay lengua,',
      'sin lengua no hay cultura,',
      'sin cultura no hay identidad.'
    ],
    excerpt: 'Sin tierra no hay lengua, sin cultura no hay identidad'
  },
  {
    title: 'La ley del más fuerte',
    author: 'Florencio Funes',
    lines: [
      'La ley del más fuerte',
      'es la ley del más débil',
      'multiplicada por el silencio',
      'de quienes callan.'
    ],
    excerpt: 'La ley del más fuerte es la ley del más débil multiplicada por el silencio'
  },
  {
    title: 'Río que no se represa',
    author: 'Sandra De la Torre',
    lines: [
      'Mi lengua es un río',
      'que no se deja represar,',
      'sigue fluyendo aunque',
      'intenten desviarla.'
    ],
    excerpt: 'Mi lengua es un río que no se deja represar'
  },
  {
    title: 'El Pacífico',
    author: 'Willy Gascón',
    lines: [
      'El Pacífico no es un lugar periférico,',
      'es el centro de la resistencia',
      'negra e indígena.'
    ],
    excerpt: 'El Pacífico es el centro de la resistencia negra e indígena'
  },
  {
    title: 'Escritura desde los márgenes',
    author: 'Mariana Enriquez',
    lines: [
      'Escribo desde los márgenes',
      'porque desde el centro solo se ve',
      'la sombra que el poder proyecta.'
    ],
    excerpt: 'Escribo desde los márgenes porque desde el centro solo se ve la sombra'
  },
  {
    title: 'Tierra y territorio',
    author: 'Mavi Dogan',
    lines: [
      'La tierra no se vende, se cuida;',
      'el territorio no se conmemora, se habita.'
    ],
    excerpt: 'La tierra no se vende, se cuida; el territorio se habita'
  },
  {
    title: 'Voz de las abuelas',
    author: 'Sara Curruchich',
    lines: [
      'Mi voz no es individual,',
      'es el eco de las abuelas',
      'que cantaban mientras molían el maíz.'
    ],
    excerpt: 'Mi voz es el eco de las abuelas que cantaban mientras molían el maíz'
  },
  {
    title: 'Filosofía y compromiso',
    author: 'Fernando Saldías',
    lines: [
      'La filosofía sin compromiso social',
      'es un ejercicio de vanidad intelectual.'
    ],
    excerpt: 'La filosofía sin compromiso social es vanidad intelectual'
  },
  {
    title: 'Hablo por mi diferencia',
    author: 'Pedro Lemebel',
    lines: [
      'No soy Pasolini pidiendo explicaciones,',
      'no soy Ginsberg expulsado de Cuba,',
      'soy un marica que exige ser escuchado,',
      'hablo por mi diferencia.'
    ],
    excerpt: 'Hablo por mi diferencia'
  },
  {
    title: 'Enseñar es plantar',
    author: 'Luis Villamil',
    lines: [
      'Enseñar no es transmitir conocimientos,',
      'es plantar semillas',
      'que no sabes cuándo germinarán.'
    ],
    excerpt: 'Enseñar es plantar semillas que no sabes cuándo germinarán'
  }
];

// Get random poem
export function getRandomPoem(): Poem {
  return curatedPoems[Math.floor(Math.random() * curatedPoems.length)];
}

// Get poems by category
export function getPoemsByTheme(theme: string): Poem[] {
  // Simple filter - in production would use tags
  return curatedPoems.filter(p => 
    p.author.toLowerCase().includes(theme.toLowerCase()) ||
    p.title.toLowerCase().includes(theme.toLowerCase())
  );
}