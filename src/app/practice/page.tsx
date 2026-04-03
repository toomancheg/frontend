"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { SubjectLink } from "@/components/routing/SubjectLink";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./practice.module.css";

type Task = {
  id: string;
  topic_id: string;
  title: string;
  condition_text: string;
  image_url: string;
  difficulty: "easy" | "medium" | "hard";
  practice_allowed?: boolean;
  list_only?: boolean;
};

type Topic = {
  id: string;
  title: string;
  order_index: number;
  difficulty: string;
};

type DiffFilter = "all" | "easy" | "medium" | "hard";
type StatusFilter = "all" | "unsolved" | "solved";
type ModeFilter = "all" | "explain" | "interactive" | "self";

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
    explanation_seen?: boolean;
    self_check_draft?: boolean;
  }>;
};

type SortKey = "title_asc" | "difficulty_asc" | "difficulty_desc" | "topic_order_asc";

type TaskProgressRow = {
  status: string;
  attempts: number;
  hints_used: number;
  explanation_seen: boolean;
  self_check_draft: boolean;
};

function isPracticeListPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/practice" || pathname === "/practice/") return true;
  return /^\/[a-z][a-z0-9_-]*\/practice\/?$/i.test(pathname);
}

function isSolvedStatus(st: string): boolean {
  return st === "solved" || st === "quiz_passed";
}

function segment(icon: "✅" | "⏳" | "🔴", text: string): string {
  return `${icon} ${text}`;
}

/**
 * Подпись статуса для списка задач в формате:
 * explain / interactive / self-check
 */
function formatTaskProgressLabel(row: TaskProgressRow | undefined): string {
  if (!row) {
    return segment("🔴", "не решено");
  }

  const st = row.status;
  const solved = isSolvedStatus(st);
  const hints = row.hints_used ?? 0;
  const attempts = row.attempts ?? 0;

  // Если решено без объяснений и без подсказок — считаем "самостоятельно".
  if (solved && !row.explanation_seen && hints === 0) {
    return segment("✅", "Решено самостоятельно");
  }

  // 1) Explain
  const explainSeg = row.explanation_seen ? segment("✅", "даны объяснения") : segment("🔴", "не решено");

  // 2) Interactive (признак "в процессе" — были попытки/подсказки и задача ещё не решена)
  const interactiveInProgress = !solved && (attempts > 0 || hints > 0) && !row.self_check_draft;
  const interactiveSeg = solved
    ? segment("✅", hints > 0 ? "решено с подсказками" : "решено")
    : interactiveInProgress
      ? segment("⏳", "в процессе")
      : segment("🔴", "не решено");

  // 3) Self-check
  const selfSeg = solved
    ? segment("✅", "решено")
    : row.self_check_draft
      ? segment("⏳", "в процессе")
      : segment("🔴", "не решено");

  return `${explainSeg} / ${interactiveSeg} / ${selfSeg}`;
}

