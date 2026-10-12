export type PerformanceMode = "fast" | "balanced" | "high-quality";

export interface TranscriptionProgress {
  stage: "loading-model" | "transcribing";
  /** 0 إلى 1، أو -1 إن كانت النسبة غير معروفة (بعض مراحل التحميل لا تُبلّغ نسبة) */
  ratio: number;
  detail?: string;
}

export interface TranscriptionOptions {
  performanceMode: PerformanceMode;
  /** رمز لغة مثل "arabic"، أو "auto" لاكتشاف تلقائي */
  language: string;
  task: "transcribe" | "translate";
}
