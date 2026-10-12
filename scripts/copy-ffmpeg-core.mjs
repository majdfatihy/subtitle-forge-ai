// ينسخ نواة FFmpeg إلى public/ffmpeg بعد npm install، حتى تُخدَّم من نفس
// الأصل (same-origin) بدل الاعتماد على CDN خارجي وقت تشغيل المستخدم للتطبيق.
// هذا يطابق مبدأ "لا اعتماد على خدمة خارجية للتشغيل الأساسي" — الاعتماد
// هنا فقط وقت البناء (build time)، لا وقت استخدام المستخدم النهائي للتطبيق.
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const srcDir = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const destDir = join(root, "public", "ffmpeg");

const files = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

if (!existsSync(srcDir)) {
  console.warn(
    "[copy-ffmpeg-core] لم يُعثر على node_modules/@ffmpeg/core — " +
      "تأكد من تشغيل npm install بنجاح. تخطّي النسخ (لن يعمل استخراج الصوت حتى يُحل هذا)."
  );
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

for (const file of files) {
  const src = join(srcDir, file);
  const dest = join(destDir, file);
  if (!existsSync(src)) {
    console.warn(`[copy-ffmpeg-core] ملف مفقود: ${src}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`[copy-ffmpeg-core] نُسخ: ${file}`);
}
