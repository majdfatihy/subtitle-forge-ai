import { ThemeToggle } from "./ThemeToggle";
import { LocaleToggle } from "@/i18n/LocaleToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="/" className="text-sm font-semibold text-text">
          SubtitleForge
        </a>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleToggle />
        </div>
      </div>
    </header>
  );
}
