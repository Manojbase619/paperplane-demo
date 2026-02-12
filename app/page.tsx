"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CountrySelect } from "@/components/CountrySelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { countries, type Country } from "@/lib/countries";
import { getCurrentUser, setCurrentUser, type StoredUser } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [invalidShake, setInvalidShake] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const user = getCurrentUser();
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      const c = countries.find((co) => co.code === user.countryCode);
      setCountry(c ?? null);
      const fullDigits = user.phone.replace(/\D/g, "");
      const dialDigits = (c?.dialCode ?? "").replace(/\D/g, "");
      const national = dialDigits ? fullDigits.slice(dialDigits.length) : fullDigits;
      setPhone(national);
      setRememberMe(user.rememberMe);
    }
  }, []);

  const phoneDigits = 10;
  const phoneDigitsOnly = phone.replace(/\D/g, "");
  const phoneValid = country && phoneDigitsOnly.length === phoneDigits;

  function formatPhoneDisplay(value: string): string {
    const d = value.replace(/\D/g, "").slice(0, phoneDigits);
    if (phoneDigits <= 10 && d.length > 3) {
      return d.slice(0, 3) + " " + d.slice(3, 6) + (d.length > 6 ? " " + d.slice(6) : "");
    }
    return d;
  }

  function handlePhoneInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, phoneDigits);
    setPhone(digits);
    setInvalidShake(false);
  }

  function handleCountryChange(c: Country) {
    setCountry(c);
    setPhone((prev) => prev.replace(/\D/g, "").slice(0, 10));
    setInvalidShake(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedPhone = phone.replace(/\D/g, "").trim();
    if (!trimmedPhone || !country || trimmedPhone.length !== phoneDigits) {
      setInvalidShake(true);
      return;
    }
    const fullPhone = `${country.dialCode} ${trimmedPhone}`.trim();
    const user: StoredUser = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: fullPhone,
      countryCode: country.code,
      rememberMe,
    };
    setCurrentUser(user);
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

  const signInSubtextClass =
    "mt-2 text-sm opacity-90 text-[color:var(--text-soft)]";
  const pageRootClass =
    "relative min-h-dvh overflow-x-hidden bg-[color:var(--bg0)] text-[color:var(--text-soft)]";
  const motionCardClass =
    "glass-card w-full max-w-md rounded-2xl border border-[color:var(--border)] p-6 shadow-xl sm:p-8";
  const transitionConfig = {
    duration: 0.5,
    ease: [0.25, 0.46, 0.45, 0.94] as const,
  };

  return (
    <div className={pageRootClass}>
      {/* Floating gradient background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(108, 62, 232, 0.25), transparent),
            radial-gradient(ellipse 60% 40% at 100% 50%, rgba(108, 62, 232, 0.12), transparent),
            radial-gradient(ellipse 60% 40% at 0% 80%, rgba(108, 62, 232, 0.1), transparent)
          `,
        }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex shrink-0 items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
              Basethesis
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[color:var(--text-soft)] sm:text-2xl">
              Voice Console
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            {nameOnly && (
              <div className="hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1.5 text-xs text-[color:var(--text-muted)] md:block">
                <span className="text-[color:var(--text-soft)]">{nameOnly}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center">
          <motion.div
            className={motionCardClass}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitionConfig}
          >
            <h2 className="text-sm font-medium uppercase tracking-widest text-[color:var(--text-muted)]">
              Sign in
            </h2>
            <p className={signInSubtextClass}>
              Enter your phone number. No verification codes.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              {/* Step 1: Country shown only once. After selection, this block is hidden. */}
              {!country ? (
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-[color:var(--text-muted)] mb-2">
                    Country
                  </label>
                  <CountrySelect value={country} onChange={handleCountryChange} />
                </div>
              ) : (
                <>
                  {/* Step 2: Only phone field; country shown once as read-only with Change link */}
                  <div
                    className={cn(
                      "rounded-xl border bg-[color:var(--surface-2)] px-4 py-3 transition-all duration-200",
                      phoneValid
                        ? "input-glow-valid border-[color:var(--cta-green)]/40"
                        : "border-[color:var(--border)]",
                      invalidShake && "input-shake border-red-500/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
                        Phone number
                      </label>
                      <button
                        type="button"
                        onClick={() => setCountry(null)}
                        className="text-[11px] font-medium text-[color:var(--accent)] hover:underline"
                      >
                        Change country
                      </button>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm font-medium text-[color:var(--text-muted)] shrink-0">
                        {country.flag} {country.dialCode}
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={formatPhoneDisplay(phone)}
                        onChange={(e) => handlePhoneInput(e.target.value)}
                        placeholder="000 000 0000"
                        maxLength={phoneDigits + 2}
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[color:var(--text-soft)] outline-none placeholder:text-[color:var(--text-muted)]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <motion.button
                  type="submit"
                  disabled={!phoneValid}
                  className={cn(
                    "w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors",
                    phoneValid
                      ? "bg-[color:var(--accent)] shadow-lg shadow-[color:var(--accent)]/25 hover:opacity-95"
                      : "cursor-not-allowed bg-[color:var(--surface-0)] text-[color:var(--text-muted)]"
                  )}
                  whileHover={phoneValid ? { scale: 1.01 } : {}}
                  whileTap={phoneValid ? { scale: 0.99 } : {}}
                >
                  Get started
                </motion.button>
                <label className="flex cursor-pointer items-center justify-center gap-2 text-xs text-[color:var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[color:var(--border)] text-[color:var(--accent)]"
                  />
                  Remember me
                </label>
              </div>
            </form>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
