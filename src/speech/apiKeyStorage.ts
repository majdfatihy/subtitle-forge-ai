import type { ProviderId } from "./cloudEngines";

const PREFIX = "subtitleforge:api-key:";

export function getStoredKey(provider: ProviderId): string {
  try { return window.localStorage.getItem(PREFIX + provider) ?? ""; }
  catch { return ""; }
}

export function setStoredKey(provider: ProviderId, key: string): void {
  try {
    key ? localStorage.setItem(PREFIX + provider, key)
        : localStorage.removeItem(PREFIX + provider);
  } catch { /* تجاهل */ }
}
