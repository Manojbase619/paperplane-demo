"use client";

import { countries, type Country } from "@/lib/countries";

type Props = {
  value: Country | null;
  onChange: (country: Country) => void;
};

export function CountrySelect({ value, onChange }: Props) {
  return (
    <div className="field-shell flex items-center gap-3">
      <span className="text-2xl leading-none">
        {value?.flag ?? "🌍"}
      </span>
      <select
        className="w-full bg-transparent text-sm text-[color:var(--text-soft)] outline-none"
        value={value?.code ?? ""}
        onChange={(e) => {
          const next = countries.find((c) => c.code === e.target.value);
          if (next) onChange(next);
        }}
      >
        <option value="" disabled>
          Select country
        </option>
        {countries.map((country) => (
          <option
            key={country.code}
            value={country.code}
          >
            {country.flag} {country.name} ({country.dialCode})
          </option>
        ))}
      </select>
    </div>
  );
}

