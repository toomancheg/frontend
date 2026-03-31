"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiFetch, apiFetchBlob } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./users.module.css";

type AdminUser = {
  id: string;
  email: string;
  role: string;
  grade: number;
  program: string;
  created_at: string;
  last_login_at: string | null;
  is_blocked: boolean;
  block_reason: string | null;
};

type ListOut = {
  items: AdminUser[];
  total: number;
  page: number;
  per_page: number;
};

const PROGRAM_LABEL: Record<string, string> = {
  basic: "Базовая",
  profile: "Профильная",
  olympiad: "Олимпиадная",
};

function buildQuery(params: Record<string, string | number>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === "" || v === "all") return;
    q.set(k, String(v));
  });
  return q.toString();
}

export default function AdminUsersPage() {
  const token = useRequireAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [grade, setGrade] = useState("all");
  const [activity, setActivity] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [data, setData] = useState<ListOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const qs = buildQuery({
        q,
        role,
        grade,
        activity,
        page,
        per_page: perPage,
      });
      const path = `/api/admin/users${qs ? `?${qs}` : ""}`;
      const out = await apiFetch<ListOut>(path, { token });
      setData(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, [token, q, role, grade, activity, page, perPage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onExport() {
    if (!token) return;
    const qs = buildQuery({ q, role, grade, activity });
    const path = `/api/admin/users/export${qs ? `?${qs}` : ""}`;
    const blob = await apiFetchBlob(path, { token });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <div>
      <h1 className={styles.title}>Пользователи</h1>

      <div className={styles.toolbar}>
        <div className={styles.field}>
          <label htmlFor="adm-q">Поиск (email / UUID)</label>
          <input
            id="adm-q"
            className={styles.input}
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="adm-role">Роль</label>
          <select
            id="adm-role"
            className={styles.select}
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
            }}
          >
            <option value="all">Все</option>
            <option value="admin">Администраторы</option>
            <option value="student">Пользователи</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="adm-grade">Класс</label>
          <select
            id="adm-grade"
            className={styles.select}
            value={grade}
            onChange={(e) => {
              setPage(1);
              setGrade(e.target.value);
            }}
          >
            <option value="all">Все</option>
            {[7, 8, 9, 10, 11].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value="student">Студент (12)</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="adm-act">Активность</label>
          <select
            id="adm-act"
            className={styles.select}
            value={activity}
            onChange={(e) => {
              setPage(1);
              setActivity(e.target.value);
            }}
          >
            <option value="">—</option>
            <option value="today">Сегодня</option>
            <option value="week">За неделю</option>
            <option value="inactive_30">Неактивен &gt; 30 дн.</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="adm-pp">На странице</label>
          <select
            id="adm-pp"
            className={styles.select}
            value={perPage}
            onChange={(e) => {
              setPage(1);
              setPerPage(Number(e.target.value));
            }}
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => void load()}>
          Обновить
        </button>
        <button type="button" className={styles.btn} onClick={() => void onExport()}>
          Экспорт CSV
        </button>
      </div>

      {error ? <p className={styles.err}>{error}</p> : null}

      {data ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Класс</th>
                  <th>Программа</th>
                  <th>Роль</th>
                  <th>Регистрация</th>
                  <th>Последний вход</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className={u.is_blocked ? styles.rowBlocked : undefined}>
                    <td>
                      <Link href={`/admin/users/${u.id}`} className={styles.link}>
                        {u.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.grade}</td>
                    <td>{PROGRAM_LABEL[u.program] ?? u.program}</td>
                    <td>{u.role === "admin" ? "Админ" : "Ученик"}</td>
                    <td>{new Date(u.created_at).toLocaleString("ru-RU")}</td>
                    <td>
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td>{u.is_blocked ? "Заблокирован" : "Ок"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pager}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <span>
              Стр. {page} / {totalPages} · всего {data.total}
            </span>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд
            </button>
          </div>
        </>
      ) : (
        <p style={{ color: "#94a3b8" }}>Загрузка…</p>
      )}
    </div>
  );
}
