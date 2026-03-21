"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { buttonStyle, uiStyles } from "@/app/uiStyles";

type ExamSession = {
  id: string;
  status: string;
  task_ids: string[];
  end_time: string;
};

export default function ExamPage() {
  const token = useMemo(() => getAccessToken(), []);
  const [exam, setExam] = useState<ExamSession | null>(null);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function startExam() {
    if (!token || isStarting || isSubmitting) return;
    setError("");
    setIsStarting(true);
    try {
      const data = await apiFetch<ExamSession>("/api/exam/start", {
        method: "POST",
        token,
        body: { size: 5, duration_minutes: 30 },
      });
      setExam(data);
      setResult("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запустить экзамен. Попробуйте еще раз.");
    } finally {
      setIsStarting(false);
    }
  }

  async function submitExam() {
    if (!token || !exam || isSubmitting || isStarting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const answers = exam.task_ids.reduce<Record<string, string>>((acc, id) => {
        acc[id] = "";
        return acc;
      }, {});
      const data = await apiFetch<{ correct: number; total: number; recommendation: string }>(
        `/api/exam/${exam.id}/submit`,
        { method: "POST", token, body: { answers } }
      );
      setResult(`Результат: ${data.correct}/${data.total}\nРекомендация: ${data.recommendation}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить ответы. Попробуйте позже.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const disableStart = !token || isStarting || isSubmitting;
  const disableSubmit = !exam || !token || isStarting || isSubmitting;

  return (
    <main style={{ ...uiStyles.page, maxWidth: 900 }}>
      <h1>Проверочная работа</h1>
      <p>Запуск сессии экзамена и сдача ответов.</p>
      <div style={{ margin: "10px 0 18px" }}>
        <Link href="/dashboard">В кабинет</Link>
      </div>

      {!token ? <p>Сначала войдите в систему.</p> : null}
      {error ? <p style={{ color: "crimson" }}>Проблема при работе с экзаменом: {error}</p> : null}

      <div style={uiStyles.buttonRow}>
        <button onClick={startExam} disabled={disableStart} style={buttonStyle({ disabled: disableStart })}>
          {isStarting ? "Запуск экзамена..." : "Начать экзамен"}
        </button>
        <button onClick={submitExam} disabled={disableSubmit} style={buttonStyle({ disabled: disableSubmit })}>
          {isSubmitting ? "Отправка ответов..." : "Сдать экзамен"}
        </button>
      </div>

      {exam ? (
        <div style={{ ...uiStyles.mutedCard, marginTop: 14 }}>
          <p>
            Сессия: <code>{exam.id}</code>
          </p>
          <p>Задач: {exam.task_ids.length}</p>
          <p>До: {new Date(exam.end_time).toLocaleString()}</p>
        </div>
      ) : null}

      {result ? <pre style={{ ...uiStyles.output, marginTop: 12 }}>{result}</pre> : <p>Результат появится после сдачи экзамена.</p>}
    </main>
  );
}

