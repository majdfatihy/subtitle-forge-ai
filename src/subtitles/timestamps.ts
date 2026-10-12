/**
 * تحويلات التوقيت. القاعدة: الثواني (number) هي التمثيل الداخلي دائمًا؛
 * هذا الملف فقط يحوّلها من/إلى نصوص الصيغ المختلفة.
 */

function pad(value: number, length = 2): string {
  return String(Math.trunc(value)).padStart(length, "0");
}

interface TimeParts {
  hours: number;
  minutes: number;
  seconds: number;
  millis: number;
}

function toParts(totalSeconds: number): TimeParts {
  const safe = Math.max(0, totalSeconds);
  const totalMillis = Math.round(safe * 1000);
  const millis = totalMillis % 1000;
  const totalSecondsInt = Math.floor(totalMillis / 1000);
  const seconds = totalSecondsInt % 60;
  const totalMinutes = Math.floor(totalSecondsInt / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return { hours, minutes, seconds, millis };
}

/** 12.5 -> "00:00:12,500" (فاصلة — تنسيق SRT) */
export function secondsToSrtTime(totalSeconds: number): string {
  const { hours, minutes, seconds, millis } = toParts(totalSeconds);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/** 12.5 -> "00:00:12.500" (نقطة — تنسيق WebVTT) */
export function secondsToVttTime(totalSeconds: number): string {
  const { hours, minutes, seconds, millis } = toParts(totalSeconds);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

const TIME_RE = /^(\d+):(\d{2}):(\d{2})[.,](\d{1,3})$/;

/** يقرأ "00:00:12,500" أو "00:00:12.500" ويرجع الثواني كـ float. يرمي خطأ إن كان التنسيق غير صالح. */
export function timeToSeconds(value: string): number {
  const match = TIME_RE.exec(value.trim());
  if (!match) {
    throw new Error(`صيغة توقيت غير صالحة: "${value}"`);
  }
  const [, h, m, s, ms] = match;
  const millis = Number(ms.padEnd(3, "0"));
  return (
    Number(h) * 3600 + Number(m) * 60 + Number(s) + millis / 1000
  );
}

/** يتحقق من أن end بعد start فعليًا (ترتيب صحيح، وليس دقة التوقيت نفسها). */
export function isValidRange(start: number, end: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}
