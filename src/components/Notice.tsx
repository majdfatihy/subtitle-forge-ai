import { cn } from "@/utils/cn";

interface NoticeProps {
  tone: "error" | "warning";
  title?: string;
  message: string;
  onDismiss?: () => void;
}

/**
 * صوت الواجهة عند الخطأ: تشرح ما حدث وكيف تُحل، بدون اعتذار وبدون غموض
 * (حسب مبادئ الكتابة في الواجهة).
 */
export function Notice({ tone, title, message, onDismiss }: NoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start justify-between gap-3 rounded-sf border px-4 py-3 text-sm",
        tone === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      )}
    >
      <div>
        {title && <p className="font-medium">{title}</p>}
        <p className="text-muted">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق الرسالة"
          className="shrink-0 text-muted hover:text-text"
        >
          ✕
        </button>
      )}
    </div>
  );
}
