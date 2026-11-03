export type ColorThemeId = 'gold' | 'blue' | 'emerald' | 'crimson' | 'violet' | 'cyan';

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
  gold: string;      // Color acento medio / principal
  goldHi: string;    // Color acento iluminado / highlights
  bronze: string;    // Color base oscuro / tercer extremo del degradado
  gradient: string;  // Vista previa CSS
}

export const COLOR_THEMES: Record<ColorThemeId, ColorTheme> = {
  gold: {
    id: 'gold',
    name: 'Oro y Bronce (Predeterminado)',
    description: 'Tonos dorados, ámbar y bronce cálido.',
    gold: '#e0a93b',
    goldHi: '#f7cf56',
    bronze: '#aa5a18',
    gradient: 'linear-gradient(100deg, #f7cf56, #e0a93b 50%, #aa5a18)',
  },
  blue: {
    id: 'blue',
    name: 'Azul Eléctrico & Océano',
    description: 'Degradado azul celeste brillante, azul eléctrico y azul marino profundo.',
    gold: '#3b82f6',
    goldHi: '#60a5fa',
    bronze: '#1e3a8a',
    gradient: 'linear-gradient(100deg, #60a5fa, #3b82f6 50%, #1e3a8a)',
  },
  emerald: {
    id: 'emerald',
    name: 'Verde Esmeralda',
    description: 'Tonos menta brillante, esmeralda y verde bosque intenso.',
    gold: '#10b981',
    goldHi: '#34d399',
    bronze: '#064e3b',
    gradient: 'linear-gradient(100deg, #34d399, #10b981 50%, #064e3b)',
  },
  crimson: {
    id: 'crimson',
    name: 'Rojo Carmesí & Fuego',
    description: 'Degradado coral brillante, rojo carmesí y granate oscuro.',
    gold: '#ef4444',
    goldHi: '#f87171',
    bronze: '#881337',
    gradient: 'linear-gradient(100deg, #f87171, #ef4444 50%, #881337)',
  },
  violet: {
    id: 'violet',
    name: 'Púrpura & Violeta Neón',
    description: 'Tonos orquídea luminosa, violeta neón e índigo noche.',
    gold: '#a855f7',
    goldHi: '#c084fc',
    bronze: '#4c1d95',
    gradient: 'linear-gradient(100deg, #c084fc, #a855f7 50%, #4c1d95)',
  },
  cyan: {
    id: 'cyan',
    name: 'Cian & Turquesa Ártico',
    description: 'Degradado cian fluorescente, turquesa marino y petróleo profundo.',
    gold: '#06b6d4',
    goldHi: '#22d3ee',
    bronze: '#164e63',
    gradient: 'linear-gradient(100deg, #22d3ee, #06b6d4 50%, #164e63)',
  },
};

export const DEFAULT_THEME: ColorThemeId = 'gold';

export function getTheme(id?: string | null): ColorTheme {
  if (id && id in COLOR_THEMES) {
    return COLOR_THEMES[id as ColorThemeId];
  }
  return COLOR_THEMES[DEFAULT_THEME];
}

/** Devuelve las variables CSS que se inyectan en el estilo inline del contenedor raíz del gimnasio */
export function getThemeStyles(id?: string | null): React.CSSProperties {
  const theme = getTheme(id);
  return {
    ['--color-gold' as string]: theme.gold,
    ['--color-gold-hi' as string]: theme.goldHi,
    ['--color-bronze' as string]: theme.bronze,
  };
}
