"use client";

import { useState } from "react";

type Props = {
  userId: string;
  planId: string;
};

export function TestPetParentCheckoutButton({ userId, planId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "pet_parent",
          planId,
          userId,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      if (!data.url) {
        throw new Error(data.error ?? "Checkout session missing URL.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? "Starting checkout…" : "Test Pet Parent Checkout"}
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
