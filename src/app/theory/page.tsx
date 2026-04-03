"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./theory.module.css";

type Topic = {
  id: string;
  title: string;
  order_index: number;
  difficulty: "easy" | "medium" | "hard";
  theory_accessible?: boolean;
};

const ICONS = ["⚙", "🔥", "⚡", "🌊", "🧲", "☢"] as const;

function topicIcon(i: number) {
  return ICONS[i % ICONS.length];
}

const DIFF_LABEL: Record<string, string> = {
  easy: "лёгкая",
  medium: "средняя",
  hard: "сложная",
};

export default function TheoryListPage() {
  const token = useRequireAuth();
  const pathname = usePathname();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"order" | "difficulty" | "progress">("order");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiFetch<Topic[]>("/api/content/topics", { token, pathname });
        setTopics(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки тем");
      }
    })();
  }, [token, pathname]);

  const sorted = useMemo(() => {
    let list = [...topics];
    if (sort === "difficulty") {
      const rank = { easy: 0, medium: 1, hard: 2 };
      list.sort((a, b) => rank[a.difficulty] - rank[b.difficulty]);
    } else if (sort === "order") {
      list.sort((a, b) => a.order_index - b.order_index);
    }
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(qq));
    }
    return list;
  }, [topics, sort, q]);

  return (
    <AppShell title="Теория">
      {error ? <p style={{ color: "#ef4444" }}>{error}</p> : null}

      <div className={styles.toolbar}>
        <input
          type="search"
          className="pt-input"
          placeholder="Поиск по названию…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
        />
        <select className={`pt-input ${styles.sort}`} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="order">По порядку</option>
          <option value="difficulty">По сложности</option>
          <option value="progress">По прогрессу</option>
        </select>
      </div>

      <div className={`${styles.grid} pt-stagger`}>
        {sorted.map((t, idx) => (
          <article key={t.id} className={`pt-card pt-card-interactive ${styles.topicCard}`}>
            <div className={styles.topicIcon}>{topicIcon(idx)}</div>
            <h3 className="pt-heading" style={{ fontSize: "1.15rem" }}>
              {t.title}
            </h3>
            <p className={styles.topicMeta}>Сложность: {DIFF_LABEL[t.difficulty] ?? t.difficulty}</p>
            <p className={styles.status}>
              {t.theory_accessible === false
                ? "🔒 Теория по подписке (бесплатно — только в выбранном разделе)"
                : "🟢 Доступно · Прочитано 0 квизов из 3"}
            </p>
            <div className="pt-progress">
              <span style={{ width: "0%" }} />
            </div>
            <Link
              href={`/theory/${t.id}`}
              className={`pt-btn ${t.theory_accessible === false ? "pt-btn-secondary" : "pt-btn-primary"}`}
              style={{ marginTop: "auto" }}
            >
              {t.theory_accessible === false ? "Подробнее" : "Изучать"}
            </Link>
          </article>
        ))}
      </div>

      {!sorted.length && !error ? (
        <p className="pt-muted">Темы загружаются или список пуст.</p>
      ) : null}
    </AppShell>
  );
}
