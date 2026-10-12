import { useState } from "react";
import { QuickActions } from "@/features/upload/QuickActions";
import { UploadArea, type AcceptedFile } from "@/features/upload/UploadArea";
import { RecordPanel } from "@/features/record/RecordPanel";
import { FileSummary } from "@/features/upload/FileSummary";
import { ExtractAudioPanel } from "@/features/media/ExtractAudioPanel";
import { SubtitleEditor } from "@/features/editor/SubtitleEditor";
import { Notice } from "@/components/Notice";
import { ProjectsPanel } from "@/features/projects/ProjectsPanel";
import { saveProject } from "@/storage/projectsDB";
import type { StoredProject } from "@/storage/projectsDB";
import type { SubtitleTrack } from "@/models/subtitle";

export function Home() {
  const [accepted, setAccepted] = useState<AcceptedFile | null>(null);
  const [quickError, setQuickError] = useState<{ title: string; message: string } | null>(null);
  const [track, setTrack] = useState<SubtitleTrack | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "record">("upload");
  // يتغيّر مع كل تفريغ جديد — يجبر React على إعادة إنشاء SubtitleEditor
  // من الصفر بدل الاحتفاظ بحالته الداخلية القديمة (كانت تحتاج Refresh يدوي).
  const [resultNonce, setResultNonce] = useState(0);
  const [showProjects, setShowProjects] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleTranscribed = (t: SubtitleTrack, blob: Blob) => {
    setTrack(t);
    setAudioBlob(blob);
    setResultNonce((n) => n + 1);
  };

  const handleFileChange = (f: AcceptedFile) => {
    setQuickError(null);
    setAccepted(f);
    setTrack(null);
    setAudioBlob(null);
    setSaveStatus("idle");
  };

  const handleOpenProject = (project: StoredProject) => {
    const restoredFile = new File([project.sourceFileBlob], project.sourceFileName, {
      type: project.sourceFileType,
    });
    setAccepted({ file: restoredFile, kind: project.sourceKind });
    setAudioBlob(project.audioBlob);
    setTrack(project.track);
    setResultNonce((n) => n + 1);
    setShowProjects(false);
    setSaveStatus("idle");
  };

  const handleSaveProject = async () => {
    if (!accepted || !audioBlob || !track) return;
    setSaveStatus("saving");
    try {
      await saveProject({
        name: accepted.file.name.replace(/\.[^./]+$/, ""),
        sourceFileName: accepted.file.name,
        sourceFileType: accepted.file.type,
        sourceKind: accepted.kind,
        sourceFileBlob: accepted.file,
        audioBlob,
        track,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* عنوان */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          حوّل الفيديو والصوت إلى نص وملفات ترجمة
        </h1>
        <p className="max-w-md text-sm text-muted">
          اختر ملفًا، استخرج الصوت، فرّغ النص عبر Groq أو Deepgram أو AssemblyAI مجانًا.
        </p>
        <button
          type="button"
          onClick={() => setShowProjects(true)}
          className="text-xs text-muted underline hover:text-text"
        >
          📂 المشاريع المحفوظة
        </button>
      </div>

      {showProjects && (
        <ProjectsPanel
          onOpenProject={handleOpenProject}
          onClose={() => setShowProjects(false)}
        />
      )}

      {/* تخطيط عمودان على الكمبيوتر */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* العمود الأيمن — الرفع والاستخراج والتفريغ */}
        <div className="space-y-4">
          <QuickActions
            onFileAccepted={handleFileChange}
            onError={(message, title) => setQuickError({ title, message })}
          />

          {quickError && (
            <Notice
              tone="error"
              title={quickError.title}
              message={quickError.message}
              onDismiss={() => setQuickError(null)}
            />
          )}

          {/* منطقة السحب/التسجيل تختفي بعد اختيار الملف */}
          {!accepted ? (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  className={`flex-1 rounded-sf border px-3 py-2 text-xs transition-colors ${
                    inputMode === "upload"
                      ? "border-accent bg-accent/10 text-text"
                      : "border-border text-muted hover:text-text"
                  }`}
                >
                  📁 رفع ملف
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("record")}
                  className={`flex-1 rounded-sf border px-3 py-2 text-xs transition-colors ${
                    inputMode === "record"
                      ? "border-accent bg-accent/10 text-text"
                      : "border-border text-muted hover:text-text"
                  }`}
                >
                  🎙 تسجيل صوت
                </button>
              </div>

              {inputMode === "upload" ? (
                <>
                  <UploadArea onFileAccepted={handleFileChange} />
                  <p className="text-center text-xs text-muted">
                    MP4, MOV, MKV, WebM · MP3, WAV, M4A, AAC, FLAC, OGG
                  </p>
                </>
              ) : (
                <RecordPanel onFileAccepted={handleFileChange} />
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-sf border border-border bg-surface px-3 py-2">
                <FileSummary accepted={accepted} />
                <button
                  type="button"
                  onClick={() => { setAccepted(null); setTrack(null); setAudioBlob(null); }}
                  className="text-xs text-muted underline hover:text-text"
                >
                  تغيير الملف
                </button>
              </div>
              <ExtractAudioPanel
                accepted={accepted}
                onTranscribed={handleTranscribed}
              />
            </div>
          )}
        </div>

        {/* العمود الأيسر — المحرر على الكمبيوتر */}
        <div className="hidden lg:block">
          {track && audioBlob && accepted ? (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={saveStatus === "saving"}
                  className="rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-50"
                >
                  {saveStatus === "saving" ? "جارٍ الحفظ…" : saveStatus === "saved" ? "✅ تم الحفظ" : "💾 حفظ المشروع"}
                </button>
              </div>
              <SubtitleEditor
                key={resultNonce}
                initialCues={track.cues}
                language={track.language}
                baseName={accepted.file.name.replace(/\.[^./]+$/, "")}
                audioBlob={audioBlob}
              />
            </div>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center rounded-sf border border-dashed border-border">
              <div className="text-center">
                <p className="text-sm text-muted">محرر الترجمة</p>
                <p className="mt-1 text-xs text-muted">سيظهر هنا بعد التفريغ</p>
              </div>
            </div>
          )}
        </div>

        {/* المحرر على الموبايل — يظهر أسفل كل شيء */}
        {track && audioBlob && accepted && (
          <div className="space-y-3 lg:hidden">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={saveStatus === "saving"}
                className="rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-50"
              >
                {saveStatus === "saving" ? "جارٍ الحفظ…" : saveStatus === "saved" ? "✅ تم الحفظ" : "💾 حفظ المشروع"}
              </button>
            </div>
            <SubtitleEditor
              key={resultNonce}
              initialCues={track.cues}
              language={track.language}
              baseName={accepted.file.name.replace(/\.[^./]+$/, "")}
              audioBlob={audioBlob}
            />
          </div>
        )}
      </div>
    </div>
  );
}
