"use client";

import { ReportUserModal } from "@/components/trust/ReportUserModal";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  blockUser,
  fetchBlockedUserIds,
  formatTrustSafetyError,
  unblockUser,
} from "@/lib/trust-safety";
import { createClient } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type UserSafetyActionsProps = {
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  layout?: "row" | "stack";
  className?: string;
  onBlockChange?: (blocked: boolean) => void;
};

export function UserSafetyActions({
  currentUserId,
  targetUserId,
  targetUserName,
  layout = "row",
  className = "",
  onBlockChange,
}: UserSafetyActionsProps) {
  const { t } = useLanguage();
  const ts = t.trustSafety;
  const supabase = useMemo(() => createClient(), []);

  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isSelf = currentUserId === targetUserId;

  useEffect(() => {
    if (isSelf) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchBlockedUserIds(supabase, currentUserId)
      .then((ids) => {
        if (!cancelled) setBlocked(ids.has(targetUserId));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabase, currentUserId, targetUserId, isSelf]);

  if (isSelf) return null;

  async function handleBlockToggle() {
    setActing(true);
    setMessage(null);
    try {
      if (blocked) {
        await unblockUser(supabase, currentUserId, targetUserId);
        setBlocked(false);
        onBlockChange?.(false);
        setMessage(ts.unblockSuccess);
      } else {
        const confirmed = window.confirm(
          ts.blockConfirm.replace("{name}", targetUserName),
        );
        if (!confirmed) return;
        await blockUser(supabase, currentUserId, targetUserId);
        setBlocked(true);
        onBlockChange?.(true);
        setMessage(ts.blockSuccess);
      }
    } catch (err) {
      setMessage(formatTrustSafetyError(err));
    } finally {
      setActing(false);
    }
  }

  const layoutClass =
    layout === "stack" ? "flex flex-col gap-2" : "flex flex-wrap gap-2";

  return (
    <>
      <div className={`${layoutClass} ${className}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || acting}
          onClick={() => setReportOpen(true)}
        >
          {ts.reportUser}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading || acting}
          onClick={() => void handleBlockToggle()}
        >
          {blocked ? ts.unblockUser : ts.blockUser}
        </Button>
      </div>
      {message ? (
        <p className="mt-2 text-xs text-muted" role="status">
          {message}
        </p>
      ) : null}

      <ReportUserModal
        open={reportOpen}
        reportedUserId={targetUserId}
        reportedUserName={targetUserName}
        reporterId={currentUserId}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
