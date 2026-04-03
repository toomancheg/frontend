"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import { AppShell } from "@/components/layout/AppShell";
import { SubjectLink } from "@/components/routing/SubjectLink";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./exam.module.css";
import "katex/dist/katex.min.css";

type ExamSession = {
  id: string;
  status: string;
  task_ids: string[];
  end_time: string;
};

type Task = {
  id: string;
  topic_id: string;
  title: string;
  condition_text: string;
  image_url: string;
  difficulty: "easy" | "medium" | "hard";
};

type Tab = "create" | "take" | "results";

type SubStatus = {
  has_active_subscription: boolean;
  admin_full_access: boolean;
};

function normalizeLatexDelimiters(value: string): string {
  return value
    .replace(/\\\[([\s\S]+?)\\\]/g, "$$$$1$$$$")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$$$1$");
}

function TaskCondition({ text }: { text: string }) {
  return (
    <div className={styles.conditionMd}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeLatexDelimiters(text)}
      </ReactMarkdown>
    </div>
  );
}

export default function ExamPage() {
  const token = useRequireAuth();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("create");
  const [exam, setExam] = useState<ExamSession | null>(null);
  const [examTasks, setExamTasks] = useState<Task[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [taskIndex, setTaskIndex] = useState(0);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    recommendation: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const examAutoFinishRef = useRef(false);

  const [size, setSize] = useState(5);
  const [duration, setDuration] = useState(30);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);

  const endMs = exam ? new Date(exam.end_time).getTime() : 0;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const s = await apiFetch<SubStatus>("/api/subscription/status", { token, pathname });
        setSubStatus(s);
      } catch {
        setSubStatus(null);
      }
    })();
  }, [token, pathname]);

  const tick = useCallback(() => {
    if (!exam) return;
    const s = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
    setSecondsLeft(s);
  }, [exam, endMs]);

  useEffect(() => {
    if (!exam || tab !== "take") return;
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exam, tab, tick]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (exam && tab === "take") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [exam, tab]);

  useEffect(() => {
    if (!token || !exam?.task_ids.length) {
      setExamTasks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const all = await apiFetch<Task[]>("/api/content/tasks", { token, pathname });
        const order = new Map(exam.task_ids.map((id, i) => [id, i]));
        const filtered = all
          .filter((t) => order.has(t.id))
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        if (!cancelled) {
          setExamTasks(filtered);
          setAnswers((prev) => {
            const next = { ...prev };
            for (const id of exam.task_ids) {
              if (!(id in next)) next[id] = "";
            }
            return next;
          });
        }
      } catch {
        if (!cancelled) setExamTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, exam, pathname]);

  const submitExam = useCallback(async () => {
    if (!token || !exam || isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ correct: number; total: number; recommendation: string }>(
        `/api/exam/${exam.id}/submit`,
        { method: "POST", token, pathname, body: { answers } }
      );
      setResult(data);
      setTab("results");
      setExam(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить ответы.");
    } finally {
      setIsSubmitting(false);
    }
  }, [token, exam, answers, isSubmitting, pathname]);

  useEffect(() => {
    if (tab !== "take" || !exam || secondsLeft > 0 || isSubmitting) return;
    if (examAutoFinishRef.current) return;
    examAutoFinishRef.current = true;
    void submitExam();
  }, [secondsLeft, tab, exam, submitExam, isSubmitting]);

  async function startExam() {
    if (!token || isStarting || isSubmitting) return;
    setError("");
    examAutoFinishRef.current = false;
    setIsStarting(true);
    try {
      const data = await apiFetch<ExamSession>("/api/exam/start", {
        method: "POST",
        token,
        pathname,
        body: { size, duration_minutes: duration },
      });
      setExam(data);
      setResult(null);
      setTaskIndex(0);
      setTab("take");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запустить экзамен.");
    } finally {
      setIsStarting(false);
    }
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const warn = secondsLeft > 0 && secondsLeft < 300;

  const disableStart = !token || isStarting || isSubmitting;
  const currentTask = examTasks[taskIndex] ?? null;
  const totalExam = exam?.task_ids.length ?? 0;

  const pctCorrect =
    result && result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;

  return (
    <AppShell title="Экзамены">
      {!token ? <p className="pt-muted">Войдите, чтобы проходить экзамены.</p> : null}
      {error ? <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p> : null}

      {tab === "create" ? (
        <section className={`pt-card ${styles.panel}`}>
          <h2 className="pt-heading" style={{ fontSize: "1.15rem", marginBottom: 16 }}>
            Параметры экзамена
          </h2>
          <p className="pt-muted" style={{ marginBottom: 16 }}>
            Случайный набор задач из базы. Ответьте на каждую; по истечении времени работа отправится автоматически.
          </p>
          {subStatus && !subStatus.has_active_subscription && !subStatus.admin_full_access ? (
            <p className="pt-card" style={{ padding: 14, marginBottom: 16, borderLeft: "4px solid #f59e0b" }}>
              Запуск экзамена доступен при активной{" "}
              <SubjectLink href="/subscription" style={{ textDecoration: "underline" }}>
                подписке
              </SubjectLink>
              .
            </p>
          ) : null}
          <div style={{ marginBottom: 16 }}>
            <div className={styles.sliderLabel}>
              <span>Число задач</span>
              <span>{size}</span>
            </div>
            <input
              type="range"
              min={3}
              max={20}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className={styles.sliderLabel}>
              <span>Время (мин)</span>
              <span>{duration}</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <button
            type="button"
            className="pt-btn pt-btn-primary"
            style={{ marginTop: 8, width: "100%", maxWidth: 360 }}
            onClick={() => void startExam()}
            disabled={disableStart}
          >
            {isStarting ? "Запуск…" : "Начать экзамен"}
          </button>
        </section>
      ) : null}

      {tab === "take" && exam ? (
        <section className={`pt-card ${styles.panel}`}>
          <div className={`${styles.timerBar} ${warn ? styles.timerWarn : ""}`}>
            <div>
              <span className="pt-muted" style={{ fontSize: "0.8rem" }}>
                Осталось
              </span>
              <div className={`${styles.timer} ${warn ? styles.timerWarn : ""}`}>
                {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
              </div>
            </div>
            <div className="pt-muted">
              Задача {Math.min(taskIndex + 1, Math.max(totalExam, 1))} / {totalExam || exam.task_ids.length}
            </div>
            <button
              type="button"
              className="pt-btn pt-btn-secondary"
              onClick={() => void submitExam()}
              disabled={!exam || !token || isSubmitting || isStarting}
            >
              {isSubmitting ? "Отправка…" : "Завершить досрочно"}
            </button>
          </div>

          {currentTask ? (
            <>
              <h2 className="pt-heading" style={{ fontSize: "1.05rem", marginBottom: 8 }}>
                {currentTask.title}
              </h2>
              <p className="pt-muted" style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                Сложность: {currentTask.difficulty}
              </p>
              <TaskCondition text={currentTask.condition_text} />
              <label className="pt-muted" style={{ fontSize: "0.85rem", display: "block", marginTop: 16 }}>
                Ваш ответ
              </label>
              <textarea
                className="pt-input"
                rows={3}
                placeholder="Число, формула или краткое пояснение — как в обычной проверке"
                style={{ marginTop: 6, width: "100%" }}
                value={answers[currentTask.id] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({
                    ...a,
                    [currentTask.id]: e.target.value,
                  }))
                }
              />
            </>
          ) : (
            <p className="pt-muted">Загрузка условий… Если список пуст, проверьте, что в системе есть задачи.</p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button
              type="button"
              className="pt-btn pt-btn-secondary"
              disabled={taskIndex <= 0}
              onClick={() => setTaskIndex((i) => Math.max(0, i - 1))}
            >
              ← Предыдущая
            </button>
            <button
              type="button"
              className="pt-btn pt-btn-primary"
              disabled={taskIndex >= examTasks.length - 1}
              onClick={() => setTaskIndex((i) => Math.min(examTasks.length - 1, i + 1))}
            >
              Следующая →
            </button>
          </div>
        </section>
      ) : null}

      {tab === "results" && result ? (
        <section className={`pt-card ${styles.panel}`}>
          <h2 className="pt-heading" style={{ fontSize: "1.15rem", marginBottom: 16 }}>
            Итоги
          </h2>
          <div
            className={styles.pie}
            aria-hidden
            style={{
              background: `conic-gradient(var(--pt-success) 0 ${pctCorrect}%, var(--pt-border) ${pctCorrect}% 100%)`,
            }}
          >
            <div className={styles.pieLabel}>
              {pctCorrect}%
              <br />
              <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>верно</span>
            </div>
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              padding: 16,
              borderRadius: 12,
              background: "var(--pt-formula-bg)",
              border: "1px solid var(--pt-border)",
            }}
          >
            {`Результат: ${result.correct}/${result.total}\n\n${result.recommendation}`}
          </pre>
          <div style={{ marginTop: 16 }}>
            <p className="pt-heading" style={{ fontSize: "1rem", marginBottom: 8 }}>
              Что дальше
            </p>
            <ul className="pt-muted">
              <li>
                <SubjectLink href="/theory">Теория</SubjectLink>
              </li>
              <li>
                <SubjectLink href="/practice">Задачи</SubjectLink>
              </li>
            </ul>
            <button
              type="button"
              className="pt-btn pt-btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                setTab("create");
                setResult(null);
              }}
            >
              Новый экзамен
            </button>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
