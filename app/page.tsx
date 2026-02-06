"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CountrySelect } from "@/components/CountrySelect";
import { cn } from "@/lib/utils";
import { countries, type Country } from "@/lib/countries";
import { STORAGE_KEYS, safeSetLocalStorageItem } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPhone = window.localStorage.getItem(STORAGE_KEYS.phone);
    const storedCountry = window.localStorage.getItem(STORAGE_KEYS.country);
    if (storedCountry) {
      const c = countries.find((x) => x.code === storedCountry) ?? null;
      setCountry(c);
    }
    if (!storedPhone) return;
    const digits = storedPhone.replace(/\D/g, "");
    if (digits.length === 10) {
      setPhone(digits);
      return;
    }
    if (digits.length > 10) {
      const localNumber = digits.slice(-10);
      const dialCodeDigits = digits.slice(0, -10);
      setPhone(localNumber);
      const c = countries.find(
        (x) => x.dialCode.replace(/\D/g, "") === dialCodeDigits
      );
      if (c) setCountry(c);
    }
  }, []);

  const formattedPhone = useMemo(() => {
    if (!phone || phone.length !== 10) return "";
    const grouped = phone.replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3");
    return country ? `${country.dialCode} ${grouped}` : grouped;
  }, [phone, country]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "").slice(0, 10);
    if (digits.length !== 10 || !country) return;
    safeSetLocalStorageItem(STORAGE_KEYS.phone, digits);
    safeSetLocalStorageItem(STORAGE_KEYS.country, country.code);
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-dvh overflow-hidden text-[color:var(--text-soft)]">
      <video
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-40"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/cinematic-orbit.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(0,0,0,0.8),transparent_55%),radial-gradient(circle_at_100%_0%,rgba(0,0,0,0.8),transparent_60%),linear-gradient(180deg,rgba(3,4,10,0.95),rgba(3,3,8,0.98))]" />

      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-10 md:px-6">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-[color:var(--accent)]">
              ConnectionOS
            </div>
            <h1 className="mt-1 text-2xl text-[color:var(--text-soft)] md:text-3xl">
              Neon Voice Console
            </h1>
          </div>
          {formattedPhone && (
            <div className="hidden rounded-full border border-white/10 bg-[color:var(--surface-0)]/80 px-4 py-1.5 text-xs text-[color:var(--text-muted)] md:block">
              Last linked <span className="text-[color:var(--text-soft)]">{formattedPhone}</span>
            </div>
          )}
        </header>

        <main className="cinematic-section flex flex-1 items-center">
            <div className="surface-card mx-auto flex w-full max-w-xl flex-col gap-6 px-5 py-6 md:px-7 md:py-8">
            <div>
              <h2 className="text-sm uppercase tracking-[0.32em] text-[color:var(--text-muted)]">
                Link your line
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-soft)]/85">
                Jack a number into the console. Every call stays wired to this deck until you cut the line.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
                <CountrySelect value={country} onChange={setCountry} />
                <div className="field-shell">
                  <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                    Phone number
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setPhone(digits);
                      }}
                      placeholder="9876543210"
                      className="mt-1 bg-transparent text-sm text-[color:var(--text-soft)] outline-none placeholder:text-[color:var(--text-muted)]"
                    />
                  </label>
                </div>
              </div>

                <button
                type="submit"
                className={cn(
                  "btn-primary w-full md:w-auto",
                  (phone.replace(/\D/g, "").length !== 10 || !country) && "opacity-60"
                )}
                disabled={phone.replace(/\D/g, "").length !== 10 || !country}
              >
                Enter voice deck
              </button>

              <p className="text-xs text-[color:var(--text-muted)]">
                No verification. No codes. This is a local binding only.
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

