import type { ReactNode } from "react";
import { ACCOUNT_CARD_CLASS } from "@/lib/account-ui";

type AccountCardProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
};

export function AccountCard({ children, className = "", as: Tag = "section" }: AccountCardProps) {
  return <Tag className={`${ACCOUNT_CARD_CLASS} ${className}`.trim()}>{children}</Tag>;
}
