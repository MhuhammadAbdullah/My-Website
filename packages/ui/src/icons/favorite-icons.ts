const FAVORITES_KEY = "icon-picker:favorites";

export function getFavoriteIcons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteIcon(name: string): string[] {
  if (typeof window === "undefined") return [];
  const current = getFavoriteIcons();
  const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}
