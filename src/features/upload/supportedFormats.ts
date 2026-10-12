/**
 * الصيغ المستهدفة حسب قسم "الملفات المدعومة" في المواصفة.
 * تسمية "مستهدفة" لا "مدعومة" مقصودة: التحقق الفعلي من عمل كل صيغة
 * يحدث لاحقًا مع Media Engine + Speech Engine (Session القادمة)،
 * ولا يجوز الوعد بدعم صيغة قبل اختبارها فعليًا.
 */

export const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "mkv",
  "webm",
  "m4v",
  "avi",
] as const;

export const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "m4a",
  "aac",
  "flac",
  "ogg",
  "opus",
  "weba", // WebM Audio
] as const;

export type MediaKind = "video" | "audio";

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
}

export function detectMediaKind(filename: string): MediaKind | null {
  const ext = getExtension(filename);
  if ((VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return "video";
  if ((AUDIO_EXTENSIONS as readonly string[]).includes(ext)) return "audio";
  return null;
}
