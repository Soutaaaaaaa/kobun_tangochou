import type { Config } from "tailwindcss";

const v = (name: string) => `var(--${name})`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        "surface-2": v("surface-2"),
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        ai: v("ai"),
        "ai-soft": v("ai-soft"),
        shu: v("shu"),
        "shu-soft": v("shu-soft"),
        take: v("take"),
        "take-soft": v("take-soft"),
        c1: v("c1"),
        c2: v("c2"),
        c3: v("c3"),
        c4: v("c4"),
        c5: v("c5"),
      },
      fontFamily: {
        word: ['"Zen Old Mincho"', '"Hiragino Mincho ProN"', '"Yu Mincho"', "serif"],
        body: ['"Zen Kaku Gothic New"', '"Hiragino Sans"', '"Yu Gothic"', "system-ui", "sans-serif"],
      },
      boxShadow: { card: v("shadow") },
    },
  },
  plugins: [],
} satisfies Config;
