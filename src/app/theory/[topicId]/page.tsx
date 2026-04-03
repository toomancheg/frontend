"use client";

import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MathMarkdown } from "@/components/content/MathMarkdown";
import { TheoryMarkdown } from "@/components/content/TheoryMarkdown";
import { AppShell } from "@/components/layout/AppShell";
import { SubjectLink } from "@/components/routing/SubjectLink";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "../theory.module.css";

type TheoryBlock = {
  id: string;
  title: string;
  markdown: string;
  image_urls: string[];
  tags: string[];
  topic_id: string;
};

type QuizQuestion = {
  id: string;
  theory_block_id: string;
  question: string;
  options: string[];
};

type Step = "idle" | "quiz" | "quiz_result";

export default function TheoryTopicPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const pathname = usePathname();
  const token = useRequireAuth();
  const [blocks, setBlocks] = useState<TheoryBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [quizBlockId, setQuizBlockId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<{ total: number; correct: number; passed: boolean } | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (!topicId) return;
    (async () => {
      try {
        const data = await apiFetch<TheoryBlock[]>(`/api/content/topics/${topicId}/theory-blocks`, {
          token,
          pathname,
        });
        setBlocks(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка загрузки";
        setError(msg);
      }
    })();
  }, [token, topicId, pathname]);

  useEffect(() => {
    if (blocks[0]) setActiveSection(blocks[0].id);
  }, [blocks]);

  const toc = useMemo(() => {
    if (blocks.length) return blocks.map((b) => ({ id: b.id, title: b.title }));
    return [];
  }, [blocks]);

  const openQuizForBlock = useCallback(
    async (blockId: string) => {
      if (!token) return;
      setQuizError(null);
      setQuizResult(null);
      setQuizLoading(true);
      setQuizBlockId(blockId);
      setStep("quiz");
      try {
        const list = await apiFetch<QuizQuestion[]>(`/api/content/theory-blocks/${blockId}/quiz-questions`, {
          token,
          pathname,
        });
        setQuizQuestions(list);
        setQuizAnswers({});
      } catch (e) {
        setQuizError(e instanceof Error ? e.message : "Не удалось загрузить квиз");
        setQuizQuestions([]);
      } finally {
        setQuizLoading(false);
      }
    },
    [token, pathname]
  );

  const submitQuiz = useCallback(async () => {
    if (!token || !quizBlockId) return;
    setQuizError(null);
    setQuizLoading(true);
    try {
      const res = await apiFetch<{ total: number; correct: number; passed: boolean }>(
        `/api/content/theory-blocks/${quizBlockId}/quiz-submit`,
        {
          method: "POST",
          token,
          pathname,
          body: { answers: quizAnswers },
        }
      );
      setQuizResult(res);
      setStep("quiz_result");
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : "Ошибка отправки квиза");
    } finally {
      setQuizLoading(false);
    }
  }, [token, quizBlockId, quizAnswers, pathname]);

  const activeBlock = blocks.find((b) => b.id === activeSection);

  return (
    <AppShell title="Изучение темы">
      <div style={{ marginBottom: 16 }}>
        <SubjectLink href="/theory" className="pt-btn pt-btn-secondary" style={{ padding: "8px 14px" }}>
          ← К списку тем
        </SubjectLink>
      </div>

      {error ? (
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: "#ef4444", margin: "0 0 8px" }}>{error}</p>
          {error.toLowerCase().includes("подписк") ? (
            <SubjectLink href="/subscription" className="pt-btn pt-btn-primary">
              Оформить подписку
            </SubjectLink>
          ) : null}
        </div>
      ) : null}

      <div className={styles.layout}>
        <nav className={`pt-card ${styles.toc} pt-hide-mobile`} aria-label="Содержание">
          <p className="pt-heading" style={{ fontSize: "0.85rem", marginBottom: 12 }}>
            Содержание
          </p>
          {toc.length ? (
            <ul>
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#block-${item.id}`}>{item.title}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pt-muted" style={{ fontSize: "0.85rem" }}>
              Нет разделов
            </p>
          )}
        </nav>

        <div className={`pt-hide-desktop ${styles.mobileToc}`}>
          <label className="pt-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: 6 }}>
            Содержание
          </label>
          {toc.length ? (
            <select
              className="pt-input"
              value={activeSection}
              onChange={(e) => {
                const id = e.target.value;
                setActiveSection(id);
                document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {toc.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="pt-muted" style={{ fontSize: "0.85rem" }}>
              Нет разделов
            </p>
          )}
        </div>

        <div className="pt-stagger">
          {blocks.length === 0 && !error ? (
            <div className="pt-card" style={{ padding: 24 }}>
              <p className="pt-muted">Материалов по этой теме пока нет.</p>
            </div>
          ) : null}
          {blocks.map((b) => (
            <article key={b.id} id={`block-${b.id}`} className={`pt-card ${styles.article}`}>
              <h2>{b.title}</h2>
              {b.tags?.length ? (
                <p className="pt-muted" style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                  {b.tags.join(" · ")}
                </p>
              ) : null}
              <TheoryMarkdown markdown={b.markdown} />
              {b.image_urls?.length ? (
                <div className={styles.images}>
                  {b.image_urls.map((url, i) => {
                    const src = resolveMediaUrl(url);
                    if (!src) return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${b.id}-img-${i}`}
                        src={src}
                        alt=""
                        className={styles.theoryImg}
                      />
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <aside className={`pt-card ${styles.sidePanel} pt-glass`}>
          <p className="pt-heading" style={{ fontSize: "1rem", marginBottom: 8 }}>
            Прогресс
          </p>
          <p className="pt-muted" style={{ fontSize: "0.85rem", marginBottom: 12 }}>
            Квиз по блоку
          </p>
          <p className="pt-muted" style={{ fontSize: "0.8rem", marginBottom: 8 }}>
            {activeBlock ? (
              <>
                Текущий раздел: <strong>{activeBlock.title}</strong>
              </>
            ) : (
              "Выберите раздел в содержании."
            )}
          </p>
          <button
            type="button"
            className="pt-btn pt-btn-primary"
            style={{ width: "100%" }}
            disabled={!activeBlock || !token}
            onClick={() => activeBlock && openQuizForBlock(activeBlock.id)}
          >
            Открыть квиз
          </button>
          <p className="pt-muted" style={{ fontSize: "0.8rem", marginTop: 12 }}>
            После блока теории — вопросы с вариантами. Проход: не менее 70% верных ответов.
          </p>
        </aside>
      </div>

      {step === "quiz" || step === "quiz_result" ? (
        <div className={styles.quizModal} role="dialog" aria-modal aria-labelledby="quiz-title">
          <div className={`pt-card ${styles.quizCard}`}>
            <h2 id="quiz-title" className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 12 }}>
              Квиз
            </h2>
            {quizError ? <p style={{ color: "#ef4444", marginBottom: 8 }}>{quizError}</p> : null}
            {quizLoading && step === "quiz" && !quizQuestions.length ? (
              <p className="pt-muted">Загрузка вопросов…</p>
            ) : null}
            {step === "quiz" && quizQuestions.length ? (
              <>
                {quizQuestions.map((q) => (
                  <fieldset key={q.id} style={{ marginBottom: 20, border: "none", padding: 0 }}>
                    <legend className="pt-heading" style={{ fontSize: "0.95rem", marginBottom: 8 }}>
                      <MathMarkdown text={q.question} />
                    </legend>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {q.options.map((opt) => (
                        <label key={opt} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={quizAnswers[q.id] === opt}
                            onChange={() => setQuizAnswers((a) => ({ ...a, [q.id]: opt }))}
                          />
                          <span>
                            <MathMarkdown text={opt} />
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="pt-btn pt-btn-primary"
                    disabled={quizLoading || Object.keys(quizAnswers).length < quizQuestions.length}
                    onClick={() => void submitQuiz()}
                  >
                    {quizLoading ? "Проверка…" : "Проверить ответы"}
                  </button>
                  <button
                    type="button"
                    className="pt-btn pt-btn-secondary"
                    onClick={() => {
                      setStep("idle");
                      setQuizBlockId(null);
                    }}
                  >
                    Закрыть
                  </button>
                </div>
              </>
            ) : null}
            {step === "quiz_result" && quizResult ? (
              <>
                <p style={{ marginBottom: 12 }}>
                  Результат: <strong>{quizResult.correct}</strong> из <strong>{quizResult.total}</strong> —{" "}
                  {quizResult.passed ? "зачёт" : "нужно повторить материал"}
                </p>
                <button
                  type="button"
                  className="pt-btn pt-btn-primary"
                  onClick={() => {
                    setStep("idle");
                    setQuizBlockId(null);
                    setQuizResult(null);
                  }}
                >
                  Закрыть
                </button>
              </>
            ) : null}
            {!quizLoading && step === "quiz" && !quizQuestions.length && !quizError ? (
              <p className="pt-muted">Для этого блока пока нет вопросов.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
