import { useTheme, type ThemePreference } from "@/hooks/useTheme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "فاتح" },
  { value: "dark", label: "غامق" },
  { value: "system", label: "حسب النظام" },
];

export function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="مظهر الواجهة"
      className="inline-flex items-center gap-1 rounded-sf border border-border bg-surface p-1"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            className={[
              "rounded-[8px] px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent text-bg"
                : "text-muted hover:text-text",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
