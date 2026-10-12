import type { Word } from "@/models/subtitle";
import type { TranscriptionResult } from "./SpeechEngine";

export type GroqModel = "whisper-large-v3-turbo" | "whisper-large-v3";

export interface GroqTranscribeOptions {
  apiKey: string;
  model: GroqModel;
  /** رمز لغة ISO 639-1 مثل "ar"، أو "auto" لاكتشاف تلقائي (لا تُرسَل للـ API) */
  language: string;
}

interface GroqWord {
  word: string;
  start: number;
  end: number;
}

interface GroqVerboseResponse {
  text?: string;
  language?: string;
  duration?: number;
  words?: GroqWord[];
}

interface GroqErrorResponse {
  error?: { message?: string };
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";

/**
 * يرسل الصوت مباشرة من المتصفح إلى Groq (بدون خادم وسيط تابع لنا) ويرجع
 * النتيجة بنفس شكل TranscriptionResult حتى يتعامل معها باقي خط الأنابيب
 * (التقسيم/التصدير) بلا فرق عن المحرك المحلي.
 */
export async function transcribeWithGroq(
  audioBlob: Blob,
  options: GroqTranscribeOptions
): Promise<TranscriptionResult> {
  if (!options.apiKey.trim()) {
    throw new Error("مفتاح Groq API فارغ — أدخل مفتاحًا صالحًا أولًا.");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.wav");
  formData.append("model", options.model);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  if (options.language && options.language !== "auto") {
    formData.append("language", options.language);
  }

  let response: Response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}` },
      body: formData,
    });
  } catch {
    throw new Error(
      "تعذّر الوصول لخادم Groq — تأكّد من اتصال الإنترنت. (لو الإنترنت شغّال، السبب الأرجح مشكلة CORS/شبكة مؤقتة؛ جرّب مرة أخرى)."
    );
  }

  if (!response.ok) {
    let message = `فشل طلب Groq (HTTP ${response.status})`;
    if (response.status === 401) {
      message = "مفتاح Groq API غير صحيح أو منتهي — تأكّد منه في console.groq.com.";
    } else if (response.status === 413) {
      message = "الملف أكبر من الحد المسموح لخطة Groq المجانية (25 ميجابايت).";
    } else if (response.status === 429) {
      message = "تجاوزت الحد المجاني المسموح من Groq لهذا اليوم/الدقيقة — حاول لاحقًا.";
    } else {
      try {
        const errJson: GroqErrorResponse = await response.json();
        if (errJson?.error?.message) message = errJson.error.message;
      } catch {
        // تجاهل — استخدم الرسالة الافتراضية أعلاه.
      }
    }
    throw new Error(message);
  }

  const data: GroqVerboseResponse = await response.json();
  const words: Word[] = (data.words ?? [])
    .map((w): Word => ({
      text: String(w.word ?? "").trim(),
      start: w.start,
      end: w.end,
    }))
    .filter((w) => w.text.length > 0 && w.end > w.start);

  return {
    language: data.language ?? (options.language === "auto" ? "ar" : options.language),
    words,
  };
}
