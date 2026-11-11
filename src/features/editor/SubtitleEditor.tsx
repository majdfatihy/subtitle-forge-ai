import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AudioPreview } from "./AudioPreview";
import { editorReducer, initialEditorState } from "@/subtitles/editorReducer";
import { formatTimeInput, parseTimeInput } from "@/subtitles/timeInput";
import { exportSrt } from "@/export/srtExporter";
import { exportVtt } from "@/export/vttExporter";
import { exportTxt } from "@/export/txtExporter";
import { exportJson } from "@/export/jsonExporter";
import { exportAss } from "@/export/assExporter";
import type { SubtitleCue } from "@/models/subtitle";

interface SubtitleEditorProps {
  initialCues: SubtitleCue[];
  language: string;
  baseName: string;
  audioBlob: Blob;
}

type ViewMode = "all" | "sentence" | "paragraph";

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
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const lastTimeUpdateRef = useRef(0);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // أثناء فترات الصمت بين الأسطر، activeIndex يرجع -1 — بدل ما يختفي
  // النص فجأة (كان يبان كأنه عطل)، نُبقي آخر سطر اتقال ظاهرًا بشكل باهت
  // لحد ما السطر التالي يبدأ فعليًا.
  const lastActiveIndexRef = useRef<number>(-1);
  const activeIndex = useMemo(
    () => state.present.findIndex((c) => currentTime >= c.start && currentTime < c.end),
    [state.present, currentTime]
  );
  const activeCueId = activeIndex === -1 ? null : state.present[activeIndex]!.id;
  if (activeIndex !== -1) lastActiveIndexRef.current = activeIndex;
  const isSilence = activeIndex === -1;
  const displayIndex = isSilence ? lastActiveIndexRef.current : activeIndex;

  // "الملقّن" — في وضع "الكل"، السطر النشط يُمرَّر إليه تلقائيًا أثناء
  // التشغيل بدل ما يضطر المستخدم ينزل بنفسه لآخر صفحة طويلة.
  useEffect(() => {
    if (viewMode !== "all" || !activeCueId) return;
    const el = rowRefs.current.get(activeCueId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeCueId, viewMode]);

  const visibleCues = useMemo(() => {
    if (viewMode === "all") return state.present;
    if (displayIndex === -1) return [];
    if (viewMode === "sentence") return [state.present[displayIndex]!];
    const start = Math.max(0, displayIndex - 1);
    const end = Math.min(state.present.length, displayIndex + 2);
    return state.present.slice(start, end);
  }, [viewMode, state.present, displayIndex]);

  const seekTo = (time: number) => setSeekRequest({ time, nonce: Date.now() });
  const track = { language, cues: state.present };

  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
    { value: "all", label: "كل النص" },
    { value: "paragraph", label: "فقرة" },
    { value: "sentence", label: "جملة (ملقّن)" },
  ];

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes sf-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sf-fade-up { animation: sf-fade-up 0.35s ease-out; }
      `}</style>

      {audioUrl && (
        <AudioPreview src={audioUrl} onTimeUpdate={handleTimeUpdate} seekRequest={seekRequest} />
      )}

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

      <div className="flex gap-2">
        {VIEW_MODE_OPTIONS.map((opt) => (
          <button key={opt.value} type="button"
            onClick={() => setViewMode(opt.value)}
            className={`flex-1 rounded-sf border px-3 py-1.5 text-xs transition-colors ${
              viewMode === opt.value
                ? "border-accent bg-accent/10 text-text"
                : "border-border text-muted hover:text-text"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {viewMode === "sentence" && (
        <div className="flex min-h-[220px] items-center justify-center rounded-sf border border-accent/40 bg-accent/5 p-6">
          {visibleCues[0] ? (
            <textarea
              key={visibleCues[0].id}
              data-cue-id={visibleCues[0].id}
              value={visibleCues[0].text}
              rows={3}
              className={`sf-fade-up w-full resize-none bg-transparent text-center text-2xl font-medium leading-relaxed text-text transition-opacity duration-300 focus:outline-none ${
                isSilence ? "opacity-40" : "opacity-100"
              }`}
              onChange={(e) => dispatch({ type: "UPDATE_TEXT", id: visibleCues[0]!.id, text: e.target.value })}
            />
          ) : (
            <p className="text-center text-sm text-muted">شغّل الصوت — السطر الحالي هيظهر هنا تلقائيًا</p>
          )}
        </div>
      )}

      {viewMode === "paragraph" && (
        <div className="space-y-3 rounded-sf border border-border bg-surface p-5">
          {visibleCues.length === 0 && (
            <p className="text-center text-sm text-muted">شغّل الصوت — الفقرة الحالية هتظهر هنا تلقائيًا</p>
          )}
          {visibleCues.map((cue) => {
            const isActive = cue.id === state.present[displayIndex]?.id;
            return (
              <textarea
                key={cue.id}
                data-cue-id={cue.id}
                value={cue.text}
                rows={2}
                className={`sf-fade-up w-full resize-none bg-transparent text-center transition-all duration-300 focus:outline-none ${
                  isActive
                    ? `text-xl font-medium text-text ${isSilence ? "opacity-40" : "opacity-100"}`
                    : "text-sm text-muted opacity-60"
                }`}
                onChange={(e) => dispatch({ type: "UPDATE_TEXT", id: cue.id, text: e.target.value })}
              />
            );
          })}
        </div>
      )}

      {viewMode === "all" && (
        <div className="space-y-1.5">
          {state.present.length === 0 && (
            <p className="py-6 text-center text-xs text-muted">لا توجد أسطر بعد.</p>
          )}
          {state.present.map((cue, index) => {
            const isActive = cue.id === activeCueId;
            return (
              <div key={cue.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(cue.id, el);
                  else rowRefs.current.delete(cue.id);
                }}
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
      )}

      {state.present.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {[
            { label: "تنزيل SRT", fn: () => downloadFile(exportSrt(track), `${baseName}.srt`, "text/plain;charset=utf-8") },
            { label: "تنزيل VTT", fn: () => downloadFile(exportVtt(track), `${baseName}.vtt`, "text/vtt;charset=utf-8") },
            { label: "تنزيل TXT", fn: () => downloadFile(exportTxt(track), `${baseName}.txt`, "text/plain;charset=utf-8") },
            { label: "تنزيل JSON", fn: () => downloadFile(exportJson(track), `${baseName}.json`, "application/json;charset=utf-8") },
            { label: "تنزيل ASS", fn: () => downloadFile(exportAss(track), `${baseName}.ass`, "text/plain;charset=utf-8") },
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
