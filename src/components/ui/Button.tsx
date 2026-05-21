import Link from "next/link";
import { type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "soft";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-teal text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-hover hover:shadow-lg",
  secondary:
    "bg-lavender text-foreground shadow-sm hover:bg-pastel-blue/50 border border-black/5",
  outline:
    "border border-black/10 bg-surface text-foreground shadow-sm hover:border-brand-teal/30 hover:bg-mint/40",
  ghost: "text-muted hover:bg-mint/50 hover:text-foreground",
  soft: "bg-mint/60 text-brand-teal shadow-sm hover:bg-mint",
};

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizes = {
  sm: "min-h-[40px] px-5 py-2.5 text-sm gap-1.5",
  md: "min-h-[44px] px-6 py-3 text-sm gap-2 sm:px-7 sm:text-base",
  lg: "min-h-[44px] w-full px-6 py-3 text-sm gap-2 sm:w-auto sm:min-h-[48px] sm:px-8 sm:py-3.5 sm:text-base",
  xl: "min-h-[48px] w-full px-8 py-4 text-base gap-3 sm:w-auto sm:px-11 sm:text-lg",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  size = "md",
  href,
  type = "button",
  ...rest
}: BaseProps &
  (
    | { href: string; type?: never }
    | { href?: never; type?: "button" | "submit" }
  ) &
  React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes = `btn-interactive inline-flex items-center justify-center rounded-full font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
