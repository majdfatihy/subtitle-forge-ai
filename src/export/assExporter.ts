import type { SubtitleTrack } from "@/models/subtitle";

/** 72.345 -> "0:01:12.34" (صيغة ASS: س:د:ث.جج — جزءان من الثانية فقط) */
function toAssTime(seconds: number): string {
  // نقرّب على مستوى "جزء من مئة الثانية" مرة واحدة من البداية — تقريب
  // الثواني والأجزاء كل على حدة كان ينتج حافات خاطئة مثل "59.100"
  // بدل الترحيل الصحيح لـ "1:00.00".
  const totalCentiseconds = Math.round(Math.max(0, seconds) * 100);
  const h = Math.floor(totalCentiseconds / 360000);
  const m = Math.floor((totalCentiseconds % 360000) / 6000);
  const s = Math.floor((totalCentiseconds % 6000) / 100);
  const cs = totalCentiseconds % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** ASS لا تدعم \n حرفيًا داخل سطر الحدث — يُستبدَل بـ \N الخاص بصيغة ASS نفسها. */
function toAssText(text: string): string {
  return text.replace(/\n/g, "\\N");
}

const HEADER = `[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

export function exportAss(track: SubtitleTrack): string {
  const lines = track.cues.map((cue) => {
    const start = toAssTime(cue.start);
    const end = toAssTime(cue.end);
    const text = toAssText(cue.text);
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });
  return `${HEADER}\n${lines.join("\n")}\n`;
}
