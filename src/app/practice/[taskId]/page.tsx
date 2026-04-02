"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import { AppShell } from "@/components/layout/AppShell";
import { SubjectLink } from "@/components/routing/SubjectLink";
import { apiFetch, apiFetchForm, apiGetOr404 } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "../practice.module.css";
import "katex/dist/katex.min.css";

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

type Mode = "explain" | "interactive" | "self";

type SelfCheckState = {
  source?: string;
  check_id: string | null;
  check_status: string | null;
  photo_url: string;
  answer_text: string;
  result_text: string;
  score: number | null;
  dialog: { role: "user" | "assistant"; text: string }[];
  task_progress_status?: string;
};

function normalizeLatexDelimiters(value: string): string {
  return value
    .replace(/\\\[([\s\S]+?)\\\]/g, "$$$$1$$$$")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$$$1$");
}

type ExplainStepBlock = { title: string; body: string };

/** Строка — явный заголовок шага (модели по-разному оформляют маркеры). */
function isExplicitStepHeaderLine(line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  // ### Шаг 1 / ## Шаг 2 — …
  if (/^#{1,6}\s*Шаг\s*\d+/iu.test(s)) return true;
  // Step 1 (латиница)
  if (/^#{1,6}\s*Step\s*\d+/iu.test(s)) return true;
  // **Шаг 1** …
  if (/^\*{1,2}\s*Шаг\s*\d+/iu.test(s)) return true;
  if (/^\*{1,2}\s*Step\s*\d+/iu.test(s)) return true;
  // Отдельная строка «Шаг 1: …» / «Шаг 1 — …» / «Шаг 1»
  if (/^Шаг\s*\d+(\s*$|[\s.:)\]—\-\u2013\u2014])/iu.test(s)) return true;
  if (/^Step\s*\d+(\s*$|[\s.:)\]—\-\u2013\u2014])/iu.test(s)) return true;
  // «1. Шаг …» / «1) Шаг …»
  if (/^\d+[\).]\s+Шаг\b/iu.test(s)) return true;
  return false;
}

function stripStepTitleMarkdown(titleLine: string): string {
  return titleLine
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/^\*+\s*/, "")
    .replace(/\s*\*+$/, "")
    .trim();
}

/**
 * Делит текст по строкам-заголовкам шагов. Без таких строк возвращает null
 * (не используем разбиение по пустым строкам — оно даёт неверное число «шагов»).
 */
function splitExplanationByExplicitSteps(text: string): ExplainStepBlock[] | null {
  const lines = text.split(/\r?\n/);
  const firstHeaderIdx = lines.findIndex(isExplicitStepHeaderLine);
  if (firstHeaderIdx === -1) {
    return null;
  }

  const preamble = lines.slice(0, firstHeaderIdx).join("\n").trim();
  const parts: string[] = [];
  let currentStart = firstHeaderIdx;
  for (let i = firstHeaderIdx + 1; i <= lines.length; i++) {
    if (i === lines.length || isExplicitStepHeaderLine(lines[i])) {
      parts.push(lines.slice(currentStart, i).join("\n"));
      currentStart = i;
    }
  }

  return parts.map((part, idx) => {
    const chunkLines = part.split(/\r?\n/);
    const rawTitle = stripStepTitleMarkdown(chunkLines[0]);
    let body = chunkLines.slice(1).join("\n").trim();
    if (idx === 0 && preamble) {
      body = preamble + (body ? `\n\n${body}` : "");
    }
    return { title: rawTitle || `Шаг ${idx + 1}`, body };
  });
}

function explainBlocksFromOutput(output: string): ExplainStepBlock[] {
  const trimmed = output.trim();
  if (!trimmed) return [];

  const byHeaders = splitExplanationByExplicitSteps(output);
  if (byHeaders?.length) {
    return byHeaders;
  }

  return [{ title: "Решение", body: trimmed }];
}

