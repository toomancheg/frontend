"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { apiFetch } from "@/lib/api";
import { getSubjectPrefixFromPathname } from "@/lib/subject";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Me = {
  email: string;
  role: string;
};

export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = useRequireAuth();

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setError(null);
        const me = await apiFetch<Me>("/api/auth/me", { token });
        if (me.role !== "admin") {
          const prefix = getSubjectPrefixFromPathname(pathname);
          const subject = prefix ? prefix.slice(1) : "physics";
          router.replace(`/${subject}/dashboard`);
          return;
        }
        setEmail(me.email);
        setReady(true);
      } catch {
        setError("Не удалось проверить права администратора. Похоже, сессия истекла — войдите заново.");
      }
    })();
  }, [router, token, pathname]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1f2e", color: "#e8ecf4", padding: 24 }}>
        <p>Проверка доступа…</p>
        {error ? (
          <p style={{ marginTop: 12, color: "#fca5a5" }}>
            {error}{" "}
            <Link href="/auth/login" style={{ color: "#e8ecf4", textDecoration: "underline" }}>
              Перейти к входу
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return <AdminShell userEmail={email}>{children}</AdminShell>;
}
