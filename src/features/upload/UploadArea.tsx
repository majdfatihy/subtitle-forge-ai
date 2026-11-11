import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { formatBytes } from "@/utils/formatBytes";
import { validateFile, type ValidationError, type ValidationWarning } from "./validateFile";
import type { MediaKind } from "./supportedFormats";
import { Notice } from "@/components/Notice";
import { useLocale } from "@/i18n/LocaleContext";

export interface AcceptedFile {
  file: File;
  kind: MediaKind;
}

interface UploadAreaProps {
  accept?: "video" | "audio" | "both";
  onFileAccepted: (accepted: AcceptedFile) => void;
}

const ACCEPT_MAP: Record<"video" | "audio" | "both", string> = {
  video: "video/*",
  audio: "audio/*",
  both: "video/*,audio/*",
};

export function UploadArea({ accept = "both", onFileAccepted }: UploadAreaProps) {
  const { locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<ValidationError | null>(null);
  const [warning, setWarning] = useState<ValidationWarning | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setWarning(null);
      const result = validateFile(file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.warning) setWarning(result.warning);
      onFileAccepted({ file, kind: result.kind });
    },
    [onFileAccepted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const texts = {
    ar: { dropHere: "اسحب ملف الفيديو أو الصوت وأفلته هنا", or: "أو", chooseFile: "اختر ملفًا من جهازك" },
    en: { dropHere: "Drag and drop a video or audio file here", or: "or", chooseFile: "Choose a file from your device" },
  }[locale];

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-sf border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDraggingOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"
        )}
      >
        <p className="text-sm text-text">{texts.dropHere}</p>
        <p className="mt-1 text-xs text-muted">{texts.or}</p>

        {/*
          الـ <input> نفسه مخفي بصريًا (sr-only) تمامًا — المستخدم أبدًا
          لا يرى عنصر الإدخال الأصلي، فقط هذا الزرار المُصمَّم. هذا يمنع
          ظهور نص "No file chosen" الافتراضي من المتصفح (اللي بيتبع لغة
          المتصفح نفسها لا لغة الصفحة، ومينفعش يتغيّر بالترجمة).
        */}
        <label htmlFor={inputId} className="mt-3 inline-block">
          <span className="cursor-pointer rounded-sf border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:border-accent">
            {texts.chooseFile}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT_MAP[accept]}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <Notice tone="error" title={error.title} message={error.message} onDismiss={() => setError(null)} />}
      {warning && <Notice tone="warning" message={warning.message} onDismiss={() => setWarning(null)} />}
    </div>
  );
}

export { formatBytes };
