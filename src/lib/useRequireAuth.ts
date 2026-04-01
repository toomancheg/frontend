"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getAccessToken, getRefreshToken, setTokens, subscribeAuthChanges } from "@/lib/auth";

function authLog(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const enabled =
    window.location.search.includes("ptlog=1") || localStorage.getItem("phystr:ui:log") === "1";
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.info(`[ui][auth] ${event}`, data ?? {});
}

export function useRequireAuth(): string | null {
  const router = useRouter();
  // IMPORTANT: do not read localStorage during initial render.
  // Otherwise server HTML (token=null) may not match client first render (token!=null).
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const sync = () => {
      const next = getAccessToken();
      authLog("token.sync", { hasToken: Boolean(next) });
      setToken(next);
    };
    sync();
    return subscribeAuthChanges(sync);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (token) return;

    let cancelled = false;
    (async () => {
      try {
        authLog("refresh.start");
        const storedRefresh = getRefreshToken();
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(storedRefresh ? { refresh_token: storedRefresh } : {}),
        });
        authLog("refresh.response", { ok: res.ok, status: res.status });
        if (!res.ok) throw new Error("Unauthenticated");
        const data = (await res.json()) as {
          access_token: string;
          refresh_token?: string;
        };
        if (!cancelled && data.access_token) {
          authLog("refresh.success", { hasRefresh: Boolean(data.refresh_token) });
          setTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? "",
          });
        }
      } catch {
        if (!cancelled) {
          authLog("refresh.fail.redirect_login");
          router.replace("/auth/login");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, token, router]);

  return token;
}
