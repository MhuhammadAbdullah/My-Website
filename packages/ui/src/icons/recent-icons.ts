const RECENTS_KEY = "icon-picker:recent";
const MAX_RECENTS = 24;

export function getRecentIcons(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentIcon(name: string): string[] {
  if (typeof window === "undefined") return [];
  const next = [name, ...getRecentIcons().filter((n) => n !== name)].slice(0, MAX_RECENTS);
  window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  return next;
}
