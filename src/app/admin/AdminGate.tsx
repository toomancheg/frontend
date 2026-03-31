"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Me = {
  email: string;
  role: string;
};

export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const token = useRequireAuth();

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const me = await apiFetch<Me>("/api/auth/me", { token });
        if (me.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        setEmail(me.email);
        setReady(true);
      } catch {
        router.replace("/auth/login");
      }
    })();
  }, [router, token]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1f2e", color: "#e8ecf4", padding: 24 }}>
        <p>Проверка доступа…</p>
      </div>
    );
  }

  return <AdminShell userEmail={email}>{children}</AdminShell>;
}
