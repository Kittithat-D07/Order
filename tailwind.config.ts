import type { Config } from "tailwindcss";

/**
 * Tailwind config — one visual language for the whole product.
 *
 * Every colour resolves to a CSS custom property declared in `app/globals.css`.
 *
 * Two rules make this work, and breaking either one silently reintroduces a
 * second visual language:
 *
 * 1. The legacy palette remap MUST live inside `theme.extend.colors`.
 *    A `stone: {...}` sibling of `colors:` is not a colour override at all —
 *    Tailwind ignores it and `bg-orange-500` keeps rendering stock orange.
 *
 * 2. Colours MUST use the `rgb(var(--rgb-token) / <alpha-value>)` form.
 *    A bare `var(--color-token)` compiles, but Tailwind cannot derive an
 *    alpha from it, so `bg-brand/10` is never emitted and silently does
 *    nothing. The `--rgb-*` channel form keeps opacity modifiers working.
 *
 * Prefer the semantic names (`brand`, `accent`, `ink`, `line`, `ok`, `bad`,
 * `warn`) in new code. The legacy names exist so existing call sites keep
 * rendering in the terracotta system.
 */

/** Builds a Tailwind colour value that supports alpha modifiers. */
const token = (name: string) => `rgb(var(--rgb-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- Semantic tokens (preferred) ----
        brand: {
          DEFAULT: token("primary"),
          dark: token("primary-dark"),
          deep: token("primary-deep"),
          light: token("primary-light"),
        },
        accent: {
          DEFAULT: token("accent"),
          dark: token("accent-dark"),
          light: token("accent-light"),
        },
        // Text colour for use ON a brand-filled surface.
        on: {
          primary: token("on-primary"),
        },
        surface: {
          DEFAULT: token("surface"),
          2: token("surface-2"),
          3: token("surface-3"),
        },
        canvas: {
          DEFAULT: token("bg"),
          2: token("bg-2"),
        },
        ink: {
          DEFAULT: token("text"),
          muted: token("text-muted"),
          soft: token("text-soft"),
        },
        line: {
          DEFAULT: token("border"),
          soft: token("border-soft"),
          strong: token("border-strong"),
        },
        ok: {
          DEFAULT: token("success"),
          light: token("success-light"),
          text: token("success-text"),
        },
        bad: {
          DEFAULT: token("danger"),
          light: token("danger-light"),
          text: token("danger-text"),
        },
        warn: {
          DEFAULT: token("warning"),
          light: token("warning-light"),
          text: token("warning-text"),
        },

        /* ============================================================
           LEGACY PALETTE REMAP
           These override Tailwind's built-in scales entirely, so every
           legacy class in the codebase resolves to the warm token system.
           This is how three visual languages collapse into one without a
           thousand-line find-and-replace.
           ============================================================ */

        // Neutral — surfaces, borders, text
        stone: {
          50: token("surface-2"),
          100: token("surface-2"),
          200: token("border"),
          300: token("border-strong"),
          400: token("text-soft"),
          500: token("text-muted"),
          600: token("text-muted"),
          700: token("text"),
          800: token("text"),
          900: token("text"),
          950: token("text"),
        },
        slate: {
          50: token("surface-2"),
          100: token("surface-2"),
          200: token("border"),
          300: token("border-strong"),
          400: token("text-soft"),
          500: token("text-muted"),
          600: token("text-muted"),
          700: token("text"),
          800: token("text"),
          900: token("text"),
          950: token("text"),
        },
        gray: {
          50: token("surface-2"),
          100: token("surface-2"),
          200: token("border"),
          300: token("border-strong"),
          400: token("text-soft"),
          500: token("text-muted"),
          600: token("text-muted"),
          700: token("text"),
          800: token("text"),
          900: token("text"),
          950: token("text"),
        },
        zinc: {
          50: token("surface-2"),
          100: token("surface-2"),
          200: token("border"),
          300: token("border-strong"),
          400: token("text-soft"),
          500: token("text-muted"),
          600: token("text-muted"),
          700: token("text"),
          800: token("text"),
          900: token("text"),
          950: token("text"),
        },

        // Terracotta — the brand family. Purple/pink/violet/indigo map here
        // too, so no surface can reintroduce a second hue.
        orange: {
          50: token("primary-light"),
          100: token("primary-light"),
          200: token("primary-light"),
          300: token("accent-light"),
          400: token("accent"),
          500: token("primary"),
          600: token("primary"),
          700: token("primary-dark"),
          800: token("primary-dark"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },
        purple: {
          50: token("primary-light"),
          100: token("primary-light"),
          200: token("primary-light"),
          300: token("accent-light"),
          400: token("accent"),
          500: token("primary"),
          600: token("primary"),
          700: token("primary-dark"),
          800: token("primary-dark"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },
        pink: {
          50: token("primary-light"),
          100: token("primary-light"),
          200: token("primary-light"),
          300: token("accent-light"),
          400: token("accent"),
          500: token("primary"),
          600: token("primary"),
          700: token("primary-dark"),
          800: token("primary-dark"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },
        violet: {
          50: token("primary-light"),
          100: token("primary-light"),
          200: token("primary-light"),
          300: token("accent-light"),
          400: token("accent"),
          500: token("primary"),
          600: token("primary"),
          700: token("primary-dark"),
          800: token("primary-dark"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },
        indigo: {
          50: token("accent-light"),
          100: token("accent-light"),
          200: token("accent-light"),
          300: token("accent"),
          400: token("accent"),
          500: token("accent"),
          600: token("accent-dark"),
          700: token("accent-dark"),
          800: token("primary-deep"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },
        blue: {
          50: token("accent-light"),
          100: token("accent-light"),
          200: token("accent-light"),
          300: token("accent"),
          400: token("accent"),
          500: token("accent"),
          600: token("accent-dark"),
          700: token("accent-dark"),
          800: token("primary-deep"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },
        cyan: {
          50: token("accent-light"),
          100: token("accent-light"),
          200: token("accent-light"),
          300: token("accent"),
          400: token("accent"),
          500: token("accent"),
          600: token("accent-dark"),
          700: token("accent-dark"),
          800: token("primary-deep"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },
        sky: {
          50: token("accent-light"),
          100: token("accent-light"),
          200: token("accent-light"),
          300: token("accent"),
          400: token("accent"),
          500: token("accent"),
          600: token("accent-dark"),
          700: token("accent-dark"),
          800: token("primary-deep"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },

        // Honey — reserved for "waiting / needs attention"
        amber: {
          50: token("warning-light"),
          100: token("warning-light"),
          200: token("warning-light"),
          300: token("warning"),
          400: token("warning"),
          500: token("warning"),
          600: token("warning-text"),
          700: token("warning-text"),
          800: token("warning-text"),
          900: token("warning-text"),
          950: token("warning-text"),
        },
        yellow: {
          50: token("warning-light"),
          100: token("warning-light"),
          200: token("warning-light"),
          300: token("warning"),
          400: token("warning"),
          500: token("warning"),
          600: token("warning-text"),
          700: token("warning-text"),
          800: token("warning-text"),
          900: token("warning-text"),
          950: token("warning-text"),
        },

        // Sage — reserved for "done / served" (success only)
        green: {
          50: token("success-light"),
          100: token("success-light"),
          200: token("success-light"),
          300: token("success"),
          400: token("success"),
          500: token("success"),
          600: token("success-text"),
          700: token("success-text"),
          800: token("success-text"),
          900: token("success-text"),
          950: token("success-text"),
        },
        emerald: {
          50: token("success-light"),
          100: token("success-light"),
          200: token("success-light"),
          300: token("success"),
          400: token("success"),
          500: token("success"),
          600: token("success-text"),
          700: token("success-text"),
          800: token("success-text"),
          900: token("success-text"),
          950: token("success-text"),
        },
        teal: {
          50: token("success-light"),
          100: token("success-light"),
          200: token("success-light"),
          300: token("success"),
          400: token("success"),
          500: token("success"),
          600: token("success-text"),
          700: token("success-text"),
          800: token("success-text"),
          900: token("success-text"),
          950: token("success-text"),
        },
        lime: {
          50: token("success-light"),
          100: token("success-light"),
          200: token("success-light"),
          300: token("success"),
          400: token("success"),
          500: token("success"),
          600: token("success-text"),
          700: token("success-text"),
          800: token("success-text"),
          900: token("success-text"),
          950: token("success-text"),
        },
        fuchsia: {
          50: token("accent-light"),
          100: token("accent-light"),
          200: token("accent-light"),
          300: token("accent"),
          400: token("accent"),
          500: token("accent"),
          600: token("accent-dark"),
          700: token("accent-dark"),
          800: token("primary-deep"),
          900: token("primary-deep"),
          950: token("primary-deep"),
        },

        // Clay-red — reserved for danger / cancelled
        red: {
          50: token("danger-light"),
          100: token("danger-light"),
          200: token("danger-light"),
          300: token("danger"),
          400: token("danger"),
          500: token("danger"),
          600: token("danger-text"),
          700: token("danger-text"),
          800: token("danger-text"),
          900: token("danger-text"),
          950: token("danger-text"),
        },
        rose: {
          50: token("danger-light"),
          100: token("danger-light"),
          200: token("danger-light"),
          300: token("danger"),
          400: token("danger"),
          500: token("danger"),
          600: token("danger-text"),
          700: token("danger-text"),
          800: token("danger-text"),
          900: token("danger-text"),
          950: token("danger-text"),
        },
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Playfair Display", "serif"],
        heading: ["Playfair Display", "serif"],
        body: ["Prompt", "system-ui", "sans-serif"],
      },
      borderRadius: {
        organic: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
