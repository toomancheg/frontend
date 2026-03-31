"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "../users.module.css";
import detailStyles from "./userDetail.module.css";

type AdminUserDetail = {
  id: string;
  email: string;
  role: string;
  grade: number;
  program: string;
  created_at: string;
  last_login_at: string | null;
  is_blocked: boolean;
  block_reason: string | null;
  solved_tasks?: number;
};

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const token = useRequireAuth();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState(9);
  const [program, setProgram] = useState("basic");
  const [role, setRole] = useState("student");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !userId) return;
    (async () => {
      try {
        const u = await apiFetch<AdminUserDetail>(`/api/admin/users/${userId}`, { token });
        setUser(u);
        setGrade(u.grade);
        setProgram(u.program);
        setRole(u.role);
        setIsBlocked(u.is_blocked);
        setBlockReason(u.block_reason ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
  }, [token, userId]);

  async function onSave() {
    if (!token || !user) return;
    setSaving(true);
    setError(null);
    try {
      const u = await apiFetch<AdminUserDetail>(`/api/admin/users/${userId}`, {
        method: "PATCH",
        token,
        body: {
          grade,
          program,
          role,
          is_blocked: isBlocked,
          block_reason: blockReason,
        },
      });
      setUser(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    if (!token || !user) return;
    if (!window.confirm("Сгенерировать новый временный пароль?")) return;
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ message?: string }>(
        `/api/admin/users/${userId}/reset-password`,
        { method: "POST", token, body: {} }
      );
      setNotice(
        res.message ??
          "Пароль сброшен. Передайте пользователю защищенный канал восстановления доступа."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  if (error && !user) {
    return (
      <div>
        <p className={styles.err}>{error}</p>
        <Link href="/admin/users" className={detailStyles.back}>
          ← К списку
        </Link>
      </div>
    );
  }

  if (!user) {
    return <p style={{ color: "#94a3b8" }}>Загрузка…</p>;
  }

  return (
    <div>
      <Link href="/admin/users" className={detailStyles.back}>
        ← К списку пользователей
      </Link>
      <h1 className={styles.title}>Пользователь</h1>
      <p className={detailStyles.meta}>{user.email}</p>

      {error ? <p className={styles.err}>{error}</p> : null}
      {notice ? <p style={{ color: "#22c55e", marginBottom: 12 }}>{notice}</p> : null}

      <section className={detailStyles.card}>
        <h2 className={detailStyles.h2}>Основная информация</h2>
        <div className={detailStyles.grid}>
          <div className={styles.field}>
            <label htmlFor="g">Класс</label>
            <input
              id="g"
              type="number"
              min={1}
              max={12}
              className={styles.input}
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="p">Программа</label>
            <select
              id="p"
              className={styles.select}
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option value="basic">Базовая</option>
              <option value="profile">Профильная</option>
              <option value="olympiad">Олимпиадная</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="r">Роль</label>
            <select
              id="r"
              className={styles.select}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">Пользователь</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
              />{" "}
              Заблокирован
            </label>
          </div>
          <div className={`${styles.field} ${detailStyles.span2}`}>
            <label htmlFor="br">Причина блокировки</label>
            <input
              id="br"
              className={styles.input}
              style={{ width: "100%", maxWidth: 480 }}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
        </div>
        <div className={detailStyles.actions}>
          <button type="button" className={styles.btn} disabled={saving} onClick={() => void onSave()}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => void onResetPassword()}>
            Сбросить пароль
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.push("/admin/users")}>
            Отмена
          </button>
        </div>
      </section>

      <section className={detailStyles.card}>
        <h2 className={detailStyles.h2}>Прогресс</h2>
        <p className={detailStyles.meta}>
          Решено задач: <strong>{user.solved_tasks ?? 0}</strong>
        </p>
        <p className={detailStyles.meta}>
          Регистрация: {new Date(user.created_at).toLocaleString("ru-RU")} · Последний вход:{" "}
          {user.last_login_at ? new Date(user.last_login_at).toLocaleString("ru-RU") : "—"}
        </p>
      </section>
    </div>
  );
}
