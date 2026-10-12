import { useEffect, useRef } from "react";

interface AudioPreviewProps {
  src: string;
  onTimeUpdate: (time: number) => void;
  seekRequest: { time: number; nonce: number } | null;
}

export function AudioPreview({ src, onTimeUpdate, seekRequest }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (seekRequest && audioRef.current) {
      audioRef.current.currentTime = seekRequest.time;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest?.nonce]);

  return (
    <audio
      ref={audioRef}
      src={src}
      controls
      className="w-full rounded-sf"
      onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
    />
  );
}
