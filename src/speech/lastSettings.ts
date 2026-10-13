import type { ProviderId } from "./cloudEngines";

const KEY = "subtitleforge:last-settings";

interface LastSettings {
  provider: ProviderId;
  model: string;
  language: string;
}

export function getLastSettings(): LastSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastSettings) : null;
  } catch {
    return null;
  }
}

export function setLastSettings(settings: LastSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // تجاهل — ليس خطأ فادحًا.
  }
}
