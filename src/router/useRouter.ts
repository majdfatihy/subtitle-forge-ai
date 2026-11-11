import { useEffect, useState, useCallback } from "react";

/**
 * موجّه خفيف بدون أي مكتبة خارجية (لا react-router) — كافٍ لعدد صغير
 * من الصفحات الثابتة. يدعم زر الرجوع/التقدّم في المتصفح، ويعترض ضغطات
 * الروابط الداخلية ليمنع تحميل الصفحة الكامل (نفس سلوك SPA طبيعي).
 */
export function useRouter() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);

    // اعتراض كل ضغطات <a href="/..."> الداخلية — تمنع إعادة تحميل الصفحة.
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || !href.startsWith("/") || target.target === "_blank") return;
      e.preventDefault();
      window.history.pushState({}, "", href);
      setPath(href);
      window.scrollTo(0, 0);
    };
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
}
