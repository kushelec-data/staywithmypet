import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";

type AccountCardProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">;

export function AccountCard({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: AccountCardProps) {
  return (
    <Tag className={`${ACCOUNT_CARD_CLASS} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
