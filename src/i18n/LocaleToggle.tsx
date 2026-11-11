import { useLocale } from "./LocaleContext";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      // عرض ثابت (w-12) يمنع قفزة الزرار عند تبديل بين "EN" و"AR"
      // (كانا بعرضين مختلفين فيعمل إزاحة في باقي الشريط).
      className="inline-flex w-12 items-center justify-center rounded-sf border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20"
      title={locale === "ar" ? "Switch to English" : "التبديل للعربية"}
    >
      {locale === "ar" ? "EN" : "AR"}
    </button>
  );
}
