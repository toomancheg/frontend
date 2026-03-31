"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./adminPage.module.css";

type AdminStats = {
  total_users: number;
  new_today: number;
  new_week: number;
  active_24h: number;
  subscription_expired: number;
  pending_moderation: number;
  admins: number;
  students: number;
};

export default function AdminHomePage() {
  const token = useRequireAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const s = await apiFetch<AdminStats>("/api/admin/stats", { token });
        setStats(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
  }, [token]);

  return (
    <div>
      <h1 className={styles.title}>Дашборд</h1>
      <p className={styles.lead}>
        Краткая сводка по сервису. Подписки и модерация показываются как 0 до появления соответствующих
        сущностей в API.
      </p>

      {error ? <p className={styles.err}>{error}</p> : null}

      {stats ? (
        <div className={styles.grid}>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Всего пользователей</span>
            <strong className={styles.cardValue}>{stats.total_users}</strong>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Новых за сегодня</span>
            <strong className={styles.cardValue}>{stats.new_today}</strong>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Новых за 7 дней</span>
            <strong className={styles.cardValue}>{stats.new_week}</strong>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Активных за 24 ч</span>
            <strong className={styles.cardValue}>{stats.active_24h}</strong>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Администраторов</span>
            <strong className={styles.cardValue}>{stats.admins}</strong>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Учеников</span>
            <strong className={styles.cardValue}>{stats.students}</strong>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Истекшая подписка</span>
            <strong className={styles.cardValue}>{stats.subscription_expired}</strong>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Ожидают модерации</span>
            <strong className={styles.cardValue}>{stats.pending_moderation}</strong>
          </article>
        </div>
      ) : !error ? (
        <p className={styles.muted}>Загрузка…</p>
      ) : null}
    </div>
  );
}
