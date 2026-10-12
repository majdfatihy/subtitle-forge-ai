import { useEffect, useRef } from "react";

interface VideoPreviewProps {
  src: string;
  onTimeUpdate: (time: number) => void;
  /** يتغيّر كل مرة يُطلب فيها الانتقال لزمن معيّن (نمط "أمر" بسيط بدل ref إلزامي) */
  seekRequest: { time: number; nonce: number } | null;
}

// المعاينة بقت صوت فقط دايمًا (حتى لو المصدر الأصلي فيديو). فك ترميز
// ورسم الفيديو كان هو سبب التهنيج الملحوظ مع الملفات الثقيلة، وهو حِمل
// غير ضروري أصلًا هنا لأن التعديل نصّي وزمني بحت ولا يحتاج معاينة بصرية.
export function VideoPreview({ src, onTimeUpdate, seekRequest }: VideoPreviewProps) {
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
