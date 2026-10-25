/**
 * Aura Bistro — Single source of truth for the design system.
 *
 * All colours resolve to CSS custom properties declared in `app/globals.css`.
 * Components must NEVER hardcode hex values or re-declare this palette locally.
 * If you need a new colour, add a token to globals.css first, then reference it here.
 *
 * Direction: "Sunset Garden" — a warm clay primary, sage green as the
 * second family, honey as the accent. One clay family does not carry the
 * whole product; the three families each have a job:
 *
 *   clay   — the brand, and the primary action
 *   sage   — the second family: the served role, the natural, the calm
 *   honey  — the accent: warmth, highlights, decorative light
 *
 * Honey is a *fill* colour, not a text colour. At its palette value it
 * reaches only 2.54:1 on cream, so text always uses `accentText`
 * (honey-dark, 6.28:1) instead. Same rule for sage: `secondaryText` is the
 * text-safe depth (6.97:1), `secondary` is the fill (4.22:1).
 *
 * The third honey depth, `accentDeep`, exists for the opposite problem:
 * white text ON a honey fill. White on `accent` is only 2.74:1, so any
 * honey-filled button, badge or gradient behind white text uses
 * `accentDeep` (8.4:1) instead.
 *
 * The same shape applies to clay: `primaryText` (clay-dark, 6.91:1) for
 * text, `primary` (4.22:1) for fills that carry no text.
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

  // ---- Brand: Terracotta Clay ----
  // `primary` is a FILL colour. Text uses `primaryDark` (6.91:1 on cream);
  // `primary` itself only reaches 4.22:1.
  primary: "rgb(var(--rgb-primary))",
  primaryDark: "rgb(var(--rgb-primary-dark))",
  primaryDeep: "rgb(var(--rgb-primary-deep))",
  primaryLight: "rgb(var(--rgb-primary-light))",
  primaryGlow: "rgba(184, 92, 56, 0.35)",
  primaryText: "rgb(var(--rgb-primary-dark))",

  // ---- Secondary: Sage Green ----
  // `secondary` is a FILL colour. Text uses `secondaryText` (sage-dark),
  // which clears 6.97:1 on cream; `secondary` itself only reaches 4.22:1.
  secondary: "rgb(var(--rgb-secondary))",
  secondaryDark: "rgb(var(--rgb-secondary-dark))",
  secondaryLight: "rgb(var(--rgb-secondary-light))",
  secondaryText: "rgb(var(--rgb-secondary-dark))",

  // ---- Accent: Honey ----
  // `accent` is a FILL colour (2.54:1 on cream — never use it for text).
  // `accentText` is the text-safe depth (6.28:1 on cream, 4.76:1 on the
  // honey tint), and `accentDeep` is for white text ON a honey fill
  // (white on `accent` is only 2.74:1, so a honey button needs this
  // deeper honey behind it).
  accent: "rgb(var(--rgb-accent))",
  accentDark: "rgb(var(--rgb-accent-dark))",
  accentDeep: "rgb(var(--rgb-accent-deep))",
  accentLight: "rgb(var(--rgb-accent-light))",
  accentText: "rgb(var(--rgb-accent-dark))",

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
 * Role accents — one family per role, drawn from the Sunset Garden
 * palette. Each role gets its own hue rather than a different depth of the
 * same one, so the kitchen, the server and the admin read as three places
 * in one restaurant instead of three products.
 */
export const ROLE_COLORS = {
  kitchen: {
    base: "rgb(var(--rgb-primary))",
    dark: "rgb(var(--rgb-primary-dark))",
    light: "rgb(var(--rgb-primary-light))",
    on: "rgb(var(--rgb-on-primary))",
  },
  server: {
    base: "rgb(var(--rgb-secondary))",
    dark: "rgb(var(--rgb-secondary-dark))",
    light: "rgb(var(--rgb-secondary-light))",
    on: "rgb(var(--rgb-on-primary))",
  },
  admin: {
    base: "rgb(var(--rgb-accent))",
    dark: "rgb(var(--rgb-accent-dark))",
    light: "rgb(var(--rgb-accent-light))",
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
