import type { Word, SubtitleCue } from "@/models/subtitle";
import { createCue } from "@/models/subtitle";

export interface SegmentationOptions {
  /** أقصى عدد أحرف في السطر الواحد */
  maxCharsPerLine: number;
  /** أقصى عدد أسطر داخل نفس الـ Cue */
  maxLines: number;
  /** أقل مدة مسموحة للـ Cue (ثواني) */
  minDuration: number;
  /** أقصى مدة مسموحة للـ Cue (ثواني) */
  maxDuration: number;
  /** أقل فاصل زمني بين Cue والذي يليه (ثواني) */
  gap: number;
}

export const DEFAULT_SEGMENTATION_OPTIONS: SegmentationOptions = {
  maxCharsPerLine: 42,
  maxLines: 2,
  minDuration: 1,
  maxDuration: 7,
  gap: 0.08,
};

// علامات توقف تُنهي الجملة وتفضَّل كنقطة تقسيم طبيعية.
const SENTENCE_ENDERS = new Set([".", "!", "؟", "?", "،", ",", "…"]);

function cueCharLimit(opts: SegmentationOptions): number {
  return opts.maxCharsPerLine * opts.maxLines;
}

/**
 * يجمّع الكلمات (بتوقيتاتها) في Cues، بحيث:
 * - لا يتجاوز أي Cue الحد الأقصى للأحرف (maxCharsPerLine * maxLines).
 * - لا يتجاوز مدة maxDuration.
 * - يُفضَّل قطع الجملة عند علامة ترقيم لا في وسطها.
 * - لا يقسم كلمة أبدًا (الوحدة الأساسية دائمًا كلمة كاملة).
 * تنفيذ min duration/gap يتم كتمريرة لاحقة عبر enforceMinDurationAndGap.
 */
export function segmentWords(
  words: Word[],
  options: Partial<SegmentationOptions> = {}
): SubtitleCue[] {
  const opts = { ...DEFAULT_SEGMENTATION_OPTIONS, ...options };
  const charLimit = cueCharLimit(opts);

  const cues: SubtitleCue[] = [];
  let buffer: Word[] = [];
  let bufferChars = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.map((w) => w.text).join(" ");
    cues.push(
      createCue({
        start: buffer[0]!.start,
        end: buffer[buffer.length - 1]!.end,
        text,
        words: buffer,
      })
    );
    buffer = [];
    bufferChars = 0;
  };

  for (const word of words) {
    const addedChars = (bufferChars > 0 ? 1 : 0) + word.text.length; // +1 للمسافة
    const wouldExceedChars = bufferChars + addedChars > charLimit;
    const wouldExceedDuration =
      buffer.length > 0 && word.end - buffer[0]!.start > opts.maxDuration;

    if (wouldExceedChars || wouldExceedDuration) {
      flush();
    }

    buffer.push(word);
    bufferChars += (bufferChars > 0 ? 1 : 0) + word.text.length;

    // القطع عند نهاية الجملة يحدث دائمًا (وليس فقط عند اقتراب الامتلاء) —
    // هذا هو المتوقع في محرر ترجمة عادي. المدة القصيرة الناتجة تُعالَج
    // لاحقًا في enforceMinDurationAndGap، لا هنا.
    const lastChar = word.text.trim().slice(-1);
    if (SENTENCE_ENDERS.has(lastChar)) {
      flush();
    }
  }
  flush();

  return enforceMinDurationAndGap(cues, opts);
}

/**
 * يضمن أن كل Cue لا يقل عن minDuration، وأن الفاصل بين Cue والذي يليه
 * لا يقل عن gap — دون أن يتجاوز أبدًا زمن بداية الـ Cue التالي.
 */
export function enforceMinDurationAndGap(
  cues: SubtitleCue[],
  options: Partial<SegmentationOptions> = {}
): SubtitleCue[] {
  const opts = { ...DEFAULT_SEGMENTATION_OPTIONS, ...options };
  const result = cues.map((c) => ({ ...c }));

  for (let i = 0; i < result.length; i++) {
    const cue = result[i]!;
    const next = result[i + 1];
    const hardLimit = next ? next.start - opts.gap : Infinity;

    const minEnd = cue.start + opts.minDuration;
    if (cue.end < minEnd) {
      cue.end = Math.min(minEnd, hardLimit);
    }
    // احترام الفاصل الأدنى مع التالي حتى لو لم يكن هناك تمديد min duration.
    if (next && cue.end > next.start - opts.gap) {
      cue.end = Math.max(cue.start, next.start - opts.gap);
    }
  }

  return result;
}
