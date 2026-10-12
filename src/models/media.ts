import type { MediaKind } from "@/features/upload/supportedFormats";

export interface MediaMetadata {
  kind: MediaKind;
  durationSeconds: number;
  width?: number;
  height?: number;
}

export interface ExtractedAudio {
  blob: Blob;
  sampleRate: number;
  channels: number;
}
