"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequestListItem } from "@/components/requests/RequestListItem";
import { RequestsEmptyState } from "@/components/requests/RequestsEmptyState";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { isBookingOverlapError } from "@/lib/bookings";
import {
  cancelRequest,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  respondToRequest,
  type CareRequest,
  type RequestStatus,
} from "@/lib/requests";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type RequestDirection = "incoming" | "outgoing";

function parseDirection(value: string | null): RequestDirection {
  return value === "outgoing" ? "outgoing" : "incoming";
}

function patchRequestStatus(requests: CareRequest[], id: string, status: RequestStatus): CareRequest[] {
  return requests.map((r) =>
    r.id === id
      ? {
          ...r,
          status,
          canRespond: false,
          canCancel: false,
        }
      : r,
  );
}

export function RequestsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const direction = parseDirection(searchParams.get("direction"));
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const isIncoming = direction === "incoming";

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = isIncoming
        ? await fetchIncomingRequests(supabase, user.id)
        : await fetchOutgoingRequests(supabase, user.id);
      setRequests(data);
    } catch (err) {
      setRequests([]);
      setLoadError(err instanceof Error ? err.message : t.requests.loadError);
    } finally {
      setLoading(false);
    }
  }, [supabase, user, isIncoming, t.requests.loadError]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/requests");
      return;
    }
    load();
  }, [authLoading, user, router, load, direction]);

  function setDirection(next: RequestDirection) {
    router.push(`/requests?direction=${next}`);
  }

  async function handleRespond(requestId: string, decision: "accepted" | "declined") {
    if (!user) return;
    setActingId(requestId);
    setActionError(null);
    setActionSuccess(null);
    const previous = requests;
    setRequests(patchRequestStatus(requests, requestId, decision));
    try {
      const { conversationId } = await respondToRequest(supabase, user.id, requestId, decision);
      const { sendRequestStatusEmailsAction } = await import("@/app/actions/email-events");
      void sendRequestStatusEmailsAction(requestId, decision);
      if (decision === "accepted" && conversationId) {
        router.push(`/messages?conversation=${conversationId}`);
        return;
      }
      setActionSuccess(
        decision === "accepted" ? t.requests.acceptedSuccess : t.requests.declinedSuccess,
      );
    } catch (err) {
      setRequests(previous);
      setActionError(
        isBookingOverlapError(err)
          ? t.requests.acceptOverlapError
          : err instanceof Error
            ? err.message
            : t.requests.respondError,
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleCancel(requestId: string) {
    if (!user) return;
    setActingId(requestId);
    setActionError(null);
    setActionSuccess(null);
    const previous = requests;
    setRequests(patchRequestStatus(requests, requestId, "cancelled"));
    try {
      await cancelRequest(supabase, user.id, requestId);
      setActionSuccess(t.requests.cancelledSuccess);
    } catch (err) {
      setRequests(previous);
      setActionError(err instanceof Error ? err.message : t.requests.respondError);
    } finally {
      setActingId(null);
    }
  }

  return (
    <DashboardShell
      title={t.requests.pageTitle}
      description={t.requests.pageDescription}
      hideCompleteProfileBanner
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDirection("incoming")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            isIncoming ? "swmp-tab-chip-active" : "swmp-tab-chip-inactive"
          }`}
        >
          {t.requests.tabIncoming}
        </button>
        <button
          type="button"
          onClick={() => setDirection("outgoing")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            !isIncoming ? "swmp-tab-chip-active" : "swmp-tab-chip-inactive"
          }`}
        >
          {t.requests.tabOutgoing}
        </button>
      </div>

      <p className="mb-4 text-sm text-muted">
        {isIncoming ? t.requests.tabIncomingHelp : t.requests.tabOutgoingHelp}
      </p>

      {loadError ? (
        <p className="mb-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p className="mb-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="mb-4 rounded-xl bg-mint/50 px-3 py-2 text-sm text-brand-teal" role="status">
          {actionSuccess}
        </p>
      ) : null}

      <section className="card-elevated rounded-3xl bg-[#f4f0e8]/40 p-4 dark:bg-surface sm:p-6 lg:p-8">
        {loading ? (
          <p className="px-2 py-8 text-center text-sm text-muted sm:py-12">{t.requests.loading}</p>
        ) : requests.length === 0 ? (
          <RequestsEmptyState isIncoming={isIncoming} />
        ) : (
          <ul className="space-y-4 sm:space-y-5">
            {requests.map((request) => (
              <RequestListItem
                key={request.id}
                request={request}
                direction={direction}
                acting={actingId === request.id}
                onAccept={isIncoming ? (id) => handleRespond(id, "accepted") : undefined}
                onDecline={isIncoming ? (id) => handleRespond(id, "declined") : undefined}
                onCancel={!isIncoming ? handleCancel : undefined}
              />
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
