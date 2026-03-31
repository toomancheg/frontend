const KEY = "phystrainer-display-name";

export function setDisplayName(name: string) {
  if (typeof window === "undefined") return;
  const t = name.trim();
  if (t) localStorage.setItem(KEY, t);
}

export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
