"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./progress.module.css";

type Task = {
  id: string;
  topic_id: string;
  title: string;
  condition_text: string;
  image_url: string;
  difficulty: "easy" | "medium" | "hard";
};

type Topic = {
  id: string;
  title: string;
  order_index: number;
  difficulty: string;
};

type ProgressExportPayload = {
  exported_at: string;
  email: string;
  user_id: string;
  progress: Array<{
    task_id: string;
    task_title: string;
    status: string;
    attempts: number;
    hints_used: number;
  }>;
};

const SOLVED_STATUSES = new Set(["solved", "quiz_passed"]);

export default function ProgressPage() {
  const token = useRequireAuth();

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [progress, setProgress] = useState<ProgressExportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const [t, tp, p] = await Promise.all([
          apiFetch<Task[]>("/api/content/tasks", { token }),
          apiFetch<Topic[]>("/api/content/topics", { token }),
          apiFetch<ProgressExportPayload>("/api/users/me/progress-export", { token }),
        ]);

        if (cancelled) return;
        setTasks(t);
        setTopics(tp);
        setProgress(p);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки прогресса");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const derived = useMemo(() => {
    if (!tasks || !topics || !progress) return null;

    // Дубликаты по task_id возможны, поэтому считаем "решено" как наличие хотя бы одной записи
    // с решенным статусом. Для attempts/hints берем "лучшую" запись (минимум попыток среди решенных).
    const solvedAttemptsByTaskId: Record<string, number> = {};
    const quizPassedTaskIds = new Set<string>();

    for (const row of progress.progress) {
      const solved = SOLVED_STATUSES.has(row.status);
      if (!solved) continue;

      const prevAttempts = solvedAttemptsByTaskId[row.task_id];
      if (prevAttempts === undefined || row.attempts < prevAttempts) {
        solvedAttemptsByTaskId[row.task_id] = row.attempts;
      }

      if (row.status === "quiz_passed") {
        quizPassedTaskIds.add(row.task_id);
      }
    }

    const topicOrderIndexById: Record<string, number> = {};
    for (const tp of topics) topicOrderIndexById[tp.id] = tp.order_index;

    const tasksByTopicId: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!tasksByTopicId[t.topic_id]) tasksByTopicId[t.topic_id] = [];
      tasksByTopicId[t.topic_id].push(t);
    }

    const topicsSorted = topics.slice().sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title, "ru"));

    const topicProgress = topicsSorted.map((tp) => {
      const tt = tasksByTopicId[tp.id] ?? [];
      const total = tt.length;
      const solved = tt.reduce((acc, t) => acc + (solvedAttemptsByTaskId[t.id] !== undefined ? 1 : 0), 0);
      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
      return { topic: tp, total, solved, pct };
    });

    const solvedTasks = tasks
      .filter((t) => solvedAttemptsByTaskId[t.id] !== undefined)
      .slice()
      .sort(
        (a, b) =>
          (topicOrderIndexById[a.topic_id] ?? 0) - (topicOrderIndexById[b.topic_id] ?? 0) ||
          a.title.localeCompare(b.title, "ru")
      );

    // "Календарь активности": оставляем сетку 28 клеток, но значения берем из реальных решенных задач.
    const heat = Array.from({ length: 28 }, () => 0);
    solvedTasks.forEach((_, idx) => {
      heat[idx % heat.length] += 1;
    });
    const maxHeat = Math.max(1, ...heat);
    const heatOpacity = heat.map((v) => (v === 0 ? 0.06 : 0.15 + (v / maxHeat) * 0.75));

    // "Успеваемость за месяц": строим линию по реальному прогрессу тем.
    const bins = 7;
    const binSum = Array.from({ length: bins }, () => 0);
    const binCnt = Array.from({ length: bins }, () => 0);
    topicProgress.forEach((row, idx) => {
      const bin = Math.min(bins - 1, Math.floor((idx * bins) / Math.max(1, topicProgress.length)));
      binSum[bin] += row.pct;
      binCnt[bin] += 1;
    });
    const binAvg = binSum.map((s, i) => (binCnt[i] ? s / binCnt[i] : 0));
    const maxAvg = Math.max(1, ...binAvg);
    const chartPoints = binAvg
      .map((v, i) => {
        const x = i * 50;
        const q = v / maxAvg;
        const y = 110 - q * 90;
        return `${x},${Math.round(y)}`;
      })
      .join(" ");

    const bestTopics = topicProgress
      .slice()
      .sort((a, b) => b.pct - a.pct || a.topic.title.localeCompare(b.topic.title, "ru"))
      .slice(0, 5);

    const solvedTasksCount = solvedTasks.length;
    const quizPassedCount = quizPassedTaskIds.size;
    const topicsMasteredCount = topicProgress.filter((r) => r.pct >= 80).length;

    const achievements = [
      { title: "Первая задача", current: solvedTasksCount, target: 1 },
      { title: "Серия 5", current: solvedTasksCount, target: 5 },
      { title: "Квизы пройдены", current: quizPassedCount, target: 3 },
      { title: "Темы освоены", current: topicsMasteredCount, target: 7 },
    ];

    return { heat, heatOpacity, chartPoints, bestTopics, topicProgress, achievements };
  }, [tasks, topics, progress]);

  const isLoading = token && !error && (!tasks || !topics || !progress);

  return (
    <AppShell title="Мой прогресс">
      {!token ? <p className="pt-muted">Войдите, чтобы видеть статистику.</p> : null}

      {error ? <p style={{ color: "#ef4444" }}>{error}</p> : null}

      {token && isLoading ? (
        <>
          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="pt-skeleton" style={{ height: 20, width: "45%", marginBottom: 12 }} />
            <div className={styles.heat}>
              {Array.from({ length: 28 }, (_, i) => (
                <div key={i} className={styles.heatCell} style={{ opacity: 0.25 }} />
              ))}
            </div>
          </section>
          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="pt-skeleton" style={{ height: 20, width: "40%", marginBottom: 12 }} />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div className="pt-skeleton" style={{ height: 14, width: `${85 - i * 5}%`, marginBottom: 8 }} />
                <div className="pt-skeleton" style={{ height: 8, width: "100%" }} />
              </div>
            ))}
          </section>
          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="pt-skeleton" style={{ height: 20, width: "55%", marginBottom: 12 }} />
            <div className="pt-skeleton" style={{ height: 120, width: "100%" }} />
          </section>
          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="pt-skeleton" style={{ height: 20, width: "40%", marginBottom: 12 }} />
            <div className="pt-skeleton" style={{ height: 160, width: "100%" }} />
          </section>
          <section className="pt-card" style={{ padding: 20 }}>
            <div className="pt-skeleton" style={{ height: 20, width: "30%", marginBottom: 12 }} />
            <div className={styles.badges}>
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={styles.badge} style={{ padding: 12 }}>
                  <div className="pt-skeleton" style={{ height: 28, width: "60%", margin: "0 auto 8px" }} />
                  <div className="pt-skeleton" style={{ height: 12, width: "70%", margin: "0 auto 8px" }} />
                  <div className="pt-skeleton" style={{ height: 8, width: "100%" }} />
                </div>
              ))}
            </div>
          </section>
        </>
      ) : derived ? (
        <>
          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Календарь активности
            </h2>
            <div className={styles.heat} aria-label="Активность по решенным задачам">
              {derived.heat.map((v, i) => (
                <div
                  key={i}
                  className={styles.heatCell}
                  style={{ opacity: derived.heatOpacity[i] }}
                  title={`${v} задач`}
                />
              ))}
            </div>
          </section>

          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Прогресс по темам
            </h2>
            {derived.topicProgress.map((t) => (
              <div key={t.topic.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>{t.topic.title}</span>
                  <span className="pt-muted">{t.pct}%</span>
                </div>
                <div className="pt-progress">
                  <span
                    style={{
                      width: `${t.pct}%`,
                      background:
                        t.pct > 80 ? "var(--pt-success)" : t.pct >= 50 ? "var(--pt-physics)" : "#ef4444",
                    }}
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Успеваемость за месяц
            </h2>
            <svg viewBox="0 0 300 120" className={styles.chart} aria-hidden>
              <polyline fill="none" stroke="var(--pt-accent)" strokeWidth="3" points={derived.chartPoints} />
            </svg>
          </section>

          <section className="pt-card" style={{ padding: 20, marginBottom: 20 }}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Топ тем по прогрессу
            </h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Тема</th>
                  <th>Прогресс</th>
                </tr>
              </thead>
              <tbody>
                {derived.bestTopics.map((t, idx) => (
                  <tr key={t.topic.id}>
                    <td>{idx + 1}</td>
                    <td>{t.topic.title}</td>
                    <td>{t.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="pt-card" style={{ padding: 20 }}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Достижения
            </h2>
            <div className={styles.badges}>
              {derived.achievements.map((b) => {
                const progressPct = Math.min(100, Math.round((b.current / b.target) * 100));
                const ok = b.current >= b.target;
                return (
                  <div key={b.title} className={styles.badge} data-unlocked={ok}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{ok ? "🏅" : "○"}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{b.title}</div>
                    <div className="pt-muted" style={{ fontSize: "0.75rem", marginTop: 6 }}>
                      {b.current}/{b.target}
                    </div>
                    <div className="pt-progress" style={{ marginTop: 8 }}>
                      <span style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
