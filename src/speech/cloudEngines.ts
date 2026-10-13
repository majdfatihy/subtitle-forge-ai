/**
 * محركات التفريغ السحابية — كل منصة ترسل الصوت المُستخرَج فقط (ليس الفيديو)
 * مباشرة من المتصفح بدون أي خادم وسيط تابع لهذا المشروع.
 */

import type { Word } from "@/models/subtitle";
import type { TranscriptionResult } from "./SpeechEngine";

export type ProviderId = "groq" | "deepgram" | "assemblyai";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  description: string;
  freeNote: string;
  signupUrl: string;
  keyPlaceholder: string;
  models: ModelOption[];
}

export interface ModelOption {
  value: string;
  label: string;
}

export interface CloudTranscribeOptions {
  provider: ProviderId;
  apiKey: string;
  model: string;
  language: string; // ISO 639-1 أو "auto"
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "groq",
    name: "Groq",
    description: "Whisper Large-v3 — دقة عالية مع العربية",
    freeNote: "مجاني — ~8 ساعة/يوم، بدون بطاقة ائتمان",
    signupUrl: "https://console.groq.com/keys",
    keyPlaceholder: "gsk_...",
    models: [
      { value: "whisper-large-v3-turbo", label: "Turbo (أسرع)" },
      { value: "whisper-large-v3", label: "Large v3 (الأدق)" },
    ],
  },
  {
    id: "deepgram",
    name: "Deepgram",
    description: "Nova-3 — أسرع معالجة، $200 كريدت مجاني",
    freeNote: "مجاني — $200 كريدت (~46,000 دقيقة)، بدون بطاقة ائتمان",
    signupUrl: "https://console.deepgram.com/signup",
    keyPlaceholder: "Token هنا...",
    models: [
      // Nova-2 لا يدعم العربية رسميًا (رسالة Deepgram نفسها توجّه لـ Nova-3
      // عند اختيار ar) — حُذف من القائمة لتفادي خطأ 400 متكرر.
      { value: "nova-3", label: "Nova-3 (الأدق)" },
    ],
  },
  {
    id: "assemblyai",
    name: "AssemblyAI",
    description: "Universal-3.5 Pro — $50 كريدت مجاني (~185 ساعة)",
    freeNote: "مجاني — $50 كريدت (~185 ساعة)، بدون بطاقة ائتمان",
    signupUrl: "https://www.assemblyai.com/dashboard/signup",
    keyPlaceholder: "API Key هنا...",
    models: [
      { value: "universal-3-5-pro", label: "Universal-3.5 Pro (الأدق)" },
      { value: "universal-2", label: "Universal-2 (الأسرع)" },
    ],
  },
];

// ============================================================
// Groq
// ============================================================

async function transcribeGroq(
  blob: Blob,
  opts: CloudTranscribeOptions
): Promise<TranscriptionResult> {
  const form = new FormData();
  form.append("file", blob, "audio.wav");
  form.append("model", opts.model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  if (opts.language !== "auto") form.append("language", opts.language);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}` },
    body: form,
  });
  if (!res.ok) throw await makeError(res, "Groq");

  const data = await res.json();
  return {
    language: data.language ?? opts.language,
    words: parseWordTimestamps(data.words ?? []),
  };
}

// ============================================================
// Deepgram
// ============================================================

async function transcribeDeepgram(
  blob: Blob,
  opts: CloudTranscribeOptions
): Promise<TranscriptionResult> {
  const params = new URLSearchParams({
    model: opts.model,
    punctuate: "true",
    smart_format: "true",
  });

  // بدون تحديد صريح، Deepgram تفترض الإنجليزية افتراضيًا (موثَّق رسميًا) —
  // "اكتشاف تلقائي" لازم تفعيل detect_language صراحة، وإلا تُفرَّغ صوت
  // عربي بافتراض إنجليزي فيخرج نص شبه فارغ رغم ظهور "اكتمل" بنجاح.
  if (opts.language === "auto") {
    params.set("detect_language", "true");
  } else {
    params.set("language", opts.language);
  }

  const res = await fetch(
    `https://api.deepgram.com/v1/listen?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${opts.apiKey}`,
        "Content-Type": blob.type || "audio/wav",
      },
      body: blob,
    }
  );
  if (!res.ok) throw await makeError(res, "Deepgram");

  const data = await res.json();
  const channel = data?.results?.channels?.[0]?.alternatives?.[0];
  const rawWords = (channel?.words ?? []) as Array<{
    word: string;
    start: number;
    end: number;
  }>;
  return {
    language: data?.metadata?.detected_language ?? opts.language,
    words: parseWordTimestamps(rawWords),
  };
}

