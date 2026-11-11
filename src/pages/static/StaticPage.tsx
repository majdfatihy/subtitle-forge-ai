import type { ReactNode } from "react";

interface StaticPageProps {
  title: string;
  children: ReactNode;
}

export function StaticPage({ title, children }: StaticPageProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <a href="/" className="mb-6 inline-block text-sm text-accent hover:underline">
        ← الرجوع للرئيسية
      </a>
      <h1 className="mb-6 text-2xl font-semibold text-text">{title}</h1>
      <div className="space-y-4 text-sm leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text">
        {children}
      </div>
    </div>
  );
}
