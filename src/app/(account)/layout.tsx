import AccountLayoutClient from "./AccountLayoutClient";

/** Account routes depend on auth/session — never statically prerender at build time. */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
