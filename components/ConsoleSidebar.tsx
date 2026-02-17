"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Settings,
  PhoneCall,
  Menu,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser, getDisplayName } from "@/lib/storage";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/console/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/console/prompt-generator", label: "Basethesis Agent", icon: Sparkles },
  { href: "/console/settings", label: "Settings", icon: Settings },
  { href: "/dashboard", label: "Voice deck", icon: PhoneCall },
] as const;

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 min-h-[44px] items-center",
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
    </>
  );
}

export function ConsoleSidebar() {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setDisplayName(getDisplayName(getCurrentUser()));
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <>
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
      <NavContent onNavigate={() => setMobileOpen(false)} />
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
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-4 z-20 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-soft)] shadow-sm touch-manipulation md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          aria-hidden
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Wrapper: takes width on desktop so flex layout is correct */}
      <div className="w-0 shrink-0 md:w-[260px]">
        {/* Sidebar: drawer on mobile, in-flow on desktop */}
        <aside
          className={cn(
            "flex h-dvh flex-col border-r border-[color:var(--border)] bg-[color:var(--surface-0)]/95 backdrop-blur-md transition-transform duration-300 ease-out",
            "w-[260px]",
            "fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0 md:inset-auto",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="absolute right-3 top-4 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-soft)] touch-manipulation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
