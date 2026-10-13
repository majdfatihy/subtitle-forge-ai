import { useState } from "react";
import { transcribeCloud, PROVIDERS } from "@/speech/cloudEngines";
import { getStoredKey, setStoredKey } from "@/speech/apiKeyStorage";
import { getLastSettings, setLastSettings } from "@/speech/lastSettings";
import { segmentWords } from "@/subtitles/segmentation";
import type { ProviderId } from "@/speech/cloudEngines";
import type { SubtitleTrack } from "@/models/subtitle";
import type { ExtractedAudio } from "@/models/media";

type Status = "idle" | "transcribing" | "done" | "error";

const LANGUAGE_OPTIONS = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "الإنجليزية" },
  { value: "fr", label: "الفرنسية" },
  { value: "auto", label: "اكتشاف تلقائي" },
];

interface TranscribePanelProps {
  audio: ExtractedAudio;
  sourceFile: File;
  onTranscribed: (track: SubtitleTrack, audioBlob: Blob) => void;
}

const lastSettings = getLastSettings();

export function TranscribePanel({ audio, onTranscribed }: TranscribePanelProps) {
  const [providerId, setProviderId] = useState<ProviderId>(lastSettings?.provider ?? "groq");
  const [apiKey, setApiKey] = useState(() => getStoredKey(providerId));
  const [model, setModel] = useState(
    lastSettings?.model ?? PROVIDERS.find((p) => p.id === providerId)!.models[0]!.value
  );
  const [language, setLanguage] = useState(lastSettings?.language ?? "ar");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const isBusy = status === "transcribing";

  const handleProviderChange = (id: ProviderId) => {
    setProviderId(id);
    setApiKey(getStoredKey(id));
    const newModel = PROVIDERS.find((p) => p.id === id)!.models[0]!.value;
    setModel(newModel);
    setLastSettings({ provider: id, model: newModel, language });
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    setLastSettings({ provider: providerId, model: value, language });
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    setLastSettings({ provider: providerId, model, language: value });
  };

  const handleKeyChange = (key: string) => {
    setApiKey(key);
    setStoredKey(providerId, key);
  };

  const handleTranscribe = async () => {
    setError(null);
    setStatus("transcribing");
    try {
      const result = await transcribeCloud(audio.blob, { provider: providerId, apiKey, model, language });
      const track: SubtitleTrack = { language: result.language, cues: segmentWords(result.words) };
      setStatus("done");
      onTranscribed(track, audio.blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر التفريغ.");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4 rounded-sf border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-text">التفريغ النصي</p>

      <div className="space-y-2">
        <p className="text-xs text-muted">خدمة التفريغ</p>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => (
            <button key={p.id} type="button" disabled={isBusy}
              onClick={() => handleProviderChange(p.id)}
              className={`rounded-sf border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                providerId === p.id ? "border-accent bg-accent/10 text-text" : "border-border text-muted hover:text-text"
              }`}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{provider.freeNote}</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="sf-field-key" className="block text-xs text-muted">
          مفتاح {provider.name} —{" "}
          <a href={provider.signupUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">
            احصل عليه مجانًا
          </a>
        </label>
        <input
          id="sf-field-key"
          name="sf-field-k7x"
          type="text"
          value={apiKey}
          disabled={isBusy}
          onChange={(e) => handleKeyChange(e.target.value)}
          placeholder={provider.keyPlaceholder}
          autoComplete="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          data-form-type="other"
          className="w-full rounded-sf border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted disabled:opacity-50"
        />
        <p className="text-xs text-muted">يُحفَظ في متصفحك فقط — تلقائيًا مع كل كتابة.</p>
      </div>

      {provider.models.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-muted">النموذج</p>
          <div className="flex flex-wrap gap-2">
            {provider.models.map((m) => (
              <button key={m.value} type="button" disabled={isBusy}
                onClick={() => handleModelChange(m.value)}
                className={`rounded-sf border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                  model === m.value ? "border-accent bg-accent/10 text-text" : "border-border text-muted hover:text-text"
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="lang-select" className="block text-xs text-muted">اللغة</label>
        <select id="lang-select" value={language} disabled={isBusy}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full rounded-sf border border-border bg-bg px-3 py-2 text-sm text-text disabled:opacity-50">
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <button type="button" disabled={isBusy || !apiKey.trim()} onClick={handleTranscribe}
        className="w-full rounded-sf bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
        {isBusy ? "جارٍ التفريغ…" : status === "done" ? "تفريغ مجددًا" : "ابدأ التفريغ النصي"}
      </button>

      {isBusy && (
        <p className="animate-pulse text-center text-xs text-muted">
          {providerId === "assemblyai" ? "جارٍ الرفع والمعالجة… 30-60 ثانية." : `جارٍ التفريغ عبر ${provider.name}…`}
        </p>
      )}

      {status === "done" && (
        <p className="text-center text-xs text-green-500">✅ اكتمل التفريغ — المحرر في العمود الآخر</p>
      )}

      {error && (
        <div className="rounded-sf border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-500">{error}</p>
          <button type="button" className="mt-1 text-xs text-muted underline" onClick={() => setError(null)}>إغلاق</button>
        </div>
      )}
    </div>
  );
}
