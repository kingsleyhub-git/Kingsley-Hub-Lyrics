export type ThemeId = "kingsley-gold" | "midnight-wave" | "ember-stage";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  bg: [string, string];
  particle: string;
  accent: string;
  sweep: string;
  waves: string[];
}

export const THEMES: Theme[] = [
  {
    id: "kingsley-gold",
    name: "Kingsley Gold",
    description: "Deep navy, drifting gold dust, royal blue waves.",
    bg: ["#0A1024", "#050813"],
    particle: "#E8B93B",
    accent: "#1E5FCB",
    sweep: "rgba(232,185,59,0.10)",
    waves: ["rgba(30,95,203,0.35)", "rgba(30,95,203,0.18)"],
  },
  {
    id: "midnight-wave",
    name: "Midnight Wave",
    description: "Cool blue depth with slow ocean motion.",
    bg: ["#04121F", "#02070E"],
    particle: "#7FC4FF",
    accent: "#1E5FCB",
    sweep: "rgba(127,196,255,0.08)",
    waves: ["rgba(20,120,220,0.38)", "rgba(20,120,220,0.16)"],
  },
  {
    id: "ember-stage",
    name: "Ember Stage",
    description: "Warm stage haze with rising embers.",
    bg: ["#1A0A08", "#0B0403"],
    particle: "#FF9A3C",
    accent: "#C4381B",
    sweep: "rgba(255,154,60,0.10)",
    waves: ["rgba(196,56,27,0.32)", "rgba(196,56,27,0.14)"],
  },
];

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? (THEMES[0] as Theme);
}

export type TextPalette = "gold" | "white" | "blue";
export type LineAnimation = "fade" | "slide" | "wipe" | "pop";
export type FontChoice = "display" | "sans" | "serif" | "mono";
export type Watermark = "none" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface StyleSettings {
  font: FontChoice;
  fontScale: number;
  textPalette: TextPalette;
  animation: LineAnimation;
  showNext: boolean;
  watermark: Watermark;
  intro: boolean;
  outro: boolean;
  uppercase: boolean;
}

export const DEFAULT_STYLE: StyleSettings = {
  font: "display",
  fontScale: 1,
  textPalette: "gold",
  animation: "slide",
  showNext: true,
  watermark: "bottom-right",
  intro: true,
  outro: true,
  uppercase: false,
};

export const FONT_STACKS: Record<FontChoice, string> = {
  display: "'Cinzel', 'Times New Roman', serif",
  sans: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  serif: "'Playfair Display', Georgia, serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};

export const TEXT_COLORS: Record<TextPalette, [string, string]> = {
  gold: ["#F7E3A1", "#D69B12"],
  white: ["#FFFFFF", "#C9D4E8"],
  blue: ["#BBD8FF", "#2E6FE0"],
};

export function mergeStyle(raw: unknown): StyleSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STYLE };
  return { ...DEFAULT_STYLE, ...(raw as Partial<StyleSettings>) };
}
