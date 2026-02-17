"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { getCurrentUser, setCurrentUser, type StoredUser } from "@/lib/storage";

const INDIA = { code: "IN", dialCode: "+91", name: "India", flag: "🇮🇳", phoneDigits: 10 } as const;
const PHONE_DIGITS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginMode = "phone" | "email";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("phone");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [invalidShake, setInvalidShake] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const user = getCurrentUser();
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      if (user.countryCode === INDIA.code && user.phone) {
        const full = user.phone.replace(/\D/g, "");
        const national = full.slice(full.length - PHONE_DIGITS);
        setPhone(national);
      }
      setRememberMe(user.rememberMe);
    }
  }, []);

  const phoneDigitsOnly = phone.replace(/\D/g, "");
  const phoneValid = phoneDigitsOnly.length === PHONE_DIGITS;
  const emailValid = EMAIL_REGEX.test(email.trim());

  const canSubmit = mode === "phone" ? phoneValid : emailValid;

  function formatPhoneDisplay(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, PHONE_DIGITS);
    if (d.length > 3) return d.slice(0, 3) + " " + d.slice(3, 6) + (d.length > 6 ? " " + d.slice(6) : "");
    return d;
  }

  function handlePhoneInput(value: string) {
    setPhone(value.replace(/\D/g, "").slice(0, PHONE_DIGITS));
    setInvalidShake(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "phone") {
      if (!phoneValid) {
        setInvalidShake(true);
        return;
      }
      const fullPhone = `${INDIA.dialCode} ${formatPhoneDisplay(phone).trim()}`.trim();
      const user: StoredUser = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: fullPhone,
        countryCode: INDIA.code,
        rememberMe,
      };
      setCurrentUser(user);
    } else {
      if (!emailValid) {
        setInvalidShake(true);
        return;
      }
      const user: StoredUser = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: "",
        countryCode: INDIA.code,
        rememberMe,
      };
      setCurrentUser(user);
    }
    router.push("/console/dashboard");
  }

  const [nameOnly, setNameOnly] = useState("");
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    const first = (u.firstName || "").trim();
    const last = (u.lastName || "").trim();
    if (first || last) setNameOnly([first, last].filter(Boolean).join(" "));
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[var(--bg0)] text-[var(--text-soft)]">
      {/* Subtle gradient orbs — light, Eleven Labs / Hume style */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--accent)]/[0.06] blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-[var(--accent)]/[0.05] blur-3xl"
          animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6 sm:px-6 sm:py-10">
        <motion.header
          className="mb-6 flex shrink-0 items-center justify-between gap-3 sm:mb-8"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Basethesis
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-soft)] sm:text-2xl">
              Voice Console
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            {nameOnly && (
              <div className="hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-muted)] sm:block">
                <span className="text-[var(--text-soft)]">{nameOnly}</span>
              </div>
            )}
          </div>
        </motion.header>

        <main className="flex flex-1 flex-col items-center justify-center pb-8">
          <motion.div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/95 p-6 shadow-lg shadow-black/[0.03] backdrop-blur-sm sm:p-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <motion.div variants={container} initial="hidden" animate="show">
              <motion.h2
                variants={item}
                className="text-sm font-medium uppercase tracking-widest text-[var(--text-muted)]"
              >
                Sign in
              </motion.h2>
              <motion.p variants={item} className="mt-2 text-sm text-[var(--text-muted)]">
                Use your India phone number or email. No verification codes.
              </motion.p>

              {/* Tabs: Phone | Email */}
              <motion.div
                variants={item}
                className="mt-6 flex rounded-xl bg-[var(--surface-0)] p-1"
              >
                <button
                  type="button"
                  onClick={() => { setMode("phone"); setInvalidShake(false); }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                    mode === "phone"
                      ? "bg-[var(--surface-2)] text-[var(--text-soft)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-soft)]"
                  )}
                >
                  <Phone className="h-4 w-4" />
                  Phone
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("email"); setInvalidShake(false); }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                    mode === "email"
                      ? "bg-[var(--surface-2)] text-[var(--text-soft)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-soft)]"
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
              </motion.div>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <AnimatePresence mode="wait">
                  {mode === "phone" ? (
                    <motion.div
                      key="phone"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "rounded-xl border bg-[var(--surface-0)] px-4 py-3 transition-all duration-200",
                        phoneValid ? "border-emerald-500/40 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]" : "border-[var(--border)]",
                        invalidShake && "input-shake border-red-500/50"
                      )}
                    >
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        India mobile number
                      </label>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-medium text-[var(--text-muted)] shrink-0">
                          {INDIA.flag} {INDIA.dialCode}
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={formatPhoneDisplay(phone)}
                          onChange={(e) => handlePhoneInput(e.target.value)}
                          placeholder="98765 43210"
                          maxLength={PHONE_DIGITS + 2}
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-soft)] outline-none placeholder:text-[var(--text-muted)]"
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="email"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "rounded-xl border bg-[var(--surface-0)] px-4 py-3 transition-all duration-200",
                        emailValid ? "border-emerald-500/40 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]" : "border-[var(--border)]",
                        invalidShake && "input-shake border-red-500/50"
                      )}
                    >
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        Email address
                      </label>
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setInvalidShake(false); }}
                        placeholder="you@company.com"
                        className="mt-1 w-full bg-transparent text-sm font-medium text-[var(--text-soft)] outline-none placeholder:text-[var(--text-muted)]"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={item} className="flex flex-col gap-3 pt-2">
                  <motion.button
                    type="submit"
                    disabled={!canSubmit}
                    className={cn(
                      "w-full min-h-[44px] rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 touch-manipulation",
                      canSubmit
                        ? "bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20 hover:opacity-95 active:scale-[0.99]"
                        : "cursor-not-allowed bg-[var(--surface-0)] text-[var(--text-muted)]"
                    )}
                    whileHover={canSubmit ? { scale: 1.01 } : undefined}
                    whileTap={canSubmit ? { scale: 0.99 } : undefined}
                  >
                    Get started
                  </motion.button>
                  <label className="flex cursor-pointer items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--accent)]"
                    />
                    Remember me
                  </label>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
