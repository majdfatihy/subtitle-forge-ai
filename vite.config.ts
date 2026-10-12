import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// قرار مُعدَّل: أعدنا رؤوس COOP/COEP بعد اختبار فعلي أظهر أن غيابها كان
// يمنع محرك التفريغ الصوتي (onnxruntime-web) من استخدام أكثر من نواة
// معالج واحدة (WASM threads تحتاج SharedArrayBuffer، وهذا يحتاج عزل
// Cross-Origin كامل). التفريغ كان يأخذ 20-30 دقيقة لملف 64 ثانية بمعالج
// واحد — غير مقبول. الخطوط الآن تُحمَّل عبر crossorigin="anonymous" في
// index.html حتى لا تنكسر تحت COEP (Google Fonts يرسل رؤوس CORS صحيحة).
// نواة FFmpeg أحادية الخيط لا تتأثر بوجود هذه الرؤوس أو غيابها.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // استثناء مكتبة FFmpeg من التجهيز المسبق (pre-bundling) الخاص بـ Vite:
  // هذه المكتبة تفتح Web Worker داخليًا بطريقة (new URL(...,import.meta.url))
  // تتعارض مع esbuild الذي يستخدمه Vite في هذه الخطوة، فيبقى طلب الـ worker
  // "Pending" للأبد دون أي خطأ ظاهر. هذا إصلاح موثَّق لنفس المشكلة تحديدًا
  // في تكامل ffmpeg.wasm + Vite.
  optimizeDeps: {
    // ملاحظة: @xenova/transformers استُثنيت هنا في محاولة أولى، لكن ده
    // كسر آلية التوافق الداخلية لمكتبة onnxruntime-web (خطأ
    // "registerBackend on undefined") — على عكس FFmpeg، هذه المكتبة تحتاج
    // pre-bundling الخاص بـ Vite (esbuild) فعليًا حتى يعمل تحويل CJS/ESM
    // الداخلي بشكل صحيح. الاستثناء هنا يبقى لـ FFmpeg فقط.
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  // host: true يخلي سيرفر التطوير متاحًا على شبكة الواي فاي المحلية
  // (مش على localhost فقط) — لازم عشان تفتحه من الموبايل وهو شغّال
  // على الكمبيوتر، طالما الاثنين على نفس الشبكة.
  server: {
    host: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  worker: {
    format: "es",
  },
});
