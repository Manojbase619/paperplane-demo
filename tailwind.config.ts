import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg0: "#0B0B0E",
        bg1: "#0F1115",
        surface0: "#13151A",
        surface1: "#16181D",
        surface2: "#1C1F26",
        accent: "#FF7A18",
        "accent-strong": "#FF3D00",
        textSoft: "#D0D1D6",
        textMuted: "#888B94",
      },
      boxShadow: {
        glow:
          "0 0 0 1px rgba(255,122,24,.16), 0 28px 90px rgba(0,0,0,.9)",
        glowActive:
          "0 0 0 1px rgba(255,122,24,.22), 0 32px 110px rgba(0,0,0,1)",
      },
    },
  },
} satisfies Config;

