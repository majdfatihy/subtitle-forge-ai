import { useEffect } from "react";
import { LocaleProvider, useLocale } from "@/i18n/LocaleContext";
import { useRouter } from "@/router/useRouter";
import { Header } from "@/components/Header";
import { Home } from "@/pages/Home";
import { About } from "@/pages/static/About";
import { HowToUse } from "@/pages/static/HowToUse";
import { Contact } from "@/pages/static/Contact";
import { Privacy } from "@/pages/static/Privacy";
import { Terms } from "@/pages/static/Terms";


/** Route-specific search metadata for the existing client-side informational pages. */
const seoPages = {
  "/": {
    ar: {
      title: "Subtitle Forge AI | تفريغ الصوت والفيديو إلى نص وإنشاء ترجمة SRT وVTT",
      description: "أداة Subtitle Forge AI لتفريغ الصوت والفيديو إلى نص، وإنشاء وتعديل ملفات الترجمة SRT وVTT وTXT وASS، مع دعم العربية والإنجليزية والعمل عبر المتصفح.",
    },
    en: {
      title: "Subtitle Forge AI | Audio & Video Transcription and SRT Subtitles",
      description: "Transcribe audio and video with a supported speech provider, then edit and export SRT, VTT, TXT, JSON or ASS subtitle files using Subtitle Forge AI in your browser.",
    },
  },
  "/about": {
    title: "عن Subtitle Forge AI | تفريغ الفيديو والصوت إلى نص",
    description: "تعرف على أداة Subtitle Forge AI لتفريغ ملفات الصوت والفيديو وتحرير الترجمة، وطريقة معالجة الملفات محليًا والتفريغ عبر خدمة خارجية تختارها.",
  },
  "/how-to-use": {
    title: "طريقة استخدام Subtitle Forge AI | إنشاء ترجمة SRT وVTT",
    description: "خطوات تفريغ الصوت من الفيديو عبر Groq أو Deepgram أو AssemblyAI أو Gladia، وتحرير النص والتوقيتات، ثم تصدير ملفات الترجمة SRT وVTT وASS.",
  },
  "/contact": {
    title: "تواصل مع Subtitle Forge AI",
    description: "صفحة التواصل الخاصة بمشروع Subtitle Forge AI.",
  },
  "/privacy": {
    title: "سياسة خصوصية Subtitle Forge AI | معالجة الملفات والتفريغ",
    description: "تفاصيل معالجة الفيديو والصوت محليًا في المتصفح، وإرسال الصوت إلى خدمات التفريغ الخارجية التي تختارها، وتخزين المشاريع ومفاتيح API.",
  },
  "/terms": {
    title: "شروط استخدام Subtitle Forge AI | التفريغ والترجمة",
    description: "شروط استخدام أداة Subtitle Forge AI لتفريغ الصوت والفيديو وإنشاء الترجمة، ومسؤولية المحتوى وحدود دقة الخدمات الخارجية.",
  },
};

function updateSeo(path: string, locale: "ar" | "en") {
  const key = Object.prototype.hasOwnProperty.call(seoPages, path) ? path : "/";
  const item = seoPages[key as keyof typeof seoPages];
  const localized = "ar" in item ? item[locale] : item;
  const url = "https://subtitle-forge-ai.vercel.app" + (key === "/" ? "/" : key);
  document.title = localized.title;
  const setMeta = (selector: string, value: string) => {
    document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", value);
  };
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", url);
  setMeta('meta[name="description"]', localized.description);
  setMeta('meta[name="robots"]', key === "/contact" ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1");
  setMeta('meta[property="og:title"]', localized.title);
  setMeta('meta[property="og:description"]', localized.description);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[property="og:locale"]', locale === "ar" ? "ar_EG" : "en_US");
  setMeta('meta[name="twitter:title"]', localized.title);
  setMeta('meta[name="twitter:description"]', localized.description);
}

function Router() {
  const { path } = useRouter();
  const { locale } = useLocale();
  useEffect(() => updateSeo(path, locale), [path, locale]);
  switch (path) {
    case "/about":
      return <About />;
    case "/how-to-use":
      return <HowToUse />;
    case "/contact":
      return <Contact />;
    case "/privacy":
      return <Privacy />;
    case "/terms":
      return <Terms />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <LocaleProvider>
      <Header />
      <Router />
    </LocaleProvider>
  );
}
