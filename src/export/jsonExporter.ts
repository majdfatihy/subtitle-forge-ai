import type { SubtitleTrack } from "@/models/subtitle";

export function exportJson(track: SubtitleTrack): string {
  const duration =
    track.cues.length > 0 ? track.cues[track.cues.length - 1]!.end : 0;

  return JSON.stringify(
    {
      language: track.language,
      duration,
      segments: track.cues.map((cue) => ({
        id: cue.id,
        start: cue.start,
        end: cue.end,
        text: cue.text,
        speaker: cue.speaker,
        words: cue.words,
      })),
    },
    null,
    2
  );
}
