"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

type Topic = {
  id: string;
  title: string;
};

type SiteSettings = {
  free_tier_topic_id: string | null;
  free_task_limit: number;
  price_month: string;
  price_three_months: string;
  price_academic_year: string;
  price_calendar_year: string;
};

export default function AdminSettingsPage() {
  const token = useRequireAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [freeTopicId, setFreeTopicId] = useState<string>("");
  const [freeLimit, setFreeLimit] = useState("10");
  const [priceMonth, setPriceMonth] = useState("0");
  const [priceThree, setPriceThree] = useState("0");
  const [priceAcademic, setPriceAcademic] = useState("0");
  const [priceCalendar, setPriceCalendar] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [t, s] = await Promise.all([
        apiFetch<Topic[]>("/api/content/topics", { token }),
        apiFetch<SiteSettings>("/api/admin/site-settings", { token }),
      ]);
      setTopics(t);
      setFreeTopicId(s.free_tier_topic_id ?? "");
      setFreeLimit(String(s.free_task_limit));
      setPriceMonth(s.price_month ?? "0.00");
      setPriceThree(s.price_three_months ?? "0.00");
      setPriceAcademic(s.price_academic_year ?? "0.00");
      setPriceCalendar(s.price_calendar_year ?? "0.00");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const lim = Number.parseInt(freeLimit, 10);
      if (Number.isNaN(lim) || lim < 0) {
        throw new Error("Некорректный лимит задач");
      }
      await apiFetch<SiteSettings>("/api/admin/site-settings", {
        method: "PUT",
        token,
        body: {
          free_tier_topic_id: freeTopicId === "" ? null : freeTopicId,
          free_task_limit: lim,
          price_month: priceMonth.trim() === "" ? "0" : priceMonth,
          price_three_months: priceThree.trim() === "" ? "0" : priceThree,
          price_academic_year: priceAcademic.trim() === "" ? "0" : priceAcademic,
          price_calendar_year: priceCalendar.trim() === "" ? "0" : priceCalendar,
        },
      });
      setOk("Сохранено");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 12px", color: "#e8ecf4" }}>Настройки сервиса</h1>
      <p style={{ color: "#94a3b8", lineHeight: 1.6, marginBottom: 20 }}>
        Бесплатный лимит: раздел (тема), в котором без подписки доступны теория и решение первых N задач (по
        алфавиту названий). Остальные разделы — только список задач без условия и без решений.
      </p>
      <p style={{ color: "#94a3b8", lineHeight: 1.6, marginBottom: 20 }}>
        Цены подписки (руб., для Robokassa OutSum). Нулевая или пустая цена скрывает тариф на странице «Подписка» у
        пользователей.
      </p>

      {loading ? <p style={{ color: "#94a3b8" }}>Загрузка…</p> : null}
      {error ? <p style={{ color: "#f87171", marginBottom: 12 }}>{error}</p> : null}
      {ok ? <p style={{ color: "#4ade80", marginBottom: 12 }}>{ok}</p> : null}

      {!loading ? (
        <div className="pt-card" style={{ padding: 20, display: "grid", gap: 16 }}>
          <h2 className="pt-heading" style={{ fontSize: "1rem", margin: 0, color: "#e8ecf4" }}>
            Бесплатный доступ
          </h2>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Бесплатный раздел (тема)</span>
            <select
              className="pt-input"
              value={freeTopicId}
              onChange={(e) => setFreeTopicId(e.target.value)}
              style={{ background: "#0f172a", color: "#e8ecf4" }}
            >
              <option value="">— не задан (теория только по подписке) —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Число задач с полным доступом в этом разделе</span>
            <input
              type="number"
              min={0}
              className="pt-input"
              value={freeLimit}
              onChange={(e) => setFreeLimit(e.target.value)}
              style={{ background: "#0f172a", color: "#e8ecf4" }}
            />
          </label>

          <h2 className="pt-heading" style={{ fontSize: "1rem", margin: "8px 0 0", color: "#e8ecf4" }}>
            Цены подписки (₽)
          </h2>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>1 месяц</span>
            <input
              type="text"
              inputMode="decimal"
              className="pt-input"
              value={priceMonth}
              onChange={(e) => setPriceMonth(e.target.value)}
              placeholder="0.00"
              style={{ background: "#0f172a", color: "#e8ecf4" }}
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>3 месяца</span>
            <input
              type="text"
              inputMode="decimal"
              className="pt-input"
              value={priceThree}
              onChange={(e) => setPriceThree(e.target.value)}
              placeholder="0.00"
              style={{ background: "#0f172a", color: "#e8ecf4" }}
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Учебный год</span>
            <input
              type="text"
              inputMode="decimal"
              className="pt-input"
              value={priceAcademic}
              onChange={(e) => setPriceAcademic(e.target.value)}
              placeholder="0.00"
              style={{ background: "#0f172a", color: "#e8ecf4" }}
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Календарный год</span>
            <input
              type="text"
              inputMode="decimal"
              className="pt-input"
              value={priceCalendar}
              onChange={(e) => setPriceCalendar(e.target.value)}
              placeholder="0.00"
              style={{ background: "#0f172a", color: "#e8ecf4" }}
            />
          </label>

          <button
            type="button"
            className="pt-btn pt-btn-primary"
            style={{ justifySelf: "start" }}
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
