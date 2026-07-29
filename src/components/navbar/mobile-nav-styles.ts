export function mobileNavRowClass(active: boolean, tealActive = false) {
  return `flex min-h-[48px] w-full min-w-0 max-w-full items-center gap-3 rounded-xl px-4 py-2.5 text-base font-medium leading-snug transition-colors ${
    active
      ? tealActive
        ? "bg-mint/60 text-brand-teal"
        : "bg-brand-pink-muted text-brand-pink"
      : "text-foreground/90 active:bg-mint/40 hover:bg-mint/30"
  }`;
}

export function mobileNavSectionClass() {
  return "min-w-0 max-w-full px-3 py-2";
}
