// نستخدم self مباشرة بدل type مخصّص (DedicatedWorkerGlobalScope) لتفادي
// تعارض أنواع lib بين "DOM" (المستخدمة في باقي المشروع) و"webworker" —
// هذا الملف الوحيد الذي يعمل داخل Worker فعليًا.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { pipeline, env } from "@xenova/transformers";

// لا نماذج محلية مُجمَّعة مع التطبيق — كل نموذج يُحمَّل من Hugging Face Hub
// (مجانًا، بدون مفتاح API) عند أول استخدام فعلي فقط، ويُخزَّن تلقائيًا في
// Cache API الخاص بالمتصفح لما بعدها — تحميل لمرة واحدة، لا اتصال متكرر.
env.allowLocalModels = false;

// استغلال تعدد الأنوية فعليًا: onnxruntime-web يحتاج SharedArrayBuffer
// (متاح فقط مع عزل Cross-Origin الكامل، انظر vite.config.ts) ليشغّل أكثر
// من خيط معالجة واحد. بدون هذا الضبط الصريح، قد لا يستغل العزل تلقائيًا
// بالكامل حتى بعد توفره. navigator.hardwareConcurrency هو عدد الأنوية
// المنطقية المتاحة فعليًا على جهاز المستخدم.
if (typeof crossOriginIsolated !== "undefined" && crossOriginIsolated) {
  const cores =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;
  env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(cores, 8));
  console.log(
    "[speechWorker] عزل Cross-Origin متاح — تشغيل بعدد خيوط:",
    env.backends.onnx.wasm.numThreads
  );
} else {
  console.warn(
    "[speechWorker] عزل Cross-Origin غير متاح — سيعمل المحرك بخيط واحد فقط (أبطأ بكثير)."
  );
}

let currentPipeline: any = null;
let currentModelId: string | null = null;

interface LoadMessage {
  type: "load";
  modelId: string;
}
interface TranscribeMessage {
  type: "transcribe";
  audio: Float32Array;
  language: string;
  task: "transcribe" | "translate";
}
type InMessage = LoadMessage | TranscribeMessage;

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<InMessage>) => void) | null;
  postMessage: (msg: unknown) => void;
};

ctx.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === "load") {
      if (currentModelId === msg.modelId && currentPipeline) {
        ctx.postMessage({ type: "loaded" });
        return;
      }
      console.log("[speechWorker] تحميل النموذج:", msg.modelId);
      currentPipeline = await pipeline(
        "automatic-speech-recognition",
        msg.modelId,
        {
          progress_callback: (data: any) => {
            ctx.postMessage({
              type: "progress",
              stage: "loading-model",
              ratio:
                data?.progress != null ? Math.min(1, data.progress / 100) : -1,
              detail: data?.file ?? "",
            });
          },
        }
      );
      currentModelId = msg.modelId;
      console.log("[speechWorker] النموذج جاهز ✅");
      ctx.postMessage({ type: "loaded" });
      return;
    }

    if (msg.type === "transcribe") {
      if (!currentPipeline) {
        throw new Error("النموذج غير محمَّل بعد — يجب تحميله أولًا.");
      }
      console.log("[speechWorker] بدء التفريغ، عدد العيّنات:", msg.audio.length);
      const result = await currentPipeline(msg.audio, {
        language: msg.language === "auto" ? null : msg.language,
        task: msg.task,
        return_timestamps: "word",
        chunk_length_s: 30,
        stride_length_s: 5,
        // منع التكرار/التوهّم المتضخّم عبر الأجزاء الطويلة (راجع الشرح
        // في التعليق السابق) — condition_on_previous_text وحده لم يكن
        // كافيًا في أول اختبار فعلي، فأُضيف no_repeat_ngram_size كحاجز
        // إضافي صريح يمنع النموذج من توليد نفس تتابع الكلمات مرتين.
        condition_on_previous_text: false,
        no_repeat_ngram_size: 3,
      });
      console.log("[speechWorker] التفريغ اكتمل ✅");
      ctx.postMessage({ type: "result", result });
      return;
    }
  } catch (err) {
    console.error("[speechWorker] خطأ:", err);
    ctx.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

export {};
