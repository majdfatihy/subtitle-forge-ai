import type { MediaKind } from "@/features/upload/supportedFormats";
import type { MediaMetadata } from "@/models/media";

/**
 * نقرأ المدة/الأبعاد عبر <video>/<audio> بدل FFmpeg عمدًا: المتصفح يملك
 * هذه المعلومة فعليًا بمجرد فك ترويسة الملف، فاستدعاء FFmpeg (تحميل ~30
 * ميجا wasm) لمجرد قراءة المدة تبذير غير مبرر.
 */
export function readMetadata(
  file: File,
  kind: MediaKind
): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind === "video" ? "video" : "audio");
    el.preload = "metadata";
    el.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    el.onloadedmetadata = () => {
      const metadata: MediaMetadata = {
        kind,
        durationSeconds: el.duration,
        ...(kind === "video" && el instanceof HTMLVideoElement
          ? { width: el.videoWidth, height: el.videoHeight }
          : {}),
      };
      cleanup();
      resolve(metadata);
    };

    el.onerror = () => {
      cleanup();
      reject(
        new Error(
          "تعذّرت قراءة بيانات الملف — قد يكون تالفًا أو بترميز لا يدعمه هذا المتصفح."
        )
      );
    };
  });
}