function MathContent({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className={styles.markdownParagraph}>{children}</p>,
          ul: ({ children }) => <ul className={styles.markdownList}>{children}</ul>,
          ol: ({ children }) => <ol className={styles.markdownList}>{children}</ol>,
          li: ({ children }) => <li className={styles.markdownListItem}>{children}</li>,
        }}
      >
        {normalizeLatexDelimiters(text)}
      </ReactMarkdown>
    </div>
  );
}

export default function PracticeTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const token = useRequireAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [mode, setMode] = useState<Mode>("explain");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [activeMode, setActiveMode] = useState<"explain" | "hint" | "self" | null>(null);
  const [explainJobId, setExplainJobId] = useState<string | null>(null);
  const [interactiveSessionId, setInteractiveSessionId] = useState<string | null>(null);
  const [chat, setChat] = useState<{ role: "user" | "sys"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [checkResult, setCheckResult] = useState<{ score: number | null; text: string } | null>(null);
  const [selfCheckDialog, setSelfCheckDialog] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [pollCheckId, setPollCheckId] = useState<string | null>(null);
  const allowDraftSave = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (!taskId) return;
    (async () => {
      try {
        const found = await apiGetOr404<Task>(`/api/content/tasks/${taskId}`, { token });
        setTask(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
  }, [token, taskId]);

  useEffect(() => {
    if (mode !== "interactive" || !token || !taskId || task?.list_only === true) {
      setInteractiveSessionId(null);
      setChat([]);
      return;
    }

    let cancelled = false;
    setError(null);
    setInteractiveSessionId(null);
    setChat([]);

    (async () => {
      try {
        const start = await apiFetch<{ session_id: string; assistant_message: string }>(
          "/api/practice/interactive/start",
          {
            method: "POST",
            token,
            body: { task_id: taskId },
          }
        );
        if (cancelled) return;
        setInteractiveSessionId(start.session_id);
        setChat([{ role: "sys", text: start.assistant_message }]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не удалось начать диалог");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, token, taskId, task?.list_only]);

  useEffect(() => {
    if (mode !== "explain") {
      setExplainJobId(null);
    }
  }, [mode]);

  useEffect(() => {
    setOutput("");
    setAnswer("");
    setPhotoName(null);
    setUploadedPhotoUrl(null);
    setCheckResult(null);
    setPollCheckId(null);
    setSelfCheckDialog([]);
    allowDraftSave.current = false;
    setPhotoPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, [taskId]);

  useEffect(() => {
    if (!token || !taskId || mode !== "explain") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetOr404<{ explanation: string }>(
          `/api/practice/tasks/${taskId}/explain`,
          { token }
        );
        if (cancelled || !data?.explanation) return;
        setOutput(data.explanation);
      } catch {
        /* опциональная подгрузка кэша — не показываем как фатальную ошибку страницы */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, taskId, mode]);

  useEffect(() => {
    if (!token || !explainJobId) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await apiFetch<
          | { status: "pending" | "running"; job_id: string; task_id: string }
          | { status: "completed"; job_id: string; task_id: string; explanation: string }
        >(`/api/practice/explain-jobs/${explainJobId}`, { token });
        if (cancelled) return;

        if (data.status === "completed") {
          setOutput(data.explanation);
          setExplainJobId(null);
          setActiveMode(null);
          return;
        }

        // pending / running
        setTimeout(poll, 1200);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "Не удалось получить объяснение. Проверьте подключение к ИИ и повторите позже."
        );
        setExplainJobId(null);
        setActiveMode(null);
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [token, explainJobId]);

  useEffect(() => {
    if (mode !== "self" || !token || !taskId || task?.list_only === true) {
      allowDraftSave.current = false;
      return;
    }
    let cancelled = false;
    allowDraftSave.current = false;
    setPollCheckId(null);
    (async () => {
      try {
        const data = await apiFetch<SelfCheckState>(`/api/practice/tasks/${taskId}/self-check-state`, { token });
        if (cancelled) return;
        setAnswer(data.answer_text ?? "");
        const purl = (data.photo_url ?? "").trim();
        if (purl) {
          setUploadedPhotoUrl(purl);
          setPhotoPreviewUrl(purl);
          setPhotoName("Сохранённое фото");
        } else {
          setUploadedPhotoUrl(null);
          setPhotoPreviewUrl(null);
          setPhotoName(null);
        }
        if (data.check_status === "completed" && (data.result_text ?? "").trim()) {
          setCheckResult({ score: data.score ?? null, text: data.result_text ?? "" });
        } else {
          setCheckResult(null);
        }
        if (data.check_status === "failed") {
          setError((data.result_text ?? "").trim() || "Ошибка проверки");
        } else if (!cancelled) {
          setError(null);
        }
        const st = data.check_status;
        if (st === "pending" || st === "running") {
          setPollCheckId(data.check_id);
        }
        setSelfCheckDialog(Array.isArray(data.dialog) ? data.dialog : []);
        allowDraftSave.current = true;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить сохранённое решение");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, token, taskId, task?.list_only]);

  useEffect(() => {
    if (mode !== "self" || !token || !taskId || task?.list_only === true || !allowDraftSave.current) {
      return;
    }
    const t = setTimeout(() => {
      if (!allowDraftSave.current) return;
      void apiFetch(`/api/practice/tasks/${taskId}/self-check-draft`, {
        method: "PUT",
        token,
        body: { photo_url: uploadedPhotoUrl ?? "", answer_text: answer },
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [answer, uploadedPhotoUrl, mode, token, taskId, task?.list_only]);

  useEffect(() => {
    if (!token || !pollCheckId || !taskId || task?.list_only === true) return;
    let cancelled = false;
    type Poll = {
      check_id: string;
      status: string;
      result_text?: string;
      task_progress_status?: string;
      score?: number | null;
    };
    (async () => {
      for (let i = 0; i < 120 && !cancelled; i++) {
        try {
          const data = await apiFetch<Poll>(`/api/practice/solution-check/${pollCheckId}`, { token });
          if (data.status === "completed") {
            setCheckResult({ score: data.score ?? null, text: data.result_text ?? "" });
            setPollCheckId(null);
            setError(null);
            try {
              const s = await apiFetch<SelfCheckState>(`/api/practice/tasks/${taskId}/self-check-state`, { token });
              if (!cancelled) setSelfCheckDialog(Array.isArray(s.dialog) ? s.dialog : []);
            } catch {
              /* ignore */
            }
            break;
          }
          if (data.status === "failed") {
            setError(data.result_text?.trim() || "Ошибка проверки");
            setPollCheckId(null);
            setCheckResult(null);
            break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        } catch {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, pollCheckId, taskId, task?.list_only]);

  async function explainMode() {
    if (!token || !taskId || activeMode) return;
    setError(null);
    setActiveMode("explain");
    try {
      const data = await apiFetch<
        | { explanation: string; from_cache: boolean }
        | { job_id: string; status: string; callback_url: string }
      >(`/api/practice/tasks/${taskId}/explain`, {
        method: "POST",
        token,
      });
      if ("explanation" in data) {
        setOutput(data.explanation);
        setActiveMode(null);
        return;
      }

      // async: store job id and start polling
      setExplainJobId(data.job_id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось получить объяснение. Проверьте подключение к ИИ и повторите позже."
      );
    } finally {
      // В синхронном сценарии мы уже сняли activeMode выше; в async снимет polling.
      // Здесь ничего не делаем, чтобы не мигать состоянием.
    }
  }

  async function interactiveStep(action: "hint" | "next_step") {
    if (!token || !interactiveSessionId || activeMode) return;
    setError(null);
    setActiveMode("hint");
    try {
      const step = await apiFetch<{ assistant_message: string }>("/api/practice/interactive/step", {
        method: "POST",
        token,
        body: { session_id: interactiveSessionId, action, user_message: "" },
      });
      setChat((c) => [...c, { role: "sys", text: step.assistant_message }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка чата");
    } finally {
      setActiveMode(null);
    }
  }

  async function selfMode() {
    if (!token || !taskId || activeMode) return;
    if (!uploadedPhotoUrl) return;
    setError(null);
    setActiveMode("self");
    try {
      const started = await apiFetch<{ check_id: string; status: string }>("/api/practice/solution-check", {
        method: "POST",
        token,
        body: { task_id: taskId, photo_url: uploadedPhotoUrl, answer_text: answer },
      });
      const checkId = started.check_id;
      type Poll = {
        check_id: string;
        status: string;
        result_text?: string;
        task_progress_status?: string;
        score?: number | null;
      };
      const maxPolls = 120;
      for (let i = 0; i < maxPolls; i++) {
        let data: Poll;
        try {
          data = await apiFetch<Poll>(`/api/practice/solution-check/${checkId}`, { token });
        } catch (e) {
          if (i === maxPolls - 1) {
            throw e;
          }
          /* Прокси мог оборвать долгий GET, пока ИИ ещё считает — следующий опрос обычно быстрый. */
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        if (data.status === "completed") {
          setCheckResult({ score: data.score ?? null, text: data.result_text ?? "" });
          try {
            const s = await apiFetch<SelfCheckState>(`/api/practice/tasks/${taskId}/self-check-state`, { token });
            setSelfCheckDialog(Array.isArray(s.dialog) ? s.dialog : []);
          } catch {
            /* ignore */
          }
          return;
        }
        if (data.status === "failed") {
          throw new Error(data.result_text?.trim() || "Ошибка проверки");
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      throw new Error(
        "Превышено время ожидания проверки. Подождите и обновите страницу — ответ мог сохраниться на сервере."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка проверки");
    } finally {
      setActiveMode(null);
    }
  }

  async function onPickPhoto(file: File | null) {
    if (!file || !token) return;
    setError(null);
    setPhotoName(file.name);
    setUploadedPhotoUrl(null);
    setCheckResult(null);

    if (photoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    const local = URL.createObjectURL(file);
    setPhotoPreviewUrl(local);

    const form = new FormData();
    form.append("file", file);

    setPhotoUploading(true);
    try {
      const uploaded = await apiFetchForm<{ photo_url: string }>("/api/practice/solution-photo/upload", {
        token,
        body: form,
      });
      setUploadedPhotoUrl(uploaded.photo_url);
      if (taskId) {
        try {
          await apiFetch(`/api/practice/tasks/${taskId}/self-check-draft`, {
            method: "PUT",
            token,
            body: { photo_url: uploaded.photo_url, answer_text: answer },
          });
        } catch {
          /* черновик — не блокируем загрузку */
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || !token || !interactiveSessionId || activeMode) return;
    setChat((c) => [...c, { role: "user", text: msg }]);
    setChatInput("");
    setError(null);
    setActiveMode("hint");
    try {
      const step = await apiFetch<{ assistant_message: string }>("/api/practice/interactive/step", {
        method: "POST",
        token,
        body: { session_id: interactiveSessionId, action: "message", user_message: msg },
      });
      setChat((c) => [...c, { role: "sys", text: step.assistant_message }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки сообщения");
    } finally {
      setActiveMode(null);
    }
  }

  const explainBlocks: ExplainStepBlock[] = output ? explainBlocksFromOutput(output) : [];

  const scoreClass =
    checkResult?.score != null
      ? checkResult.score >= 4
        ? styles.scoreGood
        : checkResult.score >= 3
          ? styles.scoreMid
          : styles.scoreBad
      : styles.scoreMid;

  async function resetSelfCheck() {
    if (!token || !taskId || activeMode || photoUploading) return;
    setError(null);
    try {
      await apiFetch(`/api/practice/tasks/${taskId}/self-check`, { method: "DELETE", token });
      allowDraftSave.current = false;
      setAnswer("");
      setPhotoName(null);
      setUploadedPhotoUrl(null);
      setCheckResult(null);
      setPollCheckId(null);
      setSelfCheckDialog([]);
      setPhotoPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      allowDraftSave.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сбросить прогресс");
    }
  }

  const locked = task?.list_only === true;

  return (
    <AppShell title={task?.title ?? "Задача"}>
      <div style={{ marginBottom: 12 }}>
        <SubjectLink href="/practice" className="pt-btn pt-btn-secondary" style={{ padding: "8px 14px" }}>
          ← К списку
        </SubjectLink>
      </div>

      {error ? <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p> : null}

      {locked ? (
        <div className="pt-card" style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ margin: "0 0 12px", lineHeight: 1.6 }}>
            Условие и инструменты решения для этой задачи доступны по подписке, в бесплатном лимите настроенного
            раздела или если вы уже начинали эту задачу ранее.
          </p>
          <SubjectLink href="/subscription" className="pt-btn pt-btn-primary">
            Оформить подписку
          </SubjectLink>
        </div>
      ) : null}

      {!locked ? (
        <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["Объяснение", "explain"],
            ["Интерактив", "interactive"],
            ["Сам с проверкой", "self"],
          ] as const
        ).map(([label, key]) => (
          <button
            key={key}
            type="button"
            className="pt-chip"
            data-active={mode === key}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.solve}>
        <section className={`pt-card ${styles.pane}`}>
          <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
            Условие
          </h2>
          <MathContent text={task?.condition_text ?? "Загрузка…"} />
          <div className="pt-formula" style={{ fontSize: "0.9rem" }}>
            Пример: <code>v = v₀ + at</code> — формулы в моноширинном блоке с янтарным акцентом.
          </div>
        </section>

        <section className={`pt-card ${styles.pane}`}>
          {mode === "explain" ? (
            <>
              <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
                Решение от ИИ-наставника
              </h2>
              {output.trim().length === 0 ? (
                <button
                  type="button"
                  className="pt-btn pt-btn-secondary"
                  style={{ marginBottom: 12 }}
                  onClick={explainMode}
                  disabled={!!activeMode}
                >
                  {activeMode === "explain" ? "Загрузка…" : "Получить решение"}
                </button>
              ) : null}
              {explainBlocks.length > 0 ? (
                <div>
                  {explainBlocks.map((block, i) => (
                    <details key={i} className={styles.step}>
                      <summary>💡 {block.title}</summary>
                      <MathContent text={block.body} className={styles.markdownContent} />
                    </details>
                  ))}
                </div>
              ) : null}
              <label className="pt-muted" style={{ fontSize: "0.85rem", display: "block", marginTop: 12 }}>
                Уточняющий вопрос
              </label>
              <input type="text" className="pt-input" placeholder="Спросить наставника…" />
            </>
          ) : null}

          {mode === "interactive" ? (
            <>
              <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
                Диалог с наставником
              </h2>
              <div className={styles.chat}>
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={`${styles.bubble} ${m.role === "sys" ? styles["bubble-sys"] : styles["bubble-user"]}`}
                  >
                    <MathContent text={m.text} className={styles.chatMarkdown} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {["Записать дано", "Нарисовать схему", "Выбрать ось"].map((x) => (
                  <button key={x} type="button" className="pt-chip" onClick={() => setChatInput(x)}>
                    {x}
                  </button>
                ))}
              </div>
              <div className={styles.chatInput}>
                <input
                  className="pt-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ваш ответ…"
                />
                <button type="button" className="pt-btn pt-btn-secondary" onClick={sendChat}>
                  Отправить
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="pt-btn pt-btn-secondary"
                  onClick={() => void interactiveStep("hint")}
                  disabled={!!activeMode || !interactiveSessionId}
                >
                  💡 Подсказка
                </button>
                <button
                  type="button"
                  className="pt-btn pt-btn-primary"
                  onClick={() => void interactiveStep("next_step")}
                  disabled={!!activeMode || !interactiveSessionId}
                >
                  Следующий шаг
                </button>
              </div>
            </>
          ) : null}

          {mode === "self" ? (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <h2 className="pt-heading" style={{ fontSize: "1.1rem", margin: 0 }}>
                  Решение и проверка
                </h2>
                <button
                  type="button"
                  className="pt-btn pt-btn-secondary"
                  style={{ padding: "8px 14px" }}
                  onClick={() => void resetSelfCheck()}
                  disabled={!!activeMode || photoUploading}
                >
                  Заново
                </button>
              </div>
              <label className={styles.label}>
                <span className="pt-muted" style={{ fontSize: "0.85rem" }}>
                  Ответ (число / текст / формула)
                </span>
                <input className="pt-input" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </label>
              <div
                className={`${styles.dropzone} ${activeMode === "self" ? styles.pulse : ""}`}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  id="solution-photo-input"
                  onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="solution-photo-input" style={{ cursor: "pointer", display: "block" }}>
                  {photoName ? (
                    <span>
                      {photoUploading ? "Загрузка…" : uploadedPhotoUrl ? "Загружено" : "Выбрано"}: {photoName}
                    </span>
                  ) : (
                    <>
                      Загрузить фото решения
                      <br />
                      <span className="pt-muted" style={{ fontSize: "0.85rem" }}>
                        Нажмите, чтобы выбрать файл
                      </span>
                    </>
                  )}
                </label>
                {photoPreviewUrl ? (
                  <img
                    src={photoPreviewUrl}
                    alt="Превью решения"
                    style={{ marginTop: 10, maxWidth: "100%", borderRadius: 12 }}
                  />
                ) : null}
              </div>
              {selfCheckDialog.length > 0 ? (
                <div className={styles.chat} style={{ marginTop: 16 }}>
                  <p className="pt-muted" style={{ fontSize: "0.85rem", margin: "0 0 8px" }}>
                    Сохранённый диалог
                  </p>
                  {selfCheckDialog.map((m, i) => (
                    <div
                      key={i}
                      className={`${styles.bubble} ${m.role === "assistant" ? styles["bubble-sys"] : styles["bubble-user"]}`}
                    >
                      <MathContent text={m.text} className={styles.chatMarkdown} />
                    </div>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="pt-btn pt-btn-primary"
                style={{ width: "100%", marginTop: 12 }}
                onClick={selfMode}
                disabled={!uploadedPhotoUrl || photoUploading || !!activeMode}
              >
                {activeMode === "self" ? "ИИ анализирует…" : "Отправить на проверку"}
              </button>
              {activeMode === "self" ? (
                <p className="pt-muted" style={{ marginTop: 12, textAlign: "center" }}>
                  ИИ анализирует решение…
                </p>
              ) : null}
              {checkResult ? (
                <div className="pt-card" style={{ marginTop: 16, padding: 16 }}>
                  {checkResult.score != null ? (
                    <div className={`${styles.score} ${scoreClass}`}>{checkResult.score} / 5</div>
                  ) : null}
                  <div style={{ marginTop: checkResult.score != null ? 8 : 0 }}>
                    <MathContent text={checkResult.text} className={styles.markdownContent} />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
        </>
      ) : null}

      <div className={styles.bottomBar}>
        <SubjectLink href="/practice" className="pt-btn pt-btn-secondary">
          Назад
        </SubjectLink>
        {!locked ? (
          <>
            <button type="button" className="pt-btn pt-btn-secondary">
              Сохранить
            </button>
            <button type="button" className="pt-btn pt-btn-primary">
              Вперёд
            </button>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
