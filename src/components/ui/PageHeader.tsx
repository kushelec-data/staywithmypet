import { PageHero } from "@/components/layout/PageHero";

type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
};

/** @deprecated Prefer PageHero directly for new pages */
export function PageHeader({ title, description, badge }: PageHeaderProps) {
  return <PageHero badge={badge} title={title} description={description} />;
}
