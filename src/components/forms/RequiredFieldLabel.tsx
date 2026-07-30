"use client";

import type { ReactNode } from "react";
import { FORM_FIELD_LABEL_CLASS, FORM_FIELD_LEGEND_CLASS } from "@/lib/form-field-styles";

type RequiredFieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  as?: "label" | "legend" | "span";
  className?: string;
};

export function RequiredFieldLabel({
  htmlFor,
  required = false,
  children,
  as = "label",
  className,
}: RequiredFieldLabelProps) {
  const Tag = as === "legend" ? "legend" : as === "span" ? "span" : "label";
  const baseClass =
    as === "legend" ? FORM_FIELD_LEGEND_CLASS : FORM_FIELD_LABEL_CLASS;

  return (
    <Tag htmlFor={as === "label" ? htmlFor : undefined} className={className ?? baseClass}>
      {children}
      {required ? (
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </Tag>
  );
}

type FormFieldErrorProps = {
  id?: string;
  message: string | null | undefined;
};

export function FormFieldError({ id, message }: FormFieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-500" role="alert">
      {message}
    </p>
  );
}

type FormFieldHelperProps = {
  children: ReactNode;
  className?: string;
};

export function FormFieldHelper({ children, className }: FormFieldHelperProps) {
  return <p className={className ?? "mt-1 text-xs text-muted"}>{children}</p>;
}
