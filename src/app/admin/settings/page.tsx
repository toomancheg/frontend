"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import uiStyles from "../users/users.module.css";
import styles from "./settings.module.css";

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

type SubjectPriceRow = {
  subject_id: string;
  title: string;
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

  const [subjectPriceRows, setSubjectPriceRows] = useState<SubjectPriceRow[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [subPriceMonth, setSubPriceMonth] = useState("0");
  const [subPriceThree, setSubPriceThree] = useState("0");
  const [subPriceAcademic, setSubPriceAcademic] = useState("0");
  const [subPriceCalendar, setSubPriceCalendar] = useState("0");

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Требуется авторизация. Если вы уже вошли, обновите страницу.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [t, s] = await Promise.all([
        apiFetch<Topic[]>("/api/content/topics", { token }),
        apiFetch<SiteSettings>("/api/admin/site-settings", { token }),
      ]);
      const pr = await apiFetch<{ items: SubjectPriceRow[] }>("/api/admin/subscription-prices", { token });
      setTopics(t);
      setFreeTopicId(s.free_tier_topic_id ?? "");
      setFreeLimit(String(s.free_task_limit));
      setPriceMonth(s.price_month ?? "0.00");
      setPriceThree(s.price_three_months ?? "0.00");
      setPriceAcademic(s.price_academic_year ?? "0.00");
      setPriceCalendar(s.price_calendar_year ?? "0.00");

      setSubjectPriceRows(pr.items ?? []);
      const first = (pr.items ?? [])[0]?.subject_id ?? "";
      setSubjectId(first);
      const firstRow = (pr.items ?? [])[0];
      if (firstRow) {
        setSubPriceMonth(firstRow.price_month ?? "0.00");
        setSubPriceThree(firstRow.price_three_months ?? "0.00");
        setSubPriceAcademic(firstRow.price_academic_year ?? "0.00");
        setSubPriceCalendar(firstRow.price_calendar_year ?? "0.00");
      }
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

  async function saveSubjectPrices() {
    if (!token) return;
    if (!subjectId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await apiFetch("/api/admin/subscription-prices", {
        method: "PUT",
        token,
        body: {
          subject_id: subjectId,
          price_month: subPriceMonth.trim() === "" ? "0" : subPriceMonth,
          price_three_months: subPriceThree.trim() === "" ? "0" : subPriceThree,
          price_academic_year: subPriceAcademic.trim() === "" ? "0" : subPriceAcademic,
          price_calendar_year: subPriceCalendar.trim() === "" ? "0" : subPriceCalendar,
        },
      });
      setOk("Цены по предметам сохранены");
      // Подгружаем заново эффективные цены (с fallback).
      const pr = await apiFetch<{ items: SubjectPriceRow[] }>("/api/admin/subscription-prices", { token });
      setSubjectPriceRows(pr.items ?? []);
      const row = (pr.items ?? []).find((x) => x.subject_id === subjectId);
      if (row) {
        setSubPriceMonth(row.price_month ?? "0.00");
        setSubPriceThree(row.price_three_months ?? "0.00");
        setSubPriceAcademic(row.price_academic_year ?? "0.00");
        setSubPriceCalendar(row.price_calendar_year ?? "0.00");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ maxWidth: 640 }}>
      <h1 className={styles.title}>Настройки сервиса</h1>
      <p className={styles.lead}>
        Бесплатный лимит: раздел (тема), в котором без подписки доступны теория и решение первых N задач (по
        алфавиту названий). Остальные разделы — только список задач без условия и без решений.
      </p>
      <p className={styles.lead}>
        Цены подписки (руб., для Robokassa OutSum). Нулевая или пустая цена скрывает тариф на странице «Подписка» у
        пользователей.
      </p>

      {loading ? <p style={{ color: "var(--adm-muted)" }}>Загрузка…</p> : null}
      {error ? <p className={uiStyles.err}>{error}</p> : null}
      {ok ? <p style={{ color: "var(--adm-success)", marginBottom: 12 }}>{ok}</p> : null}

      {!loading ? (
        <div className={styles.card}>
          <h2 className={styles.h2}>Бесплатный доступ</h2>
          <label className={styles.label}>
            <span className={styles.labelText}>Бесплатный раздел (тема)</span>
            <select
              className={uiStyles.select}
              value={freeTopicId}
              onChange={(e) => setFreeTopicId(e.target.value)}
            >
              <option value="">— не задан (теория только по подписке) —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>Число задач с полным доступом в этом разделе</span>
            <input
              type="number"
              min={0}
              className={uiStyles.input}
              value={freeLimit}
              onChange={(e) => setFreeLimit(e.target.value)}
            />
          </label>

          <h2 className={styles.h2} style={{ marginTop: 8 }}>
            Цены подписки (₽)
          </h2>
          <label className={styles.label}>
            <span className={styles.labelText}>1 месяц</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={priceMonth}
              onChange={(e) => setPriceMonth(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>3 месяца</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={priceThree}
              onChange={(e) => setPriceThree(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>Учебный год</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={priceAcademic}
              onChange={(e) => setPriceAcademic(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>Календарный год</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={priceCalendar}
              onChange={(e) => setPriceCalendar(e.target.value)}
              placeholder="0.00"
            />
          </label>

          <div className={styles.actions}>
            <button type="button" className={uiStyles.btn} disabled={saving} onClick={() => void save()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>

          <h2 className={styles.h2} style={{ marginTop: 8 }}>
            Цены по предметам (₽)
          </h2>

          <label className={styles.label}>
            <span className={styles.labelText}>Предмет</span>
            <select className={uiStyles.select} value={subjectId} onChange={(e) => {
              const next = e.target.value;
              setSubjectId(next);
              const row = subjectPriceRows.find((x) => x.subject_id === next);
              if (!row) return;
              setSubPriceMonth(row.price_month ?? "0.00");
              setSubPriceThree(row.price_three_months ?? "0.00");
              setSubPriceAcademic(row.price_academic_year ?? "0.00");
              setSubPriceCalendar(row.price_calendar_year ?? "0.00");
            }}>
              {subjectPriceRows.map((r) => (
                <option key={r.subject_id} value={r.subject_id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            <span className={styles.labelText}>1 месяц</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={subPriceMonth}
              onChange={(e) => setSubPriceMonth(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>3 месяца</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={subPriceThree}
              onChange={(e) => setSubPriceThree(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>Учебный год</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={subPriceAcademic}
              onChange={(e) => setSubPriceAcademic(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className={styles.label}>
            <span className={styles.labelText}>Календарный год</span>
            <input
              type="text"
              inputMode="decimal"
              className={uiStyles.input}
              value={subPriceCalendar}
              onChange={(e) => setSubPriceCalendar(e.target.value)}
              placeholder="0.00"
            />
          </label>

          <div className={styles.actions}>
            <button type="button" className={uiStyles.btn} disabled={saving || !subjectId} onClick={() => void saveSubjectPrices()}>
              {saving ? "Сохранение…" : "Сохранить цены по предмету"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
