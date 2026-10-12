const TARGET_SAMPLE_RATE = 16000;

/**
 * يحوّل Blob صوت (ناتج MediaEngine.extractAudio — WAV 16kHz) إلى
 * Float32Array بمعدل 16kHz فعليًا ومضمون — وهذا بالضبط ما يتوقعه Whisper.
 *
 * ملاحظة مهمة: AudioContext العادي (decodeAudioData مباشرة) يعيد أخذ
 * العيّنات تلقائيًا لمعدل جهاز المستخدم الافتراضي (44.1kHz أو 48kHz
 * غالبًا)، بغض النظر عن معدل عيّنة الملف الأصلي. لهذا نستخدم
 * OfflineAudioContext لإعادة العرض صراحة بمعدل 16kHz — بدون هذه الخطوة
 * كان الصوت يُقرأ "أبطأ 3 مرات" من الحقيقي، فيأخذ التفريغ وقتًا أطول
 * بكثير من اللازم (وقد يبدو وكأنه معلّق رغم أنه يعمل فعليًا).
 */
export async function decodeAudioToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  const decodingCtx = new AudioContextCtor();
  const decoded = await decodingCtx.decodeAudioData(arrayBuffer);
  await decodingCtx.close();

  const targetLength = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offlineCtx = new OfflineAudioContext(1, targetLength, TARGET_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();

  return rendered.getChannelData(0);
}
