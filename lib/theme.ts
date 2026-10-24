/**
 * Aura Bistro — Single source of truth for the design system.
 *
 * All colours resolve to CSS custom properties declared in `app/globals.css`.
 * Components must NEVER hardcode hex values or re-declare this palette locally.
 * If you need a new colour, add a token to globals.css first, then reference it here.
 *
 * Direction: "Bold Terracotta" — a single warm clay family carries the whole
 * product. Sage and honey survive only as semantic status colours (success /
 * warning), never as decorative accents.
 *
 * Colours use the `rgb(var(--rgb-token) / <alpha>)` channel form so inline
 * styles can express transparency — `COLORS.primary + "40"` never worked
 * because a `var()` string cannot carry an alpha suffix.
 */

/** A token usable directly in CSS, with an optional alpha channel. */
export type Token = string;

/** Build a CSS colour with an explicit alpha (0–1). */
export function alpha(token: Token, value: number): string {
  return `rgb(var(--rgb-${token}) / ${value})`;
}

export const COLORS = {
  // ---- Surfaces ----
  bg: "rgb(var(--rgb-bg))",
  bg2: "rgb(var(--rgb-bg-2))",
  surface: "rgb(var(--rgb-surface))",
  surface2: "rgb(var(--rgb-surface-2))",
  surface3: "rgb(var(--rgb-surface-3))",

  // ---- Brand: Terracotta ----
  primary: "rgb(var(--rgb-primary))",
  primaryDark: "rgb(var(--rgb-primary-dark))",
  primaryDeep: "rgb(var(--rgb-primary-deep))",
  primaryLight: "rgb(var(--rgb-primary-light))",
  primaryGlow: "rgba(168, 72, 42, 0.35)",

  // ---- Accent: hot clay (contrast-safe for text) ----
  accent: "rgb(var(--rgb-accent))",
  accentDark: "rgb(var(--rgb-accent-dark))",
  accentLight: "rgb(var(--rgb-accent-light))",

  // ---- Secondary: warm mid-tone (kept for surfaces that need a second
  //      family member — e.g. the "served" state on a warm background) ----
  secondary: "rgb(var(--rgb-accent))",
  secondaryDark: "rgb(var(--rgb-accent-dark))",
  secondaryLight: "rgb(var(--rgb-accent-light))",

  // ---- Text ----
  text: "rgb(var(--rgb-text))",
  textMuted: "rgb(var(--rgb-text-muted))",
  textSoft: "rgb(var(--rgb-text-soft))",
  onPrimary: "rgb(var(--rgb-on-primary))",

  // ---- Lines ----
  border: "rgb(var(--rgb-border))",
  borderSoft: "rgb(var(--rgb-border-soft))",
  borderStrong: "rgb(var(--rgb-border-strong))",

  // ---- Semantic (status only) ----
  success: "rgb(var(--rgb-success))",
  successLight: "rgb(var(--rgb-success-light))",
  successText: "rgb(var(--rgb-success-text))",
  danger: "rgb(var(--rgb-danger))",
  dangerLight: "rgb(var(--rgb-danger-light))",
  dangerText: "rgb(var(--rgb-danger-text))",
  warning: "rgb(var(--rgb-warning))",
  warningLight: "rgb(var(--rgb-warning-light))",
  warningText: "rgb(var(--rgb-warning-text))",
} as const;

/**
 * Role accents — derived from the terracotta family, never stock hues.
 * Each role gets a distinct *depth* of the same hue rather than a different hue,
 * so the product reads as one world while navigation stays legible.
 */
export const ROLE_COLORS = {
  kitchen: {
    base: "rgb(var(--rgb-primary))",
    dark: "rgb(var(--rgb-primary-dark))",
    light: "rgb(var(--rgb-primary-light))",
    on: "rgb(var(--rgb-on-primary))",
  },
  server: {
    base: "rgb(var(--rgb-accent))",
    dark: "rgb(var(--rgb-accent-dark))",
    light: "rgb(var(--rgb-accent-light))",
    on: "rgb(var(--rgb-on-primary))",
  },
  admin: {
    base: "rgb(var(--rgb-primary-deep))",
    dark: "rgb(var(--rgb-primary-deep))",
    light: "rgb(var(--rgb-primary-light))",
    on: "rgb(var(--rgb-on-primary))",
  },
} as const;

/** Thai food emoji vocabulary — no pizza/burger/taco in a Thai kitchen. */
export const FOOD_EMOJIS = [
  "🍜",
  "🍲",
  "🥘",
  "🍛",
  "🥗",
  "🍝",
  "🍱",
  "🍤",
  "🥢",
  "🌶️",
] as const;

/** Category → emoji. Matched on explicit keywords, in priority order. */
const CATEGORY_EMOJI_RULES: Array<[RegExp, string]> = [
  [/(แนะนำ|signature|พิเศษ|ของดี)/i, "✨"],
  [/(ก๋วยเตี๋ยว|noodle|เตี๋ยว)/i, "🍜"],
  [/(ข้าว|rice|จานเดียว)/i, "🍚"],
  [/(ยำ|salad|สลัด)/i, "🥗"],
  [/(ต้ม|ซุป|soup|แกง)/i, "🍲"],
  [/(ทอด|fried|ปิ้ง|grill|ย่าง)/i, "🍤"],
  [/(เครื่องดื่ม|drink|น้ำ|กาแฟ|coffee|ชา|tea|โซดา)/i, "🍵"],
  [/(ของหวาน|dessert|หวาน|เบเกอรี)/i, "🍰"],
  [/(ผัด|stir.?fry)/i, "🥘"],
];

/**
 * Resolve a category emoji from its name.
 * Falls back to a neutral bowl rather than a guess, so an admin-created
 * category never renders as a random food.
 */
export function categoryEmoji(name: string): string {
  for (const [pattern, emoji] of CATEGORY_EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return "🍽️";
}

/**
 * Format a price as Thai baht without a currency symbol.
 * Callers add the "฿" themselves so the symbol appears exactly once.
 */
export function baht(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

/** Format a price with the baht symbol, ready to render. */
export function price(value: number | string): string {
  return `฿${baht(value)}`;
}
