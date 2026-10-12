import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "stopped" | "error";

interface UseAudioRecorderResult {
  status: RecorderStatus;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  error: string | null;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

/** أول نوع مدعوم من المتصفح — Chrome/Firefox تدعمان webm عادةً، Safari تدعم mp4 غالبًا. */
function pickSupportedMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined; // اترك المتصفح يختار الافتراضي
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // تنظيف عند إزالة المكوّن — لا نريد ميكروفونًا يبقى "شغّالًا" في الخلفية.
  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        clearTimer();
        stopStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(
          Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000)
        );
      }, 250);

      setStatus("recording");
    } catch (err: unknown) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "تم رفض إذن الميكروفون — اسمح بالوصول من إعدادات المتصفح وحاول مرة أخرى."
          : err instanceof DOMException && err.name === "NotFoundError"
          ? "لم يُعثر على ميكروفون متصل بالجهاز."
          : "تعذّر بدء التسجيل — تأكّد من وجود ميكروفون متاح.";
      setError(message);
      setStatus("error");
      stopStream();
    }
  }, []);

  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    clearTimer();
    setStatus("paused");
    // نحفظ لحظة الإيقاف لحساب المدة الصافية لاحقًا عند الاستئناف.
    pausedAtRef.current = Date.now();
  }, []);

  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    if (pausedAtRef.current) {
      pausedDurationRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    recorder.resume();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(
        Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000)
      );
    }, 250);
    setStatus("recording");
  }, []);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setStatus("stopped");
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    stopStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setAudioBlob(null);
    setElapsedSeconds(0);
    setError(null);
    setStatus("idle");
  }, []);

  return { status, elapsedSeconds, audioBlob, error, start, pause, resume, stop, reset };
}
