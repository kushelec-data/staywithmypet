import { PAGE_CONTAINER, PAGE_SECTION } from "@/lib/layout";

type PageMainProps = {
  children: React.ReactNode;
  className?: string;
  tight?: boolean;
};

export function PageMain({ children, className = "", tight = false }: PageMainProps) {
  return (
    <section className={tight ? "section-pad-tight" : PAGE_SECTION}>
      <div className={`${PAGE_CONTAINER} ${className}`}>{children}</div>
    </section>
  );
}
