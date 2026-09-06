"use client";

import { DASHBOARD_CALLOUT_CLASS, DASHBOARD_LINK_CLASS } from "@/lib/dashboard-theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { countUnviewedMatchSuggestions } from "@/lib/match-suggestions";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function DashboardMatchBanner() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void countUnviewedMatchSuggestions(supabase, user.id)
      .then((value) => {
        if (!cancelled) setCount(value);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  if (count <= 0) return null;

  return (
    <p className={DASHBOARD_CALLOUT_CLASS}>
      {t.matches.dashboardBanner.replace("{count}", String(count))}{" "}
      <Link href="/matches" className={DASHBOARD_LINK_CLASS}>
        {t.matches.viewMatches}
      </Link>
    </p>
  );
}