export default function PracticeListPage() {
  const token = useRequireAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topic, setTopic] = useState<string>("all");
  const [diff, setDiff] = useState<DiffFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [sort, setSort] = useState<SortKey>("title_asc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [q, setQ] = useState("");

  const pathname = usePathname();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiFetch<Task[]>("/api/content/tasks", { token, pathname });
        setTasks(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, pathname]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const list = await apiFetch<Topic[]>("/api/content/topics", { token, pathname });
        setTopics(list);
        // "all" оставляем по умолчанию; если тем нет — просто показываем пустой селект.
      } catch (e) {
        setTopics([]);
      } finally {
        setTopicsLoading(false);
      }
    })();
  }, [token, pathname]);

  const [progressLoading, setProgressLoading] = useState(true);
  const [progressByTaskId, setProgressByTaskId] = useState<Record<string, TaskProgressRow>>({});
  useEffect(() => {
    if (!token) return;
    if (!isPracticeListPath(pathname)) return;
    setProgressLoading(true);
    (async () => {
      try {
        const data = await apiFetch<ProgressExportPayload>("/api/users/me/progress-export", { token, pathname });
        const map: Record<string, TaskProgressRow> = {};
        for (const row of data.progress) {
          map[row.task_id] = {
            status: row.status,
            attempts: row.attempts ?? 0,
            hints_used: row.hints_used ?? 0,
            explanation_seen: row.explanation_seen === true,
            self_check_draft: row.self_check_draft === true,
          };
        }
        setProgressByTaskId(map);
      } catch {
        // Если прогресс не удалось загрузить — позволяем хотя бы diff+поиск фильтровать.
        setProgressByTaskId({});
      } finally {
        setProgressLoading(false);
      }
    })();
  }, [token, pathname]);

  const topicOrderIndexById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of topics) m[t.id] = t.order_index;
    return m;
  }, [topics]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (diff !== "all") list = list.filter((t) => t.difficulty === diff);
    if (topic !== "all") list = list.filter((t) => t.topic_id === topic);

    if (status !== "all" && !progressLoading) {
      list = list.filter((t) => {
        const st = progressByTaskId[t.id]?.status ?? "not_solved";
        const solved = isSolvedStatus(st);
        return status === "solved" ? solved : !solved;
      });
    }

    if (mode !== "all" && !progressLoading) {
      list = list.filter((t) => {
        const st = progressByTaskId[t.id]?.status ?? "not_solved";
        if (mode === "interactive") return st === "in_progress";
        if (mode === "self") return st === "solved" || st === "quiz_passed";
        // explain: задача не стартовала в интерактиве и не считается решенной
        return st !== "in_progress" && !(st === "solved" || st === "quiz_passed");
      });
    }

    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(qq) || t.condition_text.toLowerCase().includes(qq)
      );
    }

    const rankDifficulty: Record<Task["difficulty"], number> = { easy: 1, medium: 2, hard: 3 };

    const sorted = list.slice();
    sorted.sort((a, b) => {
      if (sort === "difficulty_asc") return rankDifficulty[a.difficulty] - rankDifficulty[b.difficulty];
      if (sort === "difficulty_desc") return rankDifficulty[b.difficulty] - rankDifficulty[a.difficulty];
      if (sort === "topic_order_asc") {
        const ao = topicOrderIndexById[a.topic_id] ?? 999999;
        const bo = topicOrderIndexById[b.topic_id] ?? 999999;
        if (ao !== bo) return ao - bo;
        return a.title.localeCompare(b.title, "ru");
      }
      // title_asc
      return a.title.localeCompare(b.title, "ru");
    });

    return sorted;
  }, [
    tasks,
    diff,
    q,
    topic,
    status,
    mode,
    sort,
    progressLoading,
    progressByTaskId,
    topicOrderIndexById,
  ]);

  return (
    <AppShell title="Задачи">
      {error ? <p style={{ color: "#ef4444" }}>{error}</p> : null}

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по условию…"
          className="pt-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
        />
        <select
          className="pt-input"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ minWidth: 200 }}
          disabled={topicsLoading}
        >
          <option value="all">Все темы</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.chips} style={{ marginBottom: 12 }}>
        {(
          [
            ["Лёгкие", "easy"],
            ["Средние", "medium"],
            ["Сложные", "hard"],
          ] as const
        ).map(([label, key]) => (
          <button
            key={key}
            type="button"
            className="pt-chip"
            data-active={diff === key}
            onClick={() => setDiff(diff === key ? "all" : key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.filters} style={{ marginBottom: 16 }}>
        <select className="pt-input" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">Все статусы</option>
          <option value="unsolved">Не решённые</option>
          <option value="solved">Решённые</option>
        </select>
        <select className="pt-input" value={mode} onChange={(e) => setMode(e.target.value as ModeFilter)}>
          <option value="all">Все режимы</option>
          <option value="explain">Объяснение</option>
          <option value="interactive">Интерактивный</option>
          <option value="self">Сам с проверкой</option>
        </select>
        <select className="pt-input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="title_asc">Сортировка: A→Z</option>
          <option value="difficulty_asc">Сортировка: лёгкие→сложные</option>
          <option value="difficulty_desc">Сортировка: сложные→лёгкие</option>
          <option value="topic_order_asc">Сортировка: по порядку тем</option>
        </select>
        <div className={styles.viewToggle}>
          <button
            type="button"
            className="pt-chip"
            data-active={view === "list"}
            onClick={() => setView("list")}
          >
            Список
          </button>
          <button
            type="button"
            className="pt-chip"
            data-active={view === "grid"}
            onClick={() => setView("grid")}
          >
            Сетка
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pt-card" style={{ padding: 20 }}>
          <div className="pt-skeleton" style={{ height: 20, width: "60%", marginBottom: 10 }} />
          <div className="pt-skeleton" style={{ height: 16, width: "100%" }} />
        </div>
      ) : view === "list" ? (
        <div className={styles.list}>
          {filtered.map((t) => (
            <article key={t.id} className={`pt-card pt-card-interactive ${styles.taskRow}`}>
              <div>
                <div className={styles.taskTitle}>{t.title}</div>
                <p className="pt-muted" style={{ fontSize: "0.9rem" }}>
                  {t.list_only === true
                    ? "Условие и решения доступны по подписке или в бесплатном лимите раздела."
                    : `${t.condition_text.slice(0, 120)}${t.condition_text.length > 120 ? "…" : ""}`}
                </p>
                <div className={styles.tags}>
                  <span className="pt-muted">механика</span>
                  <span className={`${styles.diff} ${styles[`diff-${t.difficulty}`]}`}>{t.difficulty}</span>
                  <span className="pt-muted">
                    {progressLoading ? "…" : formatTaskProgressLabel(progressByTaskId[t.id])}
                  </span>
                </div>
              </div>
              <SubjectLink
                href={t.list_only === true ? "/subscription" : `/practice/${t.id}`}
                className={`pt-btn ${t.list_only === true ? "pt-btn-secondary" : "pt-btn-primary"}`}
              >
                {t.list_only === true ? "Подписка" : "Решать"}
              </SubjectLink>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((t) => (
            <article key={t.id} className={`pt-card pt-card-interactive`} style={{ padding: 16 }}>
              <div className={styles.taskTitle}>{t.title}</div>
              <p className="pt-muted" style={{ fontSize: "0.85rem", margin: "8px 0" }}>
                {t.list_only === true ? "Доступ по подписке…" : `${t.condition_text.slice(0, 80)}…`}
              </p>
              <p className="pt-muted" style={{ fontSize: "0.8rem", marginBottom: 8 }}>
                {progressLoading ? "…" : formatTaskProgressLabel(progressByTaskId[t.id])}
              </p>
              <SubjectLink
                href={t.list_only === true ? "/subscription" : `/practice/${t.id}`}
                className={`pt-btn ${t.list_only === true ? "pt-btn-secondary" : "pt-btn-primary"}`}
                style={{ width: "100%" }}
              >
                {t.list_only === true ? "Подписка" : "Решать"}
              </SubjectLink>
            </article>
          ))}
        </div>
      )}

      {!filtered.length && !loading ? <p className="pt-muted">Нет задач по фильтрам.</p> : null}
    </AppShell>
  );
}
