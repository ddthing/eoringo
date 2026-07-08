import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--color-card) / <alpha-value>)",
          soft: "rgb(var(--color-card-soft) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          soft: "rgb(var(--color-primary-soft) / <alpha-value>)",
        },
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        sky: "rgb(var(--color-sky) / <alpha-value>)",
        peach: "rgb(var(--color-peach) / <alpha-value>)",
        lavender: "rgb(var(--color-lavender) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--color-brand) / <alpha-value>)",
          soft: "rgb(var(--color-brand-soft) / <alpha-value>)",
        },
      },
      boxShadow: {
        soft: "0 2px 8px rgb(188 143 167 / 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
