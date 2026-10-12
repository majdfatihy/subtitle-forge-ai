import type { SubtitleTrack } from "@/models/subtitle";
import { exportSrt } from "./srtExporter";
import { exportVtt } from "./vttExporter";
import { exportTxt, type TxtExportOptions } from "./txtExporter";
import { exportJson } from "./jsonExporter";

/**
 * الصيغ المتاحة حاليًا: SRT/VTT/TXT/JSON (كافية لـ MVP).
 * ASS/SSA/TTML تحتاج نظام Styles/Settings غير مبني بعد — تُضاف في
 * جلسة تصدير متقدّمة لاحقًا (Session 11 المتقدمة)، بدل تخمين بنيتها الآن.
 */
export type ExportFormat = "srt" | "vtt" | "txt" | "json";

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  srt: "text/plain;charset=utf-8",
  vtt: "text/vtt;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
};

/** يبني اسم الملف بنمط: <base>.<lang>.<ext> — مثل video.ar.srt */
export function buildFilename(
  baseName: string,
  language: string,
  format: ExportFormat
): string {
  return `${baseName}.${language}.${format}`;
}

export function exportTrack(
  track: SubtitleTrack,
  baseName: string,
  format: ExportFormat,
  txtOptions?: TxtExportOptions
): ExportResult {
  let content: string;
  switch (format) {
    case "srt":
      content = exportSrt(track);
      break;
    case "vtt":
      content = exportVtt(track);
      break;
    case "txt":
      content = exportTxt(track, txtOptions);
      break;
    case "json":
      content = exportJson(track);
      break;
  }

  return {
    content,
    filename: buildFilename(baseName, track.language, format),
    mimeType: MIME_BY_FORMAT[format],
  };
}

/** يبدأ تنزيل الملف من المتصفح مباشرة (بدون أي خادم). */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}
