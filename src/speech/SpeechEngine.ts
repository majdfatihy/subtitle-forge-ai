import type {
  TranscriptionOptions,
  TranscriptionProgress,
} from "@/models/speech";
import type { Word } from "@/models/subtitle";
import { MODEL_BY_PERFORMANCE } from "./models";
import { decodeAudioToFloat32 } from "./decodeAudio";
import { detectSpeechSegments } from "./detectSpeechSegments";

const SAMPLE_RATE = 16000;

let worker: Worker | null = null;
let loadedModelId: string | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/speechWorker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

function loadModel(
  modelId: string,
  onProgress?: (p: TranscriptionProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data.type === "progress") {
        onProgress?.({
          stage: "loading-model",
          ratio: data.ratio,
          detail: data.detail,
        });
      } else if (data.type === "loaded") {
        w.removeEventListener("message", handleMessage);
        loadedModelId = modelId;
        resolve();
      } else if (data.type === "error") {
        w.removeEventListener("message", handleMessage);
        reject(new Error(data.message));
      }
    };
    w.addEventListener("message", handleMessage);
    w.postMessage({ type: "load", modelId });
  });
}

export interface TranscriptionResult {
  language: string;
  words: Word[];
}

interface RawChunk {
  text?: string;
  timestamp?: [number, number | null];
}
interface RawResult {
  language?: string;
  chunks?: RawChunk[];
}

/** ينفّذ جولة تفريغ واحدة لمقطع صوت واحد عبر الـ Worker. */
function transcribeRaw(
  audio: Float32Array,
  options: TranscriptionOptions,
  onProgress?: (ratio: number) => void
): Promise<RawResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (data.type === "progress") {
        onProgress?.(data.ratio ?? -1);
      } else if (data.type === "result") {
        w.removeEventListener("message", handleMessage);
        resolve(data.result);
      } else if (data.type === "error") {
        w.removeEventListener("message", handleMessage);
        reject(new Error(data.message));
      }
    };
    w.addEventListener("message", handleMessage);
    w.postMessage({
      type: "transcribe",
      audio,
      language: options.language,
      task: options.task,
    });
  });
}

/**
 * يحوّل نتيجة خام واحدة إلى كلمات صالحة، مع إزاحة التوقيتات بمقدار
 * `timeOffset` (لازم عند تفريغ مقطع كلام مُقتطع من ملف أطول).
 */
function extractWords(result: RawResult, timeOffset = 0): Word[] {
  const chunks = result?.chunks ?? [];
  const raw: Word[] = chunks
    .map((c): Word => {
      const start = (c.timestamp?.[0] ?? 0) + timeOffset;
      // بعض تنفيذات Whisper لا تعطي توقيت نهاية للكلمة الأخيرة — نمدّها
      // بقيمة قصيرة معقولة بدل ترك undefined يكسر باقي خط الأنابيب.
      const end = (c.timestamp?.[1] ?? (c.timestamp?.[0] ?? 0) + 0.3) + timeOffset;
      return { text: String(c.text ?? "").trim(), start, end };
    })
    .filter((w) => w.text.length > 0);

  // تنظيف دفاعي: دمج الأجزاء المتداخلة (chunk_length_s/stride_length_s)
  // ينتج أحيانًا توقيتات غير منطقية (نهاية قبل البداية، أو كلمات مكررة
  // بتوقيتات متراجعة عن الكلمة السابقة) — لوحظ هذا فعليًا في اختبار حقيقي.
  const cleaned: Word[] = [];
  let lastEnd = -Infinity;
  for (const w of raw) {
    if (w.end <= w.start) continue;
    if (w.start < lastEnd - 0.05) continue; // تراجع زمني واضح عن آخر كلمة
    cleaned.push(w);
    lastEnd = w.end;
  }
  return cleaned;
}

/**
 * حاجز أخير ضد الهلوسة: يكتشف أي دورة متكررة (من كلمة واحدة لحد 4
 * كلمات، زي "يجب أن" اللي شوهدت فعليًا في اختبار حقيقي) تكررت 3 مرات
 * كاملة أو أكثر، ويُبقي أول تكرارين فقط. تجاهل التكرار البسيط الطبيعي
 * (زي "ناس ناس!" مرتين) مقصود — لا نتدخل إلا في التكرار الشديد.
 */
function collapseExcessiveRepeats(words: Word[]): Word[] {
  const MAX_PERIOD = 4;
  const MIN_CYCLES_TO_COLLAPSE = 3;
  const KEEP_CYCLES = 2;

  const norm = (w: Word) => w.text.trim().toLowerCase();
  const sameSlice = (i: number, j: number, period: number) => {
    for (let k = 0; k < period; k++) {
      if (norm(words[i + k]!) !== norm(words[j + k]!)) return false;
    }
    return true;
  };

  const result: Word[] = [];
  let i = 0;
  while (i < words.length) {
    let bestPeriod = 0;
    let bestCycles = 1;
    for (let period = 1; period <= MAX_PERIOD; period++) {
      if (i + period > words.length) break;
      let cycles = 1;
      let j = i + period;
      while (j + period <= words.length && sameSlice(i, j, period)) {
        cycles++;
        j += period;
      }
      // نفضّل أكبر تغطية إجمالية (period * cycles) بين الأنماط المرشحة.
      if (cycles >= MIN_CYCLES_TO_COLLAPSE && period * cycles > bestPeriod * bestCycles) {
        bestPeriod = period;
        bestCycles = cycles;
      }
    }

    if (bestPeriod > 0) {
      const keepCount = bestPeriod * KEEP_CYCLES;
      for (let k = 0; k < keepCount; k++) result.push(words[i + k]!);
      i += bestPeriod * bestCycles;
    } else {
      result.push(words[i]!);
      i++;
    }
  }
  return result;
}

export async function transcribe(
  audioBlob: Blob,
  options: TranscriptionOptions,
  onProgress?: (p: TranscriptionProgress) => void
): Promise<TranscriptionResult> {
  const modelId = MODEL_BY_PERFORMANCE[options.performanceMode];
  if (loadedModelId !== modelId) {
    await loadModel(modelId, onProgress);
  }

  const fullAudio = await decodeAudioToFloat32(audioBlob);

  // كشف فترات الكلام الفعلي وتجاهل فترات الصمت الطويلة — السبب
  // الموثَّق الأكبر لهلوسة Whisper (راجع نقاشات فريق Whisper وwhisper.cpp
  // الرسمية على GitHub). لو الملف كثيف بدون صمت يُرجَّع كمقطع واحد فقط
  // فلا فرق عمليًا عن السلوك القديم.
  const segments = detectSpeechSegments(fullAudio, {
    sampleRate: SAMPLE_RATE,
  });

  const allWords: Word[] = [];
  let detectedLanguage: string | undefined;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    const raw = await transcribeRaw(segment.samples, options, (ratio) => {
      // تقدّم تقريبي: كل مقطع يأخذ حصة متساوية من الشريط الكلي.
      const base = i / segments.length;
      const span = 1 / segments.length;
      const overall = ratio >= 0 ? base + span * ratio : -1;
      onProgress?.({ stage: "transcribing", ratio: overall });
    });
    if (!detectedLanguage && raw.language) detectedLanguage = raw.language;
    allWords.push(...extractWords(raw, segment.startTime));
  }

  return {
    language:
      options.language === "auto" ? detectedLanguage ?? "ar" : options.language,
    words: collapseExcessiveRepeats(allWords),
  };
}
