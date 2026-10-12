import { fetchFile } from "@ffmpeg/util";
import { loadFFmpeg, setProgressHandler } from "./loadFFmpeg";
import { readMetadata as readMetadataNative } from "./readMetadata";
import { getExtension } from "@/features/upload/supportedFormats";
import type { MediaKind } from "@/features/upload/supportedFormats";
import type { ExtractedAudio, MediaMetadata } from "@/models/media";

export { readMetadataNative as readMetadata };

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `تجاوزت خطوة "${label}" الوقت المتوقع (${Math.round(
            ms / 1000
          )} ثانية) دون استجابة — هذا يشير غالبًا لمشكلة تكامل بين FFmpeg وVite، راجع Console.`
        )
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * يستخرج الصوت من ملف فيديو (أو يعيد ترميز ملف صوت) إلى WAV أحادي القناة
 * بمعدل 16kHz — وهو التنسيق المفضَّل لمحركات التفريغ الصوتي (Session 4/5)،
 * وليس اختيارًا اعتباطيًا.
 */
export async function extractAudio(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<ExtractedAudio> {
  const ffmpeg = await withTimeout(loadFFmpeg(), 40_000, "تحميل محرك FFmpeg");

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const ext = getExtension(file.name) || "bin";
  const inputName = `in_${id}.${ext}`;
  const outputName = `out_${id}.wav`;

  setProgressHandler(onProgress ?? null);

  try {
    console.log("[MediaEngine] كتابة الملف داخل نظام ملفات FFmpeg الوهمي...");
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    console.log("[MediaEngine] بدء exec (الاستخراج الفعلي)...");

    await withTimeout(
      ffmpeg.exec([
        "-i",
        inputName,
        "-vn", // إسقاط الفيديو — نريد الصوت فقط
        "-ac",
        "1", // قناة واحدة (mono)
        "-ar",
        "16000", // 16kHz
        "-acodec",
        "pcm_s16le",
        outputName,
      ]),
      60_000,
      "تنفيذ استخراج الصوت (exec)"
    );
    console.log("[MediaEngine] exec اكتمل ✅، قراءة الناتج...");

    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const blob = new Blob([new Uint8Array(bytes)], { type: "audio/wav" });
    console.log("[MediaEngine] الاستخراج اكتمل ✅، حجم الناتج:", blob.size, "بايت");

    return { blob, sampleRate: 16000, channels: 1 };
  } finally {
    setProgressHandler(null);
    // تنظيف نظام الملفات الوهمي — لا نريد تراكم الملفات مع كل عملية.
    await safeDelete(ffmpeg, inputName);
    await safeDelete(ffmpeg, outputName);
  }
}

async function safeDelete(
  ffmpeg: Awaited<ReturnType<typeof loadFFmpeg>>,
  name: string
) {
  try {
    await ffmpeg.deleteFile(name);
  } catch {
    // لا شيء نفعله — الملف قد يكون غير موجود أصلًا إن فشلت خطوة سابقة.
  }
}

/**
 * معاينة سريعة للملف كما هو (بدون أي تحويل) — تعمل مباشرة إن كان المتصفح
 * يدعم فك الترميز أصلًا (وهو الغالب لصيغ MP4/WebM/MP3 الشائعة)، فلا داعي
 * لاستدعاء FFmpeg لمجرد المعاينة.
 */
export function createPreview(file: File): string {
  return URL.createObjectURL(file);
}

export function revokePreview(url: string): void {
  URL.revokeObjectURL(url);
}

export type { MediaMetadata, MediaKind };
