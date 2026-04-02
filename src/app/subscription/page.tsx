"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { SubjectLink } from "@/components/routing/SubjectLink";
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
  has_active_general_subscription: boolean;
  admin_full_access: boolean;
  current_period: { ends_at: string | null; plan: string | null } | null;
  current_general_period: { ends_at: string | null; plan: string | null } | null;
  free_tier: { topic_id: string | null; task_limit: number; free_task_ids: string[] };
};

export default function SubscriptionPage() {
  const token = useRequireAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [generalPlans, setGeneralPlans] = useState<PlanRow[]>([]);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [p, s] = await Promise.all([
        apiFetch<{ subject_plans: PlanRow[]; general_plans: PlanRow[] }>(`/api/subscription/plans`),
        apiFetch<StatusPayload>("/api/subscription/status", { token }),
      ]);
      setPlans(p.subject_plans ?? []);
      setGeneralPlans(p.general_plans ?? []);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function checkout(plan: string, scope: "subject" | "general") {
    if (!token) return;
    setBusy(`${scope}:${plan}`);
    setError(null);
    try {
      const res = await apiFetch<{ redirect_url: string }>("/api/subscription/checkout", {
        method: "POST",
        token,
        body: { plan, scope },
      });
      window.location.href = res.redirect_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать платёж");
    } finally {
      setBusy(null);
    }
  }

  const adminFull = Boolean(status?.admin_full_access);
  const hasSub = Boolean(status?.has_active_subscription);
  const hasGeneral = Boolean(status?.has_active_general_subscription);

  const currentSubjectPlan = status?.current_period?.plan ?? null;
  const currentGeneralPlan = status?.current_general_period?.plan ?? null;

  // Порядок “длины” тарифов: чтобы сравнивать “короче/длиннее”.
  const planRank: Record<string, number> = {
    month: 0,
    three_months: 1,
    academic_year: 2,
    calendar_year: 3,
  };

  const currentSubjectRank = currentSubjectPlan ? planRank[currentSubjectPlan] : null;
  const currentGeneralRank = currentGeneralPlan ? planRank[currentGeneralPlan] : null;

  function isSubjectAlreadyActive(rowPlan: string): boolean {
    if (adminFull) return true;
    if (hasGeneral) return true; // общая покрывает все предметы
    if (!hasSub) return false;
    if (currentSubjectRank === null) return true;
    const r = planRank[rowPlan];
    if (r === undefined) return true;
    return r <= currentSubjectRank;
  }

  function isGeneralAlreadyActive(rowPlan: string): boolean {
    if (adminFull) return true;
    if (!hasGeneral) return false;
    if (currentGeneralRank === null) return true;
    const r = planRank[rowPlan];
    if (r === undefined) return true;
    return r <= currentGeneralRank;
  }

  const active = hasSub || adminFull;
  const subjectActiveEndsAt = status?.current_period?.ends_at ?? null;
  const generalActiveEndsAt = status?.current_general_period?.ends_at ?? null;

  return (
    <AppShell title="Подписка">
      {error ? <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p> : null}

      {active ? (
        <div className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 8 }}>
            У вас есть полный доступ
          </h2>
          {generalActiveEndsAt ? (
            <p className="pt-muted" style={{ margin: 0 }}>
              Активный период до{" "}
              {new Date(generalActiveEndsAt).toLocaleString("ru-RU", {
                dateStyle: "long",
                timeStyle: "short",
              })}
              {currentGeneralPlan ? ` · тариф «${currentGeneralPlan}» (общая)` : null}
            </p>
          ) : (
            subjectActiveEndsAt ? (
              <p className="pt-muted" style={{ margin: 0 }}>
                Активный период до{" "}
                {new Date(subjectActiveEndsAt).toLocaleString("ru-RU", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
                {currentSubjectPlan ? ` · тариф «${currentSubjectPlan}»` : null}
              </p>
            ) : (
              <p className="pt-muted" style={{ margin: 0 }}>
                Администратор или активная подписка.
              </p>
            )
          )}
        </div>
      ) : (
        <div className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
          <p className="pt-muted" style={{ margin: 0, lineHeight: 1.6 }}>
            Без подписки доступны названия задач по всем разделам; условие и режимы решения — по{" "}
            <SubjectLink href="/practice">лимиту в бесплатном разделе</SubjectLink> (настраивается администратором) и для уже
            начатых задач. Теория открыта только в этом разделе. Экзамены — по подписке.
          </p>
        </div>
      )}

      <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
        Предметные тарифы
      </h2>
      {!plans.length ? (
        <p className="pt-muted">Предметные тарифы не настроены на сервере.</p>
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
                disabled={!!busy || isSubjectAlreadyActive(row.plan)}
                onClick={() => void checkout(row.plan, "subject")}
              >
                {busy === `subject:${row.plan}`
                  ? "Переход…"
                  : isSubjectAlreadyActive(row.plan)
                    ? "Уже активно"
                    : "Оплатить"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12, marginTop: 28 }}>
        Общая подписка
      </h2>
      {!generalPlans.length ? (
        <p className="pt-muted">Общая подписка не настроена на сервере.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {generalPlans.map((row) => (
            <li key={`g:${row.plan}`} className="pt-card" style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
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
                disabled={!!busy || isGeneralAlreadyActive(row.plan)}
                onClick={() => void checkout(row.plan, "general")}
              >
                {busy === `general:${row.plan}`
                  ? "Переход…"
                  : isGeneralAlreadyActive(row.plan)
                    ? "Уже активно"
                    : "Оплатить"}
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
