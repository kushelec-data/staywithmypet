import { UnsubscribeForm } from "@/components/email/UnsubscribeForm";

export default async function EmailUnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold">Unsubscribe</h1>
      <p className="mt-3 text-sm text-muted">
        This stops Stay With My Pet marketing campaign emails. Transactional messages about your account are not affected.
      </p>
      <UnsubscribeForm token={token} />
    </main>
  );
}
