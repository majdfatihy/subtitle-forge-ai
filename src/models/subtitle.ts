/**
 * نموذج البيانات الموحّد للترجمة. كل صيغ الاستيراد/التصدير (SRT, VTT,
 * ASS...) تتحول من وإلى هذا النموذج — لا تتعامل معه مباشرة.
 * جميع الأوقات بالثواني (float) لتفادي التقريب المبكر؛ التحويل لصيغة
 * HH:MM:SS,mmm يحدث فقط عند التصدير (انظر subtitles/timestamps.ts).
 */

export interface Word {
  text: string;
  start: number; // ثواني
  end: number; // ثواني
}

export interface SubtitleCue {
  id: string;
  start: number; // ثواني
  end: number; // ثواني
  text: string;
  speaker?: string;
  words?: Word[];
}

export interface SubtitleTrack {
  /** رمز اللغة، مثل "ar" أو "en" */
  language: string;
  cues: SubtitleCue[];
}

export function createCueId(): string {
  return `cue_${Math.random().toString(36).slice(2, 10)}`;
}

/** يبني Cue جديد بحد أدنى من الحقول، مع توليد id تلقائيًا إن لم يُمرَّر. */
export function createCue(
  partial: Omit<SubtitleCue, "id"> & { id?: string }
): SubtitleCue {
  return { id: partial.id ?? createCueId(), ...partial };
}
