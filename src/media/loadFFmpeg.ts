import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// نفس أصل الموقع (public/ffmpeg) — انظر scripts/copy-ffmpeg-core.mjs.
const CORE_BASE_PATH = "/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;

// نتجنّب الاعتماد على إزالة المستمعين (ffmpeg.off) لعدم توفّرها بثبات عبر
// كل إصدارات المكتبة؛ بدلًا من ذلك نمرّر التقدّم عبر مرجع واحد قابل للتبديل
// يضبطه كل استدعاء قبل تنفيذه ويعيده null بعدها.
let currentProgressHandler: ((ratio: number) => void) | null = null;

export function setProgressHandler(handler: ((ratio: number) => void) | null) {
  currentProgressHandler = handler;
}

/**
 * يحمّل نواة FFmpeg (WebAssembly) مرة واحدة فقط طوال عمر الصفحة، وفقط عند
 * أول طلب معالجة فعلي (Lazy Loading) — لا يُحمَّل عند فتح الصفحة الرئيسية.
 */
export function loadFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      console.log("[MediaEngine] إنشاء نسخة FFmpeg...");
      const ffmpeg = new FFmpeg();

      ffmpeg.on("log", ({ message }) => {
        console.log("[ffmpeg]", message);
      });

      ffmpeg.on("progress", ({ progress }) => {
        // progress قد تتجاوز 1 قليلًا أو تكون سالبة لحظيًا حسب نوع العملية —
        // نحصرها هنا حتى لا تنكسر أي واجهة شريط تقدّم تعتمد عليها.
        const clamped = Math.min(1, Math.max(0, progress));
        currentProgressHandler?.(clamped);
      });

      console.log("[MediaEngine] تجهيز روابط النواة (coreURL/wasmURL)...");
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE_BASE_PATH}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${CORE_BASE_PATH}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      console.log("[MediaEngine] روابط النواة جاهزة، بدء ffmpeg.load()...");

      await ffmpeg.load({ coreURL, wasmURL });
      console.log("[MediaEngine] ffmpeg.load() اكتمل بنجاح ✅");
      return ffmpeg;
    })().catch((err) => {
      console.error("[MediaEngine] فشل تحميل FFmpeg:", err);
      // نسمح بمحاولة تحميل جديدة لاحقًا بدل تجميد الفشل للأبد على نفس الجلسة.
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}
