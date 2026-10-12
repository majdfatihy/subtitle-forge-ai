import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { ProgressBar } from "@/components/ProgressBar";
import { formatBytes } from "@/utils/formatBytes";
import { extractAudio, readMetadata } from "@/media/MediaEngine";
import { TranscribePanel } from "@/features/speech/TranscribePanel";
import type { AcceptedFile } from "@/features/upload/UploadArea";
import type { MediaMetadata, ExtractedAudio } from "@/models/media";
import type { SubtitleTrack } from "@/models/subtitle";

type Status = "idle" | "loading-metadata" | "ready" | "extracting" | "done" | "error";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface ExtractAudioPanelProps {
  accepted: AcceptedFile;
  onTranscribed: (track: SubtitleTrack, audioBlob: Blob) => void;
}

export function ExtractAudioPanel({ accepted, onTranscribed }: ExtractAudioPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExtractedAudio | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading-metadata");
    setMetadata(null);
    setResult(null);
    setError(null);
    readMetadata(accepted.file, accepted.kind)
      .then((meta) => {
        if (cancelled) return;
        setMetadata(meta);
        setStatus("ready");
        // استخراج تلقائي فور معرفة بيانات الملف — بلا حاجة لضغطة زر إضافية.
        void handleExtract();
      })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setStatus("error"); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accepted]);

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  const handleExtract = async () => {
    setStatus("extracting");
    setProgress(0);
    setError(null);
    try {
      const extracted = await extractAudio(accepted.file, setProgress);
      setResult(extracted);
      setAudioUrl(URL.createObjectURL(extracted.blob));
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? `تعذّر استخراج الصوت: ${err.message}` : "تعذّر استخراج الصوت.");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-3 rounded-sf border border-border bg-surface p-4">
      <p className="text-sm font-medium text-text">استخراج الصوت</p>

      {status === "loading-metadata" && <p className="text-xs text-muted">قراءة بيانات الملف…</p>}

      {metadata && (
        <p className="font-mono text-xs text-muted">
          المدة: {formatDuration(metadata.durationSeconds)}
          {metadata.width && metadata.height ? ` · ${metadata.width}×${metadata.height}` : ""}
        </p>
      )}

      {status === "error" && (
        <Button variant="primary" onClick={handleExtract}>
          إعادة المحاولة
        </Button>
      )}
      {status === "done" && (
        <button
          type="button"
          onClick={handleExtract}
          className="text-xs text-muted underline hover:text-text"
        >
          إعادة الاستخراج
        </button>
      )}

      {status === "extracting" && (
        <ProgressBar ratio={progress} label="جارٍ الاستخراج… أول مرة أبطأ (~30 ميجا)" />
      )}

      {status === "done" && result && audioUrl && (
        <div className="space-y-2">
          <audio controls src={audioUrl} className="w-full" />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{formatBytes(result.blob.size)} · {result.sampleRate}Hz · {result.channels === 1 ? "قناة واحدة" : `${result.channels} قنوات`}</span>
            <a href={audioUrl} download={`${accepted.file.name}.extracted.wav`} className="text-accent hover:underline">
              تنزيل الصوت
            </a>
          </div>
        </div>
      )}

      {status === "done" && result && (
        <TranscribePanel
          audio={result}
          sourceFile={accepted.file}
          onTranscribed={onTranscribed}
        />
      )}

      {error && (
        <Notice tone="error" title="حدث خطأ" message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
}
