import type { SubtitleTrack } from "@/models/subtitle";
import { secondsToSrtTime } from "@/subtitles/timestamps";

export function exportSrt(track: SubtitleTrack): string {
  return track.cues
    .map((cue, index) => {
      const number = index + 1;
      const time = `${secondsToSrtTime(cue.start)} --> ${secondsToSrtTime(
        cue.end
      )}`;
      return `${number}\n${time}\n${cue.text}\n`;
    })
    .join("\n");
}
