import { useAudioRecorder } from "./useAudioRecorder";
import type { AcceptedFile } from "@/features/upload/UploadArea";

interface RecordPanelProps {
  onFileAccepted: (accepted: AcceptedFile) => void;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** يحوّل Blob التسجيل إلى File عادي — يدخل بعدها نفس مسار الاستخراج/التفريغ الموجود بلا أي تفرّع كود إضافي. */
function blobToAcceptedFile(blob: Blob): AcceptedFile {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  const file = new File([blob], `تسجيل-${Date.now()}.${ext}`, { type: blob.type });
  return { file, kind: "audio" };
}

export function RecordPanel({ onFileAccepted }: RecordPanelProps) {
  const { status, elapsedSeconds, audioBlob, error, start, pause, resume, stop, reset } =
    useAudioRecorder();

  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isStopped = status === "stopped" && audioBlob;

  return (
    <div className="space-y-3 rounded-sf border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text">تسجيل صوت مباشر</p>

      {status === "idle" && (
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-sf border border-border bg-bg px-4 py-3 text-sm text-text transition-colors hover:border-accent"
        >
          <span className="h-3 w-3 rounded-full bg-red-500" />
          ابدأ التسجيل
        </button>
      )}

      {status === "requesting" && (
        <p className="text-center text-xs text-muted">جارٍ طلب إذن الميكروفون…</p>
      )}

      {(isRecording || isPaused) && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full bg-red-500 ${isRecording ? "animate-pulse" : ""}`}
            />
            <span className="font-mono text-lg text-text">{formatElapsed(elapsedSeconds)}</span>
            {isPaused && <span className="text-xs text-muted">(متوقّف مؤقتًا)</span>}
          </div>
          <div className="flex gap-2">
            {isRecording ? (
              <button
                type="button"
                onClick={pause}
                className="flex-1 rounded-sf border border-border px-3 py-2 text-sm text-text hover:border-accent"
              >
                ⏸ إيقاف مؤقت
              </button>
            ) : (
              <button
                type="button"
                onClick={resume}
                className="flex-1 rounded-sf border border-border px-3 py-2 text-sm text-text hover:border-accent"
              >
                ▶ استئناف
              </button>
            )}
            <button
              type="button"
              onClick={stop}
              className="flex-1 rounded-sf bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              ⏹ إنهاء التسجيل
            </button>
          </div>
        </div>
      )}

      {isStopped && audioBlob && (
        <div className="space-y-3">
          <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
          <p className="text-center text-xs text-muted">
            المدة: {formatElapsed(elapsedSeconds)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-sf border border-border px-3 py-2 text-sm text-muted hover:text-text"
            >
              إعادة التسجيل
            </button>
            <button
              type="button"
              onClick={() => onFileAccepted(blobToAcceptedFile(audioBlob))}
              className="flex-1 rounded-sf bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              استخدام هذا التسجيل ←
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-sf border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-1 text-xs text-muted underline"
          >
            حاول مرة أخرى
          </button>
        </div>
      )}
    </div>
  );
}
