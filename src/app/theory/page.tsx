"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { buttonStyle, uiStyles } from "@/app/uiStyles";

type Topic = { id: string; title: string; order_index: number; difficulty: "easy" | "medium" | "hard" };
type TheoryBlock = { id: string; title: string; markdown: string; image_urls: string[]; tags: string[]; topic_id: string };

export default function TheoryPage() {
  const token = useMemo(() => getAccessToken(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [blocks, setBlocks] = useState<TheoryBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiFetch<Topic[]>("/api/content/topics", { token });
        setTopics(data);
        if (data.length > 0) setSelectedTopic(data[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки тем");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedTopic) return;
    (async () => {
      try {
        const data = await apiFetch<TheoryBlock[]>(`/api/content/topics/${selectedTopic}/theory-blocks`, { token });
        setBlocks(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки теории");
      }
    })();
  }, [token, selectedTopic]);

  return (
    <main style={uiStyles.page}>
      <h1>Теория и квизы</h1>
      <p>Выберите тему и изучайте блоки теории.</p>
      <div style={{ margin: "10px 0 18px" }}>
        <Link href="/dashboard">В кабинет</Link>
      </div>

      {!token ? <p>Сначала войдите в систему.</p> : null}
      {error ? <p style={{ color: "crimson" }}>Не удалось загрузить теорию: {error}</p> : null}

      <div style={{ display: "flex", gap: 16 }}>
        <section style={{ minWidth: 260 }}>
          <h3>Темы</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTopic(t.id)}
                style={buttonStyle({ active: selectedTopic === t.id })}
              >
                {t.title} ({t.difficulty})
              </button>
            ))}
          </div>
        </section>
        <section style={{ flex: 1 }}>
          <h3>Блоки</h3>
          {blocks.length === 0 ? <p>Для выбранной темы пока нет материалов. Попробуйте другую тему.</p> : null}
          <div style={{ display: "grid", gap: 14 }}>
            {blocks.map((b) => (
              <article key={b.id} style={uiStyles.card}>
                <h4>{b.title}</h4>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{b.markdown}</pre>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

