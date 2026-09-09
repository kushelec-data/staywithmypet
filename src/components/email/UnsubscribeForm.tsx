"use client";

import { useState } from "react";

export function UnsubscribeForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  async function submit() {
    const res = await fetch(`/api/email/unsubscribe/${token}`, { method: "POST" });
    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return <p className="mt-6 text-sm">You are unsubscribed from marketing campaign emails.</p>;
  }

  return (
    <div className="mt-6">
      <button type="button" onClick={() => void submit()} className="rounded-full bg-[#2E6B3F] px-4 py-2 text-sm font-semibold text-white">
        Unsubscribe from marketing emails
      </button>
      {status === "error" ? <p className="mt-3 text-sm text-red-700">This unsubscribe link is invalid or expired.</p> : null}
    </div>
  );
}
