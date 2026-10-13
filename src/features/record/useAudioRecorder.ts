import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "stopped" | "error";

interface UseAudioRecorderResult {
  status: RecorderStatus;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  error: string | null;
  /** 0 إلى 1 — مستوى الصوت الحي أثناء التسجيل، لرسم مؤشر Waveform حقيقي يثبت أن المايك شغّال فعليًا. */
  audioLevel: number;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

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
  return undefined;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  // مكوّنات تحليل الصوت الحي — لمؤشر المستوى فقط، لا علاقة لها بالتسجيل نفسه.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopLevelMeter = () => {
    if (levelFrameRef.current) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimer();
      stopLevelMeter();
      stopStream();
    };
  }, []);

  const startLevelMeter = (stream: MediaStream) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      // RMS بسيط حول نقطة المنتصف (128) — يعطي إحساسًا بمستوى الصوت الفعلي.
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i]! - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setAudioLevel(Math.min(1, rms * 4)); // تضخيم بسيط ليكون المؤشر محسوسًا بصريًا
      levelFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startLevelMeter(stream);

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
        stopLevelMeter();
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
    } catch (err) {
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
    stopLevelMeter();
    stopStream();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setAudioBlob(null);
    setElapsedSeconds(0);
    setError(null);
    setStatus("idle");
  }, []);

  return { status, elapsedSeconds, audioBlob, error, audioLevel, start, pause, resume, stop, reset };
}
