"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  size?: "sm" | "md";
};

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-[color:var(--border)] transition-colors",
        "hover:bg-[color:var(--surface-0)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-2 focus:ring-offset-[color:var(--bg0)]",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-9 w-9",
        className
      )}
    >
      {isDark ? (
        <Sun className={size === "sm" ? "h-4 w-4 text-[color:var(--text-soft)]" : "h-5 w-5 text-[color:var(--text-soft)]"} />
      ) : (
        <Moon className={size === "sm" ? "h-4 w-4 text-[color:var(--text-muted)]" : "h-5 w-5 text-[color:var(--text-muted)]"} />
      )}
    </button>
  );
}
