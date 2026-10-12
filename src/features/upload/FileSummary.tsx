import { formatBytes } from "@/utils/formatBytes";
import type { AcceptedFile } from "./UploadArea";

const KIND_LABEL: Record<AcceptedFile["kind"], string> = {
  video: "فيديو",
  audio: "صوت",
};

export function FileSummary({ accepted }: { accepted: AcceptedFile }) {
  return (
    <div className="rounded-sf border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text">{accepted.file.name}</p>
      <p className="mt-1 text-xs text-muted">
        {KIND_LABEL[accepted.kind]} · {formatBytes(accepted.file.size)}
      </p>
      <p className="mt-3 text-xs text-muted">
        تم قبول الملف والتحقق منه. خطوات استخراج الصوت والتفريغ النصي ستُضاف
        في الجلسات القادمة (Media Engine ثم Speech Engine).
      </p>
    </div>
  );
}
