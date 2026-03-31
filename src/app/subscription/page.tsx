"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type PlanRow = {
  plan: string;
  label: string;
  out_sum: string;
  currency: string;
};

type StatusPayload = {
  has_active_subscription: boolean;
  admin_full_access: boolean;
  current_period: { ends_at: string | null; plan: string | null } | null;
  free_tier: { topic_id: string | null; task_limit: number; free_task_ids: string[] };
};

export default function SubscriptionPage() {
  const token = useRequireAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [p, s] = await Promise.all([
        apiFetch<{ plans: PlanRow[] }>("/api/subscription/plans"),
        apiFetch<StatusPayload>("/api/subscription/status", { token }),
      ]);
      setPlans(p.plans ?? []);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function checkout(plan: string) {
    if (!token) return;
    setBusy(plan);
    setError(null);
    try {
      const res = await apiFetch<{ redirect_url: string }>("/api/subscription/checkout", {
        method: "POST",
        token,
        body: { plan },
      });
      window.location.href = res.redirect_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать платёж");
    } finally {
      setBusy(null);
    }
  }

  const active = status?.has_active_subscription || status?.admin_full_access;

  return (
    <AppShell title="Подписка">
      {error ? <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p> : null}

      {active ? (
        <div className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 8 }}>
            У вас есть полный доступ
          </h2>
          {status?.current_period?.ends_at ? (
            <p className="pt-muted" style={{ margin: 0 }}>
              Активный период до{" "}
              {new Date(status.current_period.ends_at).toLocaleString("ru-RU", {
                dateStyle: "long",
                timeStyle: "short",
              })}
              {status.current_period.plan ? ` · тариф «${status.current_period.plan}»` : null}
            </p>
          ) : (
            <p className="pt-muted" style={{ margin: 0 }}>
              Администратор или активная подписка.
            </p>
          )}
        </div>
      ) : (
        <div className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
          <p className="pt-muted" style={{ margin: 0, lineHeight: 1.6 }}>
            Без подписки доступны названия задач по всем разделам; условие и режимы решения — по{" "}
            <Link href="/practice">лимиту в бесплатном разделе</Link> (настраивается администратором) и для уже
            начатых задач. Теория открыта только в этом разделе. Экзамены — по подписке.
          </p>
        </div>
      )}

      <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
        Тарифы
      </h2>
      {!plans.length ? (
        <p className="pt-muted">Тарифы не настроены на сервере (цены в переменных окружения).</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {plans.map((row) => (
            <li key={row.plan} className="pt-card" style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="pt-heading" style={{ fontSize: "1rem" }}>
                  {row.label}
                </div>
                <div className="pt-muted" style={{ fontSize: "0.9rem" }}>
                  {row.out_sum} {row.currency}
                </div>
              </div>
              <button
                type="button"
                className="pt-btn pt-btn-primary"
                disabled={!!busy || active}
                onClick={() => void checkout(row.plan)}
              >
                {busy === row.plan ? "Переход…" : active ? "Уже активно" : "Оплатить в Robokassa"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="pt-muted" style={{ marginTop: 24, fontSize: "0.85rem", lineHeight: 1.5 }}>
        Оплата обрабатывается Robokassa. Подписка начинает действовать с момента подтверждения платежа.
      </p>
    </AppShell>
  );
}
