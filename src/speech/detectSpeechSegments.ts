/**
 * الفراغات الصوتية (سكوت) داخل التسجيل هي السبب الموثَّق الأكبر لهلوسة
 * Whisper (يدخل في حلقة تكرار لأقرب كلمة قالها بدل ما يعترف إنه مفيش
 * كلام). الحل: كشف فترات الكلام الفعلي عبر طاقة الإشارة (RMS)، وتغذية
 * Whisper بهذه الفترات فقط — مع padding بسيط حول كل فترة حتى لا تُقطع
 * كلمة من منتصفها.
 */

export interface SpeechSegment {
  /** بداية الفترة بالثواني على المقياس الزمني الأصلي للملف كاملًا */
  startTime: number;
  /** نهاية الفترة بالثواني على نفس المقياس */
  endTime: number;
  samples: Float32Array;
}

interface DetectOptions {
  sampleRate: number;
  /** أقل مدة صمت (ثواني) تُعتبر فجوة حقيقية تستحق القطع عندها */
  minSilenceDuration?: number;
  /** إضافة زمنية حول كل فترة كلام حتى لا تُقطع بداية/نهاية كلمة */
  paddingSeconds?: number;
}

export function detectSpeechSegments(
  audio: Float32Array,
  options: DetectOptions
): SpeechSegment[] {
  const { sampleRate } = options;
  const minSilenceDuration = options.minSilenceDuration ?? 0.6;
  const padding = options.paddingSeconds ?? 0.2;

  const frameSize = Math.max(1, Math.round(0.03 * sampleRate)); // إطارات 30ms
  const frameCount = Math.ceil(audio.length / frameSize);

  const energies = new Float32Array(frameCount);
  let maxEnergy = 0;
  for (let f = 0; f < frameCount; f++) {
    const start = f * frameSize;
    const end = Math.min(audio.length, start + frameSize);
    let sumSquares = 0;
    for (let i = start; i < end; i++) sumSquares += audio[i]! * audio[i]!;
    const rms = Math.sqrt(sumSquares / Math.max(1, end - start));
    energies[f] = rms;
    if (rms > maxEnergy) maxEnergy = rms;
  }

  // ملف صامت بالكامل أو شبه فارغ — لا داعي للتقسيم، رجّع الأصل كما هو.
  if (maxEnergy < 1e-6) {
    return [{ startTime: 0, endTime: audio.length / sampleRate, samples: audio }];
  }

  // عتبة نسبية لتفادي الاعتماد على رقم ثابت يختلف تأثيره حسب مستوى تسجيل الملف.
  const threshold = maxEnergy * 0.04;
  const isSpeechFrame = new Uint8Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    isSpeechFrame[f] = energies[f]! > threshold ? 1 : 0;
  }

  const minSilenceFrames = Math.round(minSilenceDuration / 0.03);
  const paddingFrames = Math.round(padding / 0.03);

  const rawSegments: Array<[number, number]> = []; // [startFrame, endFrame)
  let segStart: number | null = null;
  let silenceRun = 0;

  for (let f = 0; f < frameCount; f++) {
    if (isSpeechFrame[f]) {
      if (segStart === null) segStart = f;
      silenceRun = 0;
    } else if (segStart !== null) {
      silenceRun++;
      if (silenceRun >= minSilenceFrames) {
        rawSegments.push([segStart, f - silenceRun + 1]);
        segStart = null;
        silenceRun = 0;
      }
    }
  }
  if (segStart !== null) rawSegments.push([segStart, frameCount]);

  // لا فترات كلام مكتشفة (نادر) — رجّع الملف كاملًا بدل مصفوفة فاضية.
  if (rawSegments.length === 0) {
    return [{ startTime: 0, endTime: audio.length / sampleRate, samples: audio }];
  }

  // لو فترة الصمت الكلية صغيرة جدًا (تقسيم غير مفيد عمليًا)، لا داعي
  // للتعقيد — رجّع الملف كاملًا ووفّر عبء المعالجة المتكررة.
  const totalSpeechFrames = rawSegments.reduce(
    (sum, [s, e]) => sum + (e - s),
    0
  );
  if (rawSegments.length === 1 && totalSpeechFrames >= frameCount * 0.95) {
    return [{ startTime: 0, endTime: audio.length / sampleRate, samples: audio }];
  }

  return rawSegments.map(([startFrame, endFrame]) => {
    const paddedStartFrame = Math.max(0, startFrame - paddingFrames);
    const paddedEndFrame = Math.min(frameCount, endFrame + paddingFrames);
    const startSample = paddedStartFrame * frameSize;
    const endSample = Math.min(audio.length, paddedEndFrame * frameSize);
    return {
      startTime: startSample / sampleRate,
      endTime: endSample / sampleRate,
      samples: audio.slice(startSample, endSample),
    };
  });
}
