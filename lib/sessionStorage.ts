import type { Session } from "./types";

const KEY = "gift-concierge-sessions";
const MAX = 20;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveSession(session: Session): void {
  if (!isBrowser()) return;
  try {
    const all = listSessions().filter((s) => s.id !== session.id);
    const updated = [session, ...all].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // localStorage quota exceeded or unavailable — fail silently
  }
}

export function loadSession(id: string): Session | null {
  if (!isBrowser()) return null;
  return listSessions().find((s) => s.id === id) ?? null;
}

export function listSessions(): Session[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return parsed.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export function deleteSession(id: string): void {
  if (!isBrowser()) return;
  try {
    const updated = listSessions().filter((s) => s.id !== id);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // fail silently
  }
}
