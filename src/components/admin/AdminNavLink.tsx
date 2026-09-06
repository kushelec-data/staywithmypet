"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function AdminNavLink({
  className,
  onClick,
}: {
  className: string;
  onClick?: () => void;
}) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setShow(false);
      return;
    }
    let cancelled = false;
    void fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : { admin: false }))
      .then((data: { admin?: boolean }) => {
        if (!cancelled) setShow(Boolean(data.admin));
      })
      .catch(() => {
        if (!cancelled) setShow(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!show) return null;
  return (
    <Link href="/admin" onClick={onClick} className={className} role="menuitem">
      Admin
    </Link>
  );
}
