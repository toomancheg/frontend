"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getAccessToken, setTokens, subscribeAuthChanges } from "@/lib/auth";

export function useRequireAuth(): string | null {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(() => getAccessToken());

  useEffect(() => {
    const sync = () => {
      setToken(getAccessToken());
    };
    return subscribeAuthChanges(sync);
  }, []);

  useEffect(() => {
    if (token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error("Unauthenticated");
        const data = (await res.json()) as {
          access_token: string;
          refresh_token?: string;
        };
        if (!cancelled && data.access_token) {
          setTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? "",
          });
        }
      } catch {
        if (!cancelled) {
          router.replace("/auth/login");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return token;
}
