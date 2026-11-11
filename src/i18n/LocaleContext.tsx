import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Locale, type TranslationKey } from "./translations";

const STORAGE_KEY = "subtitleforge:locale";

function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    // تجاهل
  }
  // اكتشاف تلقائي من لغة المتصفح — أي لهجة عربية (ar-EG، ar-SA...) تُحسَب عربي.
  const browserLang = typeof navigator !== "undefined" ? navigator.language : "ar";
  return browserLang.toLowerCase().startsWith("ar") ? "ar" : "en";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // تجاهل
    }
  }, [locale]);

  const setLocale = (l: Locale) => setLocaleState(l);
  const t = (key: TranslationKey): string => translations[locale][key] ?? translations.ar[key];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale يجب أن يُستخدم داخل LocaleProvider");
  return ctx;
}
