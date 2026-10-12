import type { SubtitleTrack } from "@/models/subtitle";
import { secondsToSrtTime } from "@/subtitles/timestamps";

export interface TxtExportOptions {
  /** "text-only" يصدّر النص فقط، "with-timestamps" يضيف توقيت كل سطر */
  mode: "text-only" | "with-timestamps";
}

export function exportTxt(
  track: SubtitleTrack,
  options: TxtExportOptions = { mode: "text-only" }
): string {
  if (options.mode === "text-only") {
    return track.cues.map((cue) => cue.text).join("\n");
  }
  return track.cues
    .map(
      (cue) =>
        `[${secondsToSrtTime(cue.start)} --> ${secondsToSrtTime(cue.end)}] ${
          cue.text
        }`
    )
    .join("\n");
}
