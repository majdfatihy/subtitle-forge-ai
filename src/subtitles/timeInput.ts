/** 72.5 -> "1:12.50" */
export function formatTimeInput(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
}

/** "1:12.50" | "72.5" -> 72.5 | null لو غير صالح */
export function parseTimeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":");
    const minutes = Number(m);
    const seconds = Number(s);
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
    return minutes * 60 + seconds;
  }
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}
