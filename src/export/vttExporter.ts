import type { SubtitleTrack } from "@/models/subtitle";
import { secondsToVttTime } from "@/subtitles/timestamps";

export function exportVtt(track: SubtitleTrack): string {
  const body = track.cues
    .map((cue) => {
      const time = `${secondsToVttTime(cue.start)} --> ${secondsToVttTime(
        cue.end
      )}`;
      return `${time}\n${cue.text}\n`;
    })
    .join("\n");

  return `WEBVTT\n\n${body}`;
}
