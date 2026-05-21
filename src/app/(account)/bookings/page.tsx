import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

/** Legacy path → dashboard bookings. */
export default async function BookingsRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab ?? "upcoming";
  redirect(`/dashboard/bookings?tab=${tab}`);
}
