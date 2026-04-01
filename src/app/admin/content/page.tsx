"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./content.module.css";

type Topic = {
  id: string;
  title: string;
  order_index: number;
  difficulty: string;
};

type TaskRow = {
  id: string;
  topic_id: string;
  title: string;
  condition_text: string;
  image_url: string;
  difficulty: string;
};

const DIFFICULTIES = [
  { value: "easy", label: "Лёгкая" },
  { value: "medium", label: "Средняя" },
  { value: "hard", label: "Сложная" },
] as const;

export default function AdminContentPage() {
  const token = useRequireAuth();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskTopicFilter, setTaskTopicFilter] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [topicTitle, setTopicTitle] = useState("");
  const [topicOrder, setTopicOrder] = useState("0");
  const [topicDifficulty, setTopicDifficulty] = useState<string>("easy");

  const [taskTopicId, setTaskTopicId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCondition, setTaskCondition] = useState("");
  const [taskCorrect, setTaskCorrect] = useState("");
  const [taskImageUrl, setTaskImageUrl] = useState("");
  const [taskRefSolution, setTaskRefSolution] = useState("");
  const [taskDifficulty, setTaskDifficulty] = useState<string>("easy");

  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const refreshTopics = useCallback(async () => {
    if (!token) return;
    const list = await apiFetch<Topic[]>("/api/content/topics", { token });
    setTopics(list);
    setTaskTopicId((prev) => {
      if (list.length === 0) return "";
      if (prev && list.some((t) => t.id === prev)) return prev;
      return list[0].id;
    });
  }, [token]);

  const refreshTasks = useCallback(async () => {
    if (!token) return;
    const qs = taskTopicFilter ? `?topic_id=${encodeURIComponent(taskTopicFilter)}` : "";
    const list = await apiFetch<TaskRow[]>(`/api/content/tasks${qs}`, { token });
    setTasks(list);
  }, [token, taskTopicFilter]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    try {
      await refreshTopics();
      await refreshTasks();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Ошибка загрузки");
    }
  }, [token, refreshTopics, refreshTasks]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!token) return;
    void refreshTasks().catch(() => {});
  }, [token, taskTopicFilter, refreshTasks]);

  async function onCreateTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setFormOk(null);
    const order = Number.parseInt(topicOrder, 10);
    if (Number.isNaN(order)) {
      setFormError("Порядок — целое число");
      return;
    }
    setSavingTopic(true);
    try {
      await apiFetch<Topic>("/api/content/topics", {
        token,
        method: "POST",
        body: {
          title: topicTitle.trim(),
          order_index: order,
          difficulty: topicDifficulty,
        },
      });
      setTopicTitle("");
      setTopicOrder("0");
      setFormOk("Тема создана");
      await refreshTopics();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSavingTopic(false);
    }
  }

  async function onCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setFormError(null);
    setFormOk(null);
    if (!taskTopicId) {
      setFormError("Сначала создайте тему или выберите тему");
      return;
    }
    setSavingTask(true);
    try {
      await apiFetch("/api/content/tasks", {
        token,
        method: "POST",
        body: {
          topic_id: taskTopicId,
          title: taskTitle.trim(),
          condition_text: taskCondition.trim(),
          correct_answer: taskCorrect.trim(),
          image_url: taskImageUrl.trim() || undefined,
          reference_solution: taskRefSolution.trim() || undefined,
          difficulty: taskDifficulty,
        },
      });
      setTaskTitle("");
      setTaskCondition("");
      setTaskCorrect("");
      setTaskImageUrl("");
      setTaskRefSolution("");
      setFormOk("Задача создана");
      await refreshTasks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSavingTask(false);
    }
  }

  function topicTitleById(id: string): string {
    return topics.find((t) => t.id === id)?.title ?? id.slice(0, 8);
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>Контент</h1>
      <p className={styles.lead}>
        Создание тем и задач через API <code className={styles.mono}>/api/content/topics</code> и{" "}
        <code className={styles.mono}>/api/content/tasks</code>. Списки ниже обновляются после сохранения.
      </p>

      {loadError ? <p className={styles.err}>{loadError}</p> : null}
      {formError ? <p className={styles.err}>{formError}</p> : null}
      {formOk ? <p className={styles.ok}>{formOk}</p> : null}

      <div className={styles.grid}>
        <form className={styles.card} onSubmit={onCreateTopic}>
          <h2>Новая тема</h2>
          <div className={styles.field}>
            <label htmlFor="topic-title">Название</label>
            <input
              id="topic-title"
              className={styles.input}
              value={topicTitle}
              onChange={(ev) => setTopicTitle(ev.target.value)}
              required
              maxLength={512}
              autoComplete="off"
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="topic-order">Порядок (order_index)</label>
              <input
                id="topic-order"
                className={styles.input}
                type="number"
                value={topicOrder}
                onChange={(ev) => setTopicOrder(ev.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="topic-diff">Сложность</label>
              <select
                id="topic-diff"
                className={styles.select}
                value={topicDifficulty}
                onChange={(ev) => setTopicDifficulty(ev.target.value)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className={styles.btn} disabled={savingTopic || !token}>
            {savingTopic ? "Сохранение…" : "Создать тему"}
          </button>
        </form>

        <form className={styles.card} onSubmit={onCreateTask}>
          <h2>Новая задача</h2>
          <div className={styles.field}>
            <label htmlFor="task-topic">Тема</label>
            <select
              id="task-topic"
              className={styles.select}
              value={taskTopicId}
              onChange={(ev) => setTaskTopicId(ev.target.value)}
              required
              disabled={topics.length === 0}
            >
              {topics.length === 0 ? <option value="">Нет тем</option> : null}
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="task-title">Заголовок задачи</label>
            <input
              id="task-title"
              className={styles.input}
              value={taskTitle}
              onChange={(ev) => setTaskTitle(ev.target.value)}
              required
              maxLength={512}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="task-condition">Условие (текст)</label>
            <textarea
              id="task-condition"
              className={styles.textarea}
              value={taskCondition}
              onChange={(ev) => setTaskCondition(ev.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="task-correct">Правильный ответ</label>
            <input
              id="task-correct"
              className={styles.input}
              value={taskCorrect}
              onChange={(ev) => setTaskCorrect(ev.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="task-image">URL изображения (необязательно)</label>
            <input
              id="task-image"
              className={styles.input}
              value={taskImageUrl}
              onChange={(ev) => setTaskImageUrl(ev.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="task-ref">Эталонное решение (необязательно)</label>
            <textarea
              id="task-ref"
              className={styles.textarea}
              style={{ minHeight: 72 }}
              value={taskRefSolution}
              onChange={(ev) => setTaskRefSolution(ev.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="task-diff">Сложность</label>
            <select
              id="task-diff"
              className={styles.select}
              value={taskDifficulty}
              onChange={(ev) => setTaskDifficulty(ev.target.value)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={styles.btn} disabled={savingTask || !token || topics.length === 0}>
            {savingTask ? "Сохранение…" : "Создать задачу"}
          </button>
        </form>
      </div>

      <h2 className={styles.sectionTitle}>Темы</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Порядок</th>
              <th>Сложность</th>
            </tr>
          </thead>
          <tbody>
            {topics.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.cellMuted}>
                  Пока нет тем
                </td>
              </tr>
            ) : (
              topics.map((t) => (
                <tr key={t.id}>
                  <td className={styles.mono}>{t.id}</td>
                  <td>{t.title}</td>
                  <td>{t.order_index}</td>
                  <td>{t.difficulty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className={styles.sectionTitle}>Задачи</h2>
      <div className={styles.field} style={{ maxWidth: 360, marginBottom: 12 }}>
        <label htmlFor="task-filter">Фильтр по теме</label>
        <select
          id="task-filter"
          className={styles.select}
          value={taskTopicFilter}
          onChange={(ev) => setTaskTopicFilter(ev.target.value)}
        >
          <option value="">Все темы</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Тема</th>
              <th>Заголовок</th>
              <th>Условие</th>
              <th>Сложность</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.cellMuted}>
                  Нет задач
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id}>
                  <td className={styles.mono}>{t.id}</td>
                  <td>{topicTitleById(t.topic_id)}</td>
                  <td>{t.title}</td>
                  <td className={styles.cellMuted} title={t.condition_text}>
                    {t.condition_text}
                  </td>
                  <td>{t.difficulty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
