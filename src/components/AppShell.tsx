import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * الهيكل العام للواجهة. لا يحتوي أي منطق معالجة — فقط الإطار البصري
 * (شريط علوي + منطقة محتوى) الذي ستُبنى فوقه الصفحة الرئيسية في الجلسة القادمة.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full bg-accent"
          />
          <span className="font-semibold tracking-tight">SubtitleForge</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>

      <footer className="border-t border-border px-4 py-4 text-xs text-muted sm:px-6">
        معالجة محلية بالكامل — ملفك لا يُرسَل إلى أي خادم.
      </footer>
    </div>
  );
}
