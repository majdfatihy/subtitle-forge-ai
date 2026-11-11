import { useState } from "react";
import { UploadArea, type AcceptedFile } from "@/features/upload/UploadArea";
import { FileSummary } from "@/features/upload/FileSummary";
import { ExtractAudioPanel } from "@/features/media/ExtractAudioPanel";
import { SubtitleEditor } from "@/features/editor/SubtitleEditor";
import { RecordPanel } from "@/features/record/RecordPanel";
import { Notice } from "@/components/Notice";
import { ProjectsPanel } from "@/features/projects/ProjectsPanel";
import { saveProject } from "@/storage/projectsDB";
import { useLocale } from "@/i18n/LocaleContext";
import type { StoredProject } from "@/storage/projectsDB";
import type { SubtitleTrack } from "@/models/subtitle";

export function Home() {
  const { t } = useLocale();
  const [accepted, setAccepted] = useState<AcceptedFile | null>(null);
  const [quickError, setQuickError] = useState<{ title: string; message: string } | null>(null);
  const [track, setTrack] = useState<SubtitleTrack | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "record">("upload");
  const [resultNonce, setResultNonce] = useState(0);
  const [showProjects, setShowProjects] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // المشروع الحالي قيد التحرير — لو موجود، أي حفظ (تلقائي أو يدوي)
  // يُحدِّث نفس السجل بدل ما يُنشئ نسخة جديدة مكررة في كل مرة.
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProviderInfo, setCurrentProviderInfo] = useState<{ provider: string; model: string } | null>(null);

  const handleFileChange = (f: AcceptedFile) => {
    setQuickError(null);
    setAccepted(f);
    setTrack(null);
    setAudioBlob(null);
    setSaveStatus("idle");
    setCurrentProjectId(null); // ملف جديد = مشروع جديد، لا نُحدِّث القديم
    setCurrentProviderInfo(null);
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
    setCurrentProjectId(project.id); // أي حفظ تالٍ يُحدِّث هذا المشروع نفسه
    setCurrentProviderInfo(
      project.providerUsed && project.modelUsed
        ? { provider: project.providerUsed, model: project.modelUsed }
        : null
    );
  };

  const persistProject = async (
    trackToSave: SubtitleTrack,
    blob: Blob,
    providerUsed?: string,
    modelUsed?: string
  ) => {
    if (!accepted) return;
    const newId = await saveProject({
      id: currentProjectId ?? undefined,
      name: accepted.file.name.replace(/\.[^./]+$/, ""),
      sourceFileName: accepted.file.name,
      sourceFileType: accepted.file.type,
      sourceKind: accepted.kind,
      sourceFileBlob: accepted.file,
      audioBlob: blob,
      track: trackToSave,
      providerUsed,
      modelUsed,
    });
    setCurrentProjectId(newId);
    setSaveStatus("saved");
  };

  const handleSaveProject = async () => {
    if (!accepted || !audioBlob || !track) return;
    setSaveStatus("saving");
    try {
      await persistProject(track, audioBlob, currentProviderInfo?.provider, currentProviderInfo?.model);
    } catch {
      setSaveStatus("error");
    }
  };

  const SaveButton = () => (
    <div className="flex items-center justify-between gap-2">
      {currentProviderInfo && (
        <p className="text-xs text-muted">
          تم التفريغ بواسطة {currentProviderInfo.provider} ({currentProviderInfo.model})
        </p>
      )}
      <button
        type="button"
        onClick={handleSaveProject}
        disabled={saveStatus === "saving"}
        className="ms-auto rounded-sf border border-border px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-50"
      >
        {saveStatus === "saving" ? t("saving") : saveStatus === "saved" ? t("saved") : t("saveProject")}
      </button>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6">
      {!accepted ? (
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("appTitle")}</h1>
          <p className="max-w-md text-sm text-muted">{t("appSubtitle")}</p>
          <button
            type="button"
            onClick={() => setShowProjects(true)}
            className="text-xs text-muted underline hover:text-text"
          >
            {t("savedProjects")}
          </button>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-text">SubtitleForge</p>
          <button
            type="button"
            onClick={() => setShowProjects(true)}
            className="text-xs text-muted underline hover:text-text"
          >
            {t("projects")}
          </button>
        </div>
      )}

      {showProjects && (
        <ProjectsPanel onOpenProject={handleOpenProject} onClose={() => setShowProjects(false)} />
      )}

      <div className="flex-1 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {quickError && (
            <Notice
              tone="error"
              title={quickError.title}
              message={quickError.message}
              onDismiss={() => setQuickError(null)}
            />
          )}

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
                  {t("uploadFile")}
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
                  {t("recordAudio")}
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
                  onClick={() => { setAccepted(null); setTrack(null); setAudioBlob(null); setCurrentProjectId(null); }}
                  className="text-xs text-muted underline hover:text-text"
                >
                  {t("changeFile")}
                </button>
              </div>
              <ExtractAudioPanel
                accepted={accepted}
                onTranscribed={(trackResult, blob, providerUsed, modelUsed) => {
                  setTrack(trackResult);
                  setAudioBlob(blob);
                  setResultNonce((n) => n + 1);
                  setCurrentProviderInfo({ provider: providerUsed, model: modelUsed });
                  void persistProject(trackResult, blob, providerUsed, modelUsed).catch(() => {});
                }}
              />
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          {track && audioBlob && accepted ? (
            <div className="space-y-3">
              <SaveButton />
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
                <p className="text-sm text-muted">{t("editorPlaceholderTitle")}</p>
                <p className="mt-1 text-xs text-muted">{t("editorPlaceholderBody")}</p>
              </div>
            </div>
          )}
        </div>

        {track && audioBlob && accepted && (
          <div className="space-y-3 lg:hidden">
            <SaveButton />
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

      <footer className="mt-10 border-t border-border pt-4 text-center text-xs text-muted">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <a href="/about" className="hover:text-text hover:underline">{t("footerAbout")}</a>
          <a href="/how-to-use" className="hover:text-text hover:underline">{t("footerHowTo")}</a>
          <a href="/contact" className="hover:text-text hover:underline">{t("footerContact")}</a>
          <a href="/privacy" className="hover:text-text hover:underline">{t("footerPrivacy")}</a>
          <a href="/terms" className="hover:text-text hover:underline">{t("footerTerms")}</a>
        </nav>
        <p className="mt-3">SubtitleForge © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
