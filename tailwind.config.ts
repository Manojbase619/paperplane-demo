import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg0: "#f5f5f7",
        bg1: "#ffffff",
        surface0: "#ececef",
        surface1: "#f8f9fa",
        surface2: "#ffffff",
        accent: "#6C3EE8",
        "accent-hover": "#5a32c4",
        "accent-strong": "#5a32c4",
        textSoft: "#1a1a1e",
        textMuted: "#6b7280",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(108,62,232,.2), 0 24px 60px rgba(0,0,0,.12)",
        glowActive: "0 0 0 1px rgba(108,62,232,.35), 0 32px 80px rgba(0,0,0,.18)",
      },
    },
  },
} satisfies Config;

