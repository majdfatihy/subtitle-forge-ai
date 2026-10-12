import type { SubtitleTrack } from "@/models/subtitle";
import type { MediaKind } from "@/features/upload/supportedFormats";

const DB_NAME = "subtitleforge";
const DB_VERSION = 1;
const STORE = "projects";

export interface StoredProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceFileName: string;
  sourceFileType: string;
  sourceKind: MediaKind;
  sourceFileBlob: Blob;
  audioBlob: Blob;
  track: SubtitleTrack;
}

/** نسخة مختصرة بدون الـ Blobs الثقيلة — لعرض القائمة بسرعة بلا تحميل كل البيانات. */
export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  sourceFileName: string;
  cueCount: number;
  sizeEstimate: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("تعذّر فتح قاعدة بيانات المشاريع."));
  });
}

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function saveProject(
  data: Omit<StoredProject, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<string> {
  const db = await openDB();
  const now = Date.now();
  const id = data.id ?? genId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    // لو بنحدّث مشروع موجود، نحافظ على createdAt الأصلي.
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as StoredProject | undefined;
      const record: StoredProject = {
        ...data,
        id,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      store.put(record);
    };

    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error ?? new Error("تعذّر حفظ المشروع."));
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredProject[]) ?? [];
      const summaries: ProjectSummary[] = all
        .map((p) => ({
          id: p.id,
          name: p.name,
          updatedAt: p.updatedAt,
          sourceFileName: p.sourceFileName,
          cueCount: p.track?.cues?.length ?? 0,
          sizeEstimate: (p.sourceFileBlob?.size ?? 0) + (p.audioBlob?.size ?? 0),
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(summaries);
    };
    req.onerror = () => reject(req.error ?? new Error("تعذّر قراءة قائمة المشاريع."));
  });
}

export async function loadProject(id: string): Promise<StoredProject | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as StoredProject) ?? null);
    req.onerror = () => reject(req.error ?? new Error("تعذّر تحميل المشروع."));
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("تعذّر حذف المشروع."));
  });
}
