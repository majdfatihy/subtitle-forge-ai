import { useEffect, useState } from "react";
import { listProjects, loadProject, deleteProject } from "@/storage/projectsDB";
import type { ProjectSummary, StoredProject } from "@/storage/projectsDB";
import { formatBytes } from "@/utils/formatBytes";

interface ProjectsPanelProps {
  onOpenProject: (project: StoredProject) => void;
  onClose: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectsPanel({ onOpenProject, onClose }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    listProjects()
      .then(setProjects)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => { refresh(); }, []);

  const handleOpen = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const project = await loadProject(id);
      if (!project) {
        setError("تعذّر إيجاد هذا المشروع — ربما حُذف بالفعل.");
        refresh();
        return;
      }
      onOpenProject(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر فتح المشروع.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteProject(id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر حذف المشروع.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-sf border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <p className="text-sm font-semibold text-text">المشاريع المحفوظة</p>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-muted hover:text-text"
          >
            ×
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

          {projects === null && (
            <p className="text-center text-xs text-muted">جارٍ التحميل…</p>
          )}

          {projects && projects.length === 0 && (
            <p className="py-8 text-center text-xs text-muted">
              لا توجد مشاريع محفوظة بعد — احفظ مشروعك الحالي بعد التفريغ.
            </p>
          )}

          <div className="space-y-2">
            {projects?.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-sf border border-border bg-bg p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">{p.name}</p>
                  <p className="text-xs text-muted">
                    {formatDate(p.updatedAt)} · {p.cueCount} سطر · {formatBytes(p.sizeEstimate)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleOpen(p.id)}
                    className="rounded-sf border border-accent px-3 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
                  >
                    فتح
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => handleDelete(p.id)}
                    className="rounded-sf border border-red-500/40 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
