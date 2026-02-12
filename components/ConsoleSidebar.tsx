"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  BarChart3,
  History,
  FileText,
  Settings,
  PhoneCall,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser, getDisplayName } from "@/lib/storage";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/console/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/console/prompt-generator", label: "Basethesis Agent", icon: Sparkles },
  { href: "/console/analytics", label: "Call Analytics", icon: BarChart3 },
  { href: "/console/history", label: "Call History", icon: History },
  { href: "/console/transcriptions", label: "Transcriptions", icon: FileText },
  { href: "/console/settings", label: "Settings", icon: Settings },
  { href: "/dashboard", label: "Voice deck", icon: PhoneCall },
] as const;

export function ConsoleSidebar() {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    setDisplayName(getDisplayName(getCurrentUser()));
  }, []);

  return (
    <aside className="flex h-dvh w-56 shrink-0 flex-col border-r border-[color:var(--border)] bg-[color:var(--surface-0)]/95 backdrop-blur-md md:w-[260px]">
      <div className="px-4 py-6 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--surface-2)] shadow-sm ring-1 ring-[color:var(--border)]/50">
            <img
              src="/Logo%20Mark.png"
              alt="Basethesis"
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) parent.classList.add("!h-0", "!w-0", "!min-w-0", "!p-0");
              }}
            />
          </span>
          <div className="min-w-0">
            <span className="block text-base font-semibold text-[color:var(--text-soft)] truncate">
              Basethesis
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
              Console
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)]/70 hover:text-[color:var(--text-soft)]",
                active &&
                  "bg-[color:var(--surface-2)] text-[color:var(--accent)] font-medium shadow-sm"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-[color:var(--accent)]" : "text-[color:var(--text-muted)]"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-[color:var(--border)] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[color:var(--text-muted)] truncate">
            {displayName ? (
              <span className="text-[color:var(--text-soft)]">{displayName}</span>
            ) : (
              "Basethesis"
            )}
          </span>
          <ThemeToggle size="sm" />
        </div>
      </div>
    </aside>
  );
}
