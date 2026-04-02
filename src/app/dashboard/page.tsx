"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { SubjectLink } from "@/components/routing/SubjectLink";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import { getDisplayName, setDisplayName } from "@/lib/displayName";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./dashboard.module.css";

type UserOut = {
  id: string;
  email: string;
  role: "student" | "admin";
  grade: number;
  program: string;
  display_name: string | null;
  avatar_url: string | null;
  notification_prefs: {
    training_reminders: boolean;
    new_tasks: boolean;
    exam_results: boolean;
  };
};

type DashboardStats = {
  solved_tasks: number;
  total_tasks: number;
  topics_total: number;
  by_difficulty: Record<string, number>;
  weak_topics: string[];
};

type TopicOut = {
  id: string;
  title: string;
  order_index: number;
  difficulty: "easy" | "medium" | "hard";
  theory_accessible?: boolean;
};

const PROGRAM_LABEL: Record<string, string> = {
  basic: "Базовая",
  profile: "Профильная",
  olympiad: "Олимпиадная",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topics, setTopics] = useState<TopicOut[] | null>(null);
  const [greetingName, setGreetingName] = useState("");

  const accessToken = useRequireAuth();

  useEffect(() => {
    setGreetingName(getDisplayName() ?? "");
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    (async () => {
      try {
        const me = await apiFetch<UserOut>("/api/auth/me", { token: accessToken });
        setUser(me);
        const fromDb = me.display_name?.trim();
        if (fromDb) setDisplayName(fromDb);
        const dashboard = await apiFetch<DashboardStats>("/api/dashboard/stats", { token: accessToken });
        setStats(dashboard);
        const ts = await apiFetch<TopicOut[]>("/api/content/topics", { token: accessToken });
        setTopics(ts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки профиля");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function onLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: {} });
    } catch {
      // идемпотентно
    } finally {
      clearTokens();
      router.push("/auth/login");
    }
  }

  const pct =
    stats && stats.total_tasks > 0 ? Math.round((stats.solved_tasks / stats.total_tasks) * 100) : 0;

  const displayName =
    user?.display_name?.trim() ||
    greetingName ||
    (user?.email ? user.email.split("@")[0] : "Ученик");

  const headerAvatar = resolveMediaUrl(user?.avatar_url ?? null);

  return (
    <AppShell
      userEmail={user?.email ?? null}
      userRole={user?.role ?? null}
      userAvatarUrl={headerAvatar}
      onLogout={onLogout}
    >
      {error ? <div className={styles.statErr}>Не удалось загрузить данные: {error}</div> : null}

      {isLoading ? (
        <div className="pt-card" style={{ padding: 24 }}>
          <div className="pt-skeleton" style={{ height: 24, width: "40%", marginBottom: 12 }} />
          <div className="pt-skeleton" style={{ height: 120, width: "100%" }} />
        </div>
      ) : user ? (
        <div className={styles.grid}>
          <div className={styles.topRow}>
            <section className={`pt-card ${styles.welcome}`}>
              <h2>Привет, {displayName}!</h2>
              <p className={styles.meta}>
                Класс: {user.grade} · Программа: {PROGRAM_LABEL[user.program] ?? user.program}
              </p>
              <p className="pt-muted" style={{ fontSize: "0.95rem" }}>
                Прогресс за неделю: решено задач относительно плана.
              </p>
            </section>
            <section className="pt-card">
              <div className={styles.ringWrap}>
                <div className={styles.ring} style={{ "--pct": pct } as React.CSSProperties}>
                  <span>{pct}%</span>
                </div>
                <span className="pt-muted" style={{ fontSize: "0.8rem" }}>
                  Неделя
                </span>
              </div>
            </section>
          </div>

          <section>
            <h3 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Продолжить обучение
            </h3>
            <div className={styles.hScroll}>
              {topics?.length ? (
                topics.slice(0, 12).map((t) => {
                  const canTheory = t.theory_accessible !== false;
                  return (
                    <article key={t.id} className={`pt-card pt-card-interactive ${styles.hCard}`}>
                      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{canTheory ? "📘" : "🔒"}</div>
                      <h4>{t.title}</h4>
                      <div className="pt-progress" style={{ marginBottom: 12 }}>
                        <span style={{ width: `0%` }} />
                      </div>
                      <SubjectLink
                        href={canTheory ? `/theory/${t.id}` : "/subscription"}
                        className={`pt-btn ${canTheory ? "pt-btn-secondary" : "pt-btn-primary"}`}
                        style={{ width: "100%" }}
                      >
                        {canTheory ? "Открыть" : "Открыть доступ"}
                      </SubjectLink>
                    </article>
                  );
                })
              ) : (
                <div className="pt-muted" style={{ padding: 8 }}>
                  Темы пока не добавлены.
                </div>
              )}
            </div>
          </section>

          <section className={`pt-card ${styles.reco}`}>
            <h3 className="pt-heading" style={{ fontSize: "1.05rem", marginBottom: 8 }}>
              Рекомендации
            </h3>
            <p style={{ marginBottom: 14 }}>
              {stats?.weak_topics?.length
                ? `На основе твоих ошибок рекомендуем повторить тему «${stats.weak_topics[0]}»`
                : "Отличная работа! Попробуй мини-экзамен по силе трения."}
            </p>
            <SubjectLink href="/theory" className="pt-btn pt-btn-primary">
              Начать
            </SubjectLink>
          </section>

          <section>
            <h3 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Быстрый старт
            </h3>
            <div className={styles.quick}>
              <SubjectLink href="/practice" className={styles.quickBtn}>
                🎲 Случайная задача
              </SubjectLink>
              <SubjectLink href="/exam" className={styles.quickBtn}>
                ⚡ Мини-экзамен
              </SubjectLink>
              <SubjectLink href="/theory" className={styles.quickBtn}>
                🎯 Сложные темы
              </SubjectLink>
            </div>
          </section>

          <section>
            <h3 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Достижения
            </h3>
            <div className={styles.badges}>
              {[
                { id: "1", t: "Первая задача", ok: (stats?.solved_tasks ?? 0) >= 1 },
                { id: "2", t: "5 подряд", ok: (stats?.solved_tasks ?? 0) >= 5 },
                { id: "3", t: "Идеальный экзамен", ok: false },
                { id: "4", t: "10 тем", ok: (stats?.topics_total ?? 0) >= 10 },
              ].map((b) => (
                <div key={b.id} className={styles.badge} data-unlocked={b.ok}>
                  {b.ok ? "✓ " : "○ "}
                  {b.t}
                </div>
              ))}
            </div>
          </section>

          <p className={`pt-card ${styles.quote}`}>
            «Физика — это способность удивляться простым вещам» — Ричард Фейнман
          </p>

          {stats ? (
            <section className="pt-card" style={{ padding: 18 }}>
              <p>
                <strong>Всего:</strong> {stats.solved_tasks}/{stats.total_tasks} задач ·{" "}
                <strong>Темы:</strong> {stats.topics_total}
              </p>
            </section>
          ) : null}
        </div>
      ) : (
        <p>Профиль не найден.</p>
      )}
    </AppShell>
  );
}
