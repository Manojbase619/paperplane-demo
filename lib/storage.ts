export const STORAGE_KEYS = {
  phone: "paperplane:phone",
  user: "basethesis:user",
} as const;

export type StoredUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // full: dial code + national number
  countryCode: string;
  rememberMe: boolean;
};

export function safeGetLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetLocalStorageItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function safeGetSessionStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetSessionStorageItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getCurrentUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = safeGetSessionStorageItem(STORAGE_KEYS.user) ?? safeGetLocalStorageItem(STORAGE_KEYS.user);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "phone" in parsed && typeof (parsed as StoredUser).phone === "string") {
      return parsed as StoredUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: StoredUser) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(user);
  if (user.rememberMe) {
    safeSetLocalStorageItem(STORAGE_KEYS.user, raw);
    safeSetSessionStorageItem(STORAGE_KEYS.user, raw);
    safeSetLocalStorageItem(STORAGE_KEYS.phone, user.phone);
  } else {
    safeSetSessionStorageItem(STORAGE_KEYS.user, raw);
    try {
      window.localStorage.removeItem(STORAGE_KEYS.user);
      window.localStorage.removeItem(STORAGE_KEYS.phone);
    } catch {
      // ignore
    }
  }
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEYS.user);
    window.localStorage.removeItem(STORAGE_KEYS.user);
    window.localStorage.removeItem(STORAGE_KEYS.phone);
  } catch {
    // ignore
  }
}

/** Display name for UI: "First Last" or "First" or phone */
export function getDisplayName(user: StoredUser | null): string {
  if (!user) return "";
  const first = (user.firstName || "").trim();
  const last = (user.lastName || "").trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return user.phone || "";
}