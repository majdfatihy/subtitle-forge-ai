import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AudioPreview } from "./AudioPreview";
import { editorReducer, initialEditorState } from "@/subtitles/editorReducer";
import { formatTimeInput, parseTimeInput } from "@/subtitles/timeInput";
import { exportSrt } from "@/export/srtExporter";
import { exportVtt } from "@/export/vttExporter";
import { exportTxt } from "@/export/txtExporter";
import { exportJson } from "@/export/jsonExporter";
import type { SubtitleCue } from "@/models/subtitle";

interface SubtitleEditorProps {
  initialCues: SubtitleCue[];
  language: string;
  baseName: string;
  audioBlob: Blob;
}

function downloadFile(content: string, filename: string, mime: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function SubtitleEditor({ initialCues, language, baseName, audioBlob }: SubtitleEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, {
    ...initialEditorState,
    present: initialCues,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const lastTimeUpdateRef = useRef(0);

  // ✅ useEffect صح — لا side effects أثناء render
  // React Strict Mode كان يكسر نسخة useRef/useMemo (يرسم مرتين فيحذف الـ URL)
  const [audioUrl, setAudioUrl] = useState<string>("");
  useEffect(() => {
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  const handleTimeUpdate = (t: number) => {
    const now = performance.now();
    if (now - lastTimeUpdateRef.current < 180) return;
    lastTimeUpdateRef.current = now;
    setCurrentTime(t);
  };

  const activeCueId = useMemo(
    () => state.present.find((c) => currentTime >= c.start && currentTime < c.end)?.id ?? null,
    [state.present, currentTime]
  );

  const seekTo = (time: number) => setSeekRequest({ time, nonce: Date.now() });
  const track = { language, cues: state.present };

  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  return (
    <div className="space-y-4">
      {/* معاينة الصوت — لا تُعرض حتى يصبح الـ URL جاهزًا */}
      {audioUrl && (
        <AudioPreview
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          seekRequest={seekRequest}
        />
      )}

      {/* شريط أدوات */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={state.past.length === 0}
          onClick={() => dispatch({ type: "UNDO" })}
          className="rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40">
          ↩ تراجع
        </button>
        <button type="button" disabled={state.future.length === 0}
          onClick={() => dispatch({ type: "REDO" })}
          className="rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40">
          ↪ إعادة
        </button>
        <span className="text-xs text-muted">|</span>
        <button type="button"
          onClick={() => dispatch({ type: "SHIFT_ALL", deltaSeconds: -0.1 })}
          className="rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text">
          ◀ 0.1s
        </button>
        <button type="button"
          onClick={() => dispatch({ type: "SHIFT_ALL", deltaSeconds: 0.1 })}
          className="rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text">
          0.1s ▶
        </button>
        <span className="ms-auto text-xs text-muted">{state.present.length} سطر</span>
      </div>

      {/* جدول الأسطر */}
      <div className="space-y-1.5">
        {state.present.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">لا توجد أسطر بعد.</p>
        )}
        {state.present.map((cue, index) => {
          const isActive = cue.id === activeCueId;
          return (
            <div key={cue.id}
              className={`rounded-sf border p-2 transition-colors ${
                isActive ? "border-accent bg-accent/5" : "border-border bg-surface"
              }`}>
              <div className="mb-1 flex items-center gap-2">
                <button type="button"
                  className="min-w-[1.5rem] text-xs text-muted hover:text-accent"
                  onClick={() => seekTo(cue.start)} title="انتقل لهذا الوقت">
                  {index + 1}
                </button>
                <input type="text" defaultValue={formatTimeInput(cue.start)}
                  className="w-20 rounded border border-border bg-bg px-1.5 py-0.5 text-center font-mono text-xs text-text"
                  onBlur={(e) => {
                    const t = parseTimeInput(e.target.value);
                    if (t !== null) dispatch({ type: "UPDATE_TIMING", id: cue.id, start: t });
                    else e.target.value = formatTimeInput(cue.start);
                  }} />
                <span className="text-xs text-muted">←</span>
                <input type="text" defaultValue={formatTimeInput(cue.end)}
                  className="w-20 rounded border border-border bg-bg px-1.5 py-0.5 text-center font-mono text-xs text-text"
                  onBlur={(e) => {
                    const t = parseTimeInput(e.target.value);
                    if (t !== null) dispatch({ type: "UPDATE_TIMING", id: cue.id, end: t });
                    else e.target.value = formatTimeInput(cue.end);
                  }} />
                <div className="relative ms-auto">
                  <button type="button"
                    className="rounded px-2 py-0.5 text-muted hover:bg-bg hover:text-text"
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === cue.id ? null : cue.id); }}>
                    ⋮
                  </button>
                  {openMenuId === cue.id && (
                    <div className="absolute end-0 top-full z-10 mt-1 w-36 rounded-sf border border-border bg-surface py-1 shadow-lg"
                      onClick={(e) => e.stopPropagation()}>
                      <button type="button"
                        className="w-full px-3 py-1.5 text-right text-xs text-text hover:bg-bg"
                        onClick={() => { dispatch({ type: "ADD_AFTER", id: cue.id }); setOpenMenuId(null); }}>
                        + إضافة سطر بعده
                      </button>
                      <button type="button"
                        className="w-full px-3 py-1.5 text-right text-xs text-text hover:bg-bg"
                        onClick={() => {
                          const ta = document.querySelector<HTMLTextAreaElement>(`[data-cue-id="${cue.id}"]`);
                          const pos = ta?.selectionStart ?? Math.floor(cue.text.length / 2);
                          dispatch({ type: "SPLIT", id: cue.id, atCharIndex: pos });
                          setOpenMenuId(null);
                        }}>
                        ✂ تقسيم عند المؤشر
                      </button>
                      {index < state.present.length - 1 && (
                        <button type="button"
                          className="w-full px-3 py-1.5 text-right text-xs text-text hover:bg-bg"
                          onClick={() => { dispatch({ type: "MERGE_WITH_NEXT", id: cue.id }); setOpenMenuId(null); }}>
                          ⊕ دمج مع التالي
                        </button>
                      )}
                      <hr className="my-1 border-border" />
                      <button type="button"
                        className="w-full px-3 py-1.5 text-right text-xs text-red-500 hover:bg-bg"
                        onClick={() => { dispatch({ type: "DELETE", id: cue.id }); setOpenMenuId(null); }}>
                        🗑 حذف
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <textarea data-cue-id={cue.id} value={cue.text} rows={2}
                className="w-full resize-none rounded border border-border bg-bg px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
                onChange={(e) => dispatch({ type: "UPDATE_TEXT", id: cue.id, text: e.target.value })} />
            </div>
          );
        })}
      </div>

      {/* أزرار التصدير */}
      {state.present.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {[
            { label: "تنزيل SRT", fn: () => downloadFile(exportSrt(track), `${baseName}.srt`, "text/plain;charset=utf-8") },
            { label: "تنزيل VTT", fn: () => downloadFile(exportVtt(track), `${baseName}.vtt`, "text/vtt;charset=utf-8") },
            { label: "تنزيل TXT", fn: () => downloadFile(exportTxt(track), `${baseName}.txt`, "text/plain;charset=utf-8") },
            { label: "تنزيل JSON", fn: () => downloadFile(exportJson(track), `${baseName}.json`, "application/json;charset=utf-8") },
          ].map((btn) => (
            <button key={btn.label} type="button" onClick={btn.fn}
              className="rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text">
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