// ============================================================
// AssemblyAI  (upload → transcript → poll)
// ============================================================

async function transcribeAssemblyAI(
  blob: Blob,
  opts: CloudTranscribeOptions
): Promise<TranscriptionResult> {
  const headers = {
    Authorization: opts.apiKey,
    "Content-Type": "application/json",
  };

  const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: { Authorization: opts.apiKey, "Content-Type": blob.type || "audio/wav" },
    body: blob,
  });
  if (!uploadRes.ok) throw await makeError(uploadRes, "AssemblyAI (upload)");
  const { upload_url } = await uploadRes.json();

  const body: Record<string, unknown> = {
    audio_url: upload_url,
    speech_models: [opts.model],
    format_text: true,
  };
  // نفس منطق Deepgram — بدون تفعيل صريح، AssemblyAI لا تكتشف اللغة تلقائيًا.
  if (opts.language === "auto") {
    body.language_detection = true;
  } else {
    body.language_code = opts.language;
  }

  const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!transcriptRes.ok) throw await makeError(transcriptRes, "AssemblyAI (transcript)");
  const { id } = await transcriptRes.json();

  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { Authorization: opts.apiKey },
    });
    if (!pollRes.ok) throw await makeError(pollRes, "AssemblyAI (poll)");
    const result = await pollRes.json();

    if (result.status === "completed") {
      const rawWords = (result.words ?? []) as Array<{
        text: string;
        start: number;
        end: number;
      }>;
      return {
        language: result.language_code ?? opts.language,
        words: rawWords
          .map((w) => ({
            text: String(w.text ?? "").trim(),
            start: w.start / 1000,
            end: w.end / 1000,
          }))
          .filter((w) => w.text.length > 0 && w.end > w.start),
      };
    }
    if (result.status === "error") {
      throw new Error(`فشل التفريغ على AssemblyAI: ${result.error ?? "خطأ غير معروف"}`);
    }
  }
  throw new Error("تجاوز وقت الانتظار على AssemblyAI — حاول مرة أخرى.");
}

// ============================================================
// الدالة الرئيسية — موزّع
// ============================================================

export async function transcribeCloud(
  blob: Blob,
  opts: CloudTranscribeOptions
): Promise<TranscriptionResult> {
  if (!opts.apiKey.trim()) {
    throw new Error("أدخل مفتاح API أولًا.");
  }
  try {
    switch (opts.provider) {
      case "groq":       return await transcribeGroq(blob, opts);
      case "deepgram":   return await transcribeDeepgram(blob, opts);
      case "assemblyai": return await transcribeAssemblyAI(blob, opts);
      default: throw new Error(`مزوّد غير مدعوم: ${opts.provider}`);
    }
  } catch (err) {
    if (err instanceof TypeError && String(err.message).includes("fetch")) {
      throw new Error(
        "تعذّر الوصول للخادم — تأكّد من اتصال الإنترنت. " +
        "(لو الإنترنت شغّال، قد تكون مشكلة CORS مؤقتة — جرّب مرة أخرى.)"
      );
    }
    throw err;
  }
}

// ============================================================
// مساعدات
// ============================================================

function parseWordTimestamps(
  raw: Array<{ word?: string; text?: string; start: number; end: number }>
): Word[] {
  return raw
    .map((w): Word => ({
      text: String(w.word ?? w.text ?? "").trim(),
      start: w.start,
      end: w.end,
    }))
    .filter((w) => w.text.length > 0 && w.end > w.start);
}

async function makeError(res: Response, provider: string): Promise<Error> {
  let msg = `فشل طلب ${provider} (HTTP ${res.status})`;
  if (res.status === 401) msg = `مفتاح API غير صحيح أو منتهي الصلاحية (${provider}).`;
  if (res.status === 413) msg = `الملف أكبر من الحد المسموح (${provider}).`;
  if (res.status === 429) msg = `تجاوزت الحد المجاني اليومي (${provider}) — حاول لاحقًا.`;
  try {
    const json = await res.json();
    const detail =
      json?.error?.message ?? json?.err_msg ?? json?.error ?? json?.message;
    if (detail) msg = `${msg} — ${String(detail)}`;
  } catch {
    // تجاهل — استخدم الرسالة الافتراضية فقط
  }
  return new Error(msg);
}
