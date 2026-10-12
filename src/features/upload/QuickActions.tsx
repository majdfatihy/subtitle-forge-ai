import { useRef } from "react";
import { Button } from "@/components/Button";
import type { AcceptedFile } from "./UploadArea";
import { validateFile } from "./validateFile";

interface QuickActionsProps {
  onFileAccepted: (accepted: AcceptedFile) => void;
  onError: (message: string, title: string) => void;
}

/**
 * أزرار: رفع فيديو / رفع صوت مباشرة (بدون الحاجة للسحب والإفلات) +
 * إجراءات لاحقة (تسجيل صوت، فتح مشروع، استيراد ترجمة) معطّلة حاليًا
 * حتى تُبنى في جلساتها المخصّصة — لا نعرضها كأنها تعمل وهي لا تعمل.
 */
export function QuickActions({ onFileAccepted, onError }: QuickActionsProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = validateFile(file);
    if (!result.ok) {
      onError(result.error.message, result.error.title);
      return;
    }
    onFileAccepted({ file, kind: result.kind });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={handlePick}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        onChange={handlePick}
      />

      <Button variant="primary" onClick={() => videoInputRef.current?.click()}>
        رفع فيديو
      </Button>
      <Button variant="secondary" onClick={() => audioInputRef.current?.click()}>
        رفع صوت
      </Button>
      <Button variant="secondary" disabled title="سيُفعَّل في جلسة التسجيل الصوتي">
        تسجيل صوت
      </Button>
      <Button variant="ghost" disabled title="سيُفعَّل في جلسة نظام المشاريع">
        فتح مشروع
      </Button>
      <Button variant="ghost" disabled title="سيُفعَّل في جلسة الاستيراد والتحويل">
        استيراد ملف ترجمة
      </Button>
    </div>
  );
}
