import type { PerformanceMode } from "@/models/speech";

/**
 * نماذج Whisper متعددة اللغات (وليست نسخ .en الإنجليزية فقط) — ضروري
 * لدعم العربية. الحجم يزيد كثيرًا مع الجودة، فالاختيار هنا مسؤولية
 * المستخدم حسب قوة جهازه، لا قرار تلقائي.
 */
export const MODEL_BY_PERFORMANCE: Record<PerformanceMode, string> = {
  fast: "Xenova/whisper-tiny",
  balanced: "Xenova/whisper-base",
  "high-quality": "Xenova/whisper-small",
};

export const MODEL_SIZE_HINT: Record<PerformanceMode, string> = {
  fast: "أسرع، دقة أقل (~75 ميجا تحميل أول مرة)",
  balanced: "توازن جيد (~145 ميجا تحميل أول مرة)",
  "high-quality": "أدق، أبطأ كثيرًا — قد لا يناسب الأجهزة الضعيفة (~250 ميجا)",
};
