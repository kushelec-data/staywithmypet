import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ direction?: string }>;
};

/** Alias for /requests (used by notification links). */
export default async function DashboardRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const direction = params.direction === "outgoing" ? "outgoing" : "incoming";
  redirect(`/requests?direction=${direction}`);
}
