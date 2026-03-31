"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "../users/users.module.css";
import logStyles from "./logs.module.css";

type Row = {
  id: string;
  created_at: string;
  admin_email: string;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  ip: string | null;
  details: string | null;
};

type ListOut = {
  items: Row[];
  total: number;
  page: number;
  per_page: number;
};

export default function AdminLogsPage() {
  const token = useRequireAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setError(null);
      try {
        const out = await apiFetch<ListOut>(`/api/admin/audit-logs?page=${page}&per_page=25`, { token });
        setData(out);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
  }, [token, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <div>
      <h1 className={styles.title}>Логи аудита</h1>
      <p className={logStyles.lead}>
        Записи действий администраторов. Удаление записей не предусмотрено (ротация по политике хранения
        — на стороне инфраструктуры).
      </p>

      {error ? <p className={styles.err}>{error}</p> : null}

      {data ? (
        <>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${logStyles.tableFixed}`}>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Администратор</th>
                  <th>Действие</th>
                  <th>Объект</th>
                  <th>IP</th>
                  <th>Детали</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleString("ru-RU")}</td>
                    <td>{r.admin_email}</td>
                    <td>{r.action}</td>
                    <td>{r.target_email ?? r.target_user_id ?? "—"}</td>
                    <td>{r.ip ?? "—"}</td>
                    <td className={logStyles.detailsCell}>{r.details ?? "—"}</td>
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
