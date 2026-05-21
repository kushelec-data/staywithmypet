"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export type ThemeOption = "light" | "dark" | "system";

const OPTIONS: { value: ThemeOption; Icon: typeof Sun }[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

type ThemeToggleProps = {
  className?: string;
  /** Compact icon button; opens a small menu. */
  variant?: "icon" | "inline";
};

export function ThemeToggle({ className = "", variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = (theme ?? "system") as ThemeOption;
  const ActiveIcon =
    active === "dark" ? Moon : active === "light" ? Sun : resolvedTheme === "dark" ? Moon : Sun;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const labels: Record<ThemeOption, string> = {
    light: t.theme.light,
    dark: t.theme.dark,
    system: t.theme.system,
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted ${className}`}
      />
    );
  }

  if (variant === "inline") {
    return (
      <div
        role="group"
        aria-label={t.theme.label}
        className={`inline-flex shrink-0 rounded-full bg-mint/45 p-0.5 shadow-sm ring-1 ring-border ${className}`}
      >
        {OPTIONS.map(({ value, Icon }) => {
          const selected = active === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={selected}
              title={labels[value]}
              className={`inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-all duration-200 sm:min-w-[2.5rem] sm:px-2.5 sm:py-1.5 ${
                selected
                  ? "bg-brand-teal text-white shadow-sm shadow-brand-teal/20"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{labels[value]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted shadow-sm transition-colors duration-150 hover:bg-mint/30 hover:text-foreground/80"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.theme.label}
        title={labels[active]}
      >
        <ActiveIcon className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[9.5rem] overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
          role="menu"
        >
          {OPTIONS.map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                active === value
                  ? "bg-brand-pink-muted text-brand-pink"
                  : "text-foreground/90 hover:bg-mint/40"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {labels[value]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
