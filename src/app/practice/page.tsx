"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { buttonStyle, uiStyles } from "@/app/uiStyles";

type Task = {
  id: string;
  title: string;
  condition_text: string;
  difficulty: "easy" | "medium" | "hard";
};

export default function PracticePage() {
  const token = useMemo(() => getAccessToken(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [activeMode, setActiveMode] = useState<"explain" | "hint" | "self" | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setIsLoadingTasks(true);
      setError(null);
      try {
        const data = await apiFetch<Task[]>("/api/content/tasks", { token });
        setTasks(data);
        if (data.length) setSelectedTask(data[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить задания. Попробуйте позже.");
      } finally {
        setIsLoadingTasks(false);
      }
    })();
  }, [token]);

  async function explainMode() {
    if (!token || !selectedTask || activeMode) return;
    setError(null);
    setActiveMode("explain");
    try {
      const data = await apiFetch<{ explanation: string }>(`/api/practice/tasks/${selectedTask}/explain`, {
        method: "POST",
        token,
      });
      setOutput(data.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить объяснение. Попробуйте еще раз.");
    } finally {
      setActiveMode(null);
    }
  }

  async function hintMode() {
    if (!token || !selectedTask || activeMode) return;
    setError(null);
    setActiveMode("hint");
    try {
      const start = await apiFetch<{ session_id: string }>(
        "/api/practice/interactive/start",
        { method: "POST", token, body: { task_id: selectedTask } }
      );
      const step = await apiFetch<{ assistant_message: string }>(
        "/api/practice/interactive/step",
        { method: "POST", token, body: { session_id: start.session_id, action: "hint", user_message: "" } }
      );
      setOutput(step.assistant_message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить подсказку. Попробуйте позже.");
    } finally {
      setActiveMode(null);
    }
  }

  async function selfMode() {
    if (!token || !selectedTask || activeMode) return;
    setError(null);
    setActiveMode("self");
    try {
      const check = await apiFetch<{ result_text: string }>(
        "/api/practice/solution-check",
        { method: "POST", token, body: { task_id: selectedTask, photo_url: "https://example.com/mock.jpg" } }
      );
      setOutput(check.result_text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось проверить решение. Попробуйте позже.");
    } finally {
      setActiveMode(null);
    }
  }

  const isSubmitting = activeMode !== null;
  const hasTasks = tasks.length > 0;
  const disableActions = !token || !selectedTask || !hasTasks || isSubmitting;

  return (
    <main style={uiStyles.page}>
      <h1>Практические задания</h1>
      <p>Режимы: объяснение, интерактив, сам + проверка.</p>
      <div style={{ margin: "10px 0 18px" }}>
        <Link href="/dashboard">В кабинет</Link>
      </div>
      {!token ? <p>Сначала войдите в систему.</p> : null}
      {error ? <p style={{ color: "crimson" }}>Не удалось выполнить запрос: {error}</p> : null}

      <div style={{ marginBottom: 12 }}>
        {isLoadingTasks ? <p>Загрузка заданий...</p> : null}
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          style={uiStyles.select}
          disabled={isLoadingTasks || !hasTasks}
        >
          {!hasTasks ? <option value="">Нет доступных заданий</option> : null}
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.difficulty})
            </option>
          ))}
        </select>
        {!isLoadingTasks && !hasTasks ? <p style={{ marginTop: 8 }}>Пока нет заданий для практики.</p> : null}
      </div>

      <div style={uiStyles.buttonRow}>
        <button onClick={explainMode} disabled={disableActions} style={buttonStyle({ disabled: disableActions })}>
          {activeMode === "explain" ? "Загрузка объяснения..." : "Режим объяснения"}
        </button>
        <button onClick={hintMode} disabled={disableActions} style={buttonStyle({ disabled: disableActions })}>
          {activeMode === "hint" ? "Загрузка подсказки..." : "Интерактив (подсказка)"}
        </button>
        <button onClick={selfMode} disabled={disableActions} style={buttonStyle({ disabled: disableActions })}>
          {activeMode === "self" ? "Проверка решения..." : "Режим сам (проверка)"}
        </button>
      </div>

      <pre style={uiStyles.output}>
        {output || "Выберите задание и один из режимов, чтобы получить результат."}
      </pre>
    </main>
  );
}

