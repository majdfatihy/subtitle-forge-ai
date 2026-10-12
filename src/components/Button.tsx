import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sf px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-bg hover:bg-accent-strong",
        variant === "secondary" &&
          "border border-border bg-surface text-text hover:border-accent",
        variant === "ghost" && "text-muted hover:text-text",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
