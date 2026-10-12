import { detectMediaKind, type MediaKind } from "./supportedFormats";
import { formatBytes } from "@/utils/formatBytes";

export type ValidationErrorCode = "unsupported-format" | "empty-file";

export interface ValidationError {
  code: ValidationErrorCode;
  title: string;
  message: string;
}

export interface ValidationWarning {
  code: "large-file";
  message: string;
}

export type ValidationResult =
  | { ok: true; kind: MediaKind; warning?: ValidationWarning }
  | { ok: false; error: ValidationError };

// تحذير فقط (وليس منعًا) — القرار النهائي للمستخدم، حسب مبدأ
// "لا تمنع المستخدم إلا إذا كان هناك سبب تقني حقيقي".
const LARGE_FILE_WARNING_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 جيجابايت

export function validateFile(file: File): ValidationResult {
  if (file.size === 0) {
    return {
      ok: false,
      error: {
        code: "empty-file",
        title: "الملف فارغ",
        message: `"${file.name}" لا يحتوي بيانات قابلة للمعالجة.`,
      },
    };
  }

  const kind = detectMediaKind(file.name);
  if (!kind) {
    return {
      ok: false,
      error: {
        code: "unsupported-format",
        title: "صيغة غير مدعومة",
        message: `صيغة الملف "${file.name}" غير مدعومة حاليًا. جرّب ملف فيديو أو صوت بصيغة شائعة (MP4, MOV, MP3, WAV...).`,
      },
    };
  }

  if (file.size > LARGE_FILE_WARNING_BYTES) {
    return {
      ok: true,
      kind,
      warning: {
        code: "large-file",
        message: `حجم الملف ${formatBytes(
          file.size
        )} — قد تستغرق المعالجة وقتًا أطول أو تفشل على أجهزة ضعيفة الذاكرة.`,
      },
    };
  }

  return { ok: true, kind };
}
