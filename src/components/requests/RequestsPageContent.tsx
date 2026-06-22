"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { AccountTabs } from "@/components/account/AccountTabs";
import {
  ACCOUNT_ALERT_ERROR_CLASS,
  ACCOUNT_ALERT_SUCCESS_CLASS,
} from "@/lib/account-ui";
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
import { markRequestNotificationsRead } from "@/lib/notifications";
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
      console.error("[request:list] page load failed", err);
      setRequests([]);
      setLoadError(err instanceof Error ? err.message : t.requests.loadError);
    } finally {
      setLoading(false);
    }
  }, [supabase, user, isIncoming, t.requests.loadError]);

  useEffect(() => {
    if (!user) return;
    void markRequestNotificationsRead(supabase, user.id).catch(() => {
      /* bell will reconcile on next refresh */
    });
  }, [supabase, user?.id, direction]);

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
      try {
        const { sendRequestStatusEmailsAction } = await import("@/app/actions/email-events");
        await sendRequestStatusEmailsAction(requestId, decision);
      } catch (emailErr) {
        console.error("[email-event] accept/decline action failed", emailErr);
      }
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
      try {
        const { sendRequestCancelledEmailsAction } = await import("@/app/actions/email-events");
        await sendRequestCancelledEmailsAction(requestId);
      } catch (emailErr) {
        console.error("[email-event] cancel action failed", emailErr);
      }
      setActionSuccess(t.requests.cancelledSuccess);
    } catch (err) {
      setRequests(previous);
      setActionError(err instanceof Error ? err.message : t.requests.respondError);
    } finally {
      setActingId(null);
    }
  }

  return (
    <AccountLayout
      title={t.requests.pageTitle}
      description={t.requests.pageDescription}
      hideCompleteProfileBanner
    >
      <AccountTabs
        tabs={[
          { id: "incoming" as const, label: t.requests.tabIncoming },
          { id: "outgoing" as const, label: t.requests.tabOutgoing },
        ]}
        activeId={direction}
        onChange={setDirection}
        className="mb-4"
        aria-label={t.requests.pageTitle}
      />

      <p className="mb-4 text-sm text-muted">
        {isIncoming ? t.requests.tabIncomingHelp : t.requests.tabOutgoingHelp}
      </p>

      {loadError ? (
        <p className={`mb-4 ${ACCOUNT_ALERT_ERROR_CLASS}`} role="alert">
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p className={`mb-4 ${ACCOUNT_ALERT_ERROR_CLASS}`} role="alert">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className={`mb-4 ${ACCOUNT_ALERT_SUCCESS_CLASS}`} role="status">
          {actionSuccess}
        </p>
      ) : null}

      <AccountCard className="p-4 sm:p-6 lg:p-8">
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
      </AccountCard>
    </AccountLayout>
  );
}
