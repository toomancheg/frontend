"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

import uiStyles from "../users/users.module.css";
import styles from "./payments.module.css";

type Row = {
  id: number;
  user_id: string;
  email: string;
  plan: string;
  amount_out_sum: string;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
};

type ListPayload = {
  items: Row[];
  total: number;
  page: number;
  per_page: number;
};

export default function AdminPaymentsPage() {
  const token = useRequireAuth();
  const [data, setData] = useState<ListPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await apiFetch<ListPayload>(`/api/admin/payments?page=${page}&per_page=30`, { token });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
      setData(null);
    }
  }, [token, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section style={{ maxWidth: 960 }}>
      <h1 className={styles.title}>Платежи</h1>
      <p className={styles.lead}>
        Платежи подписок (Robokassa). Подтверждение приходит на Result URL backend.
      </p>
      {error ? <p className={uiStyles.err}>{error}</p> : null}

      {data ? (
        <>
          <p className={styles.meta}>Всего: {data.total}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>План</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th>Оплачен</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td className={styles.cellStrong}>{r.id}</td>
                    <td className={styles.cellStrong}>{r.email}</td>
                    <td>{r.plan}</td>
                    <td>
                      {r.amount_out_sum} {r.currency}
                    </td>
                    <td>{r.status}</td>
                    <td className="pt-muted">{new Date(r.created_at).toLocaleString("ru-RU")}</td>
                    <td className="pt-muted">
                      {r.paid_at ? new Date(r.paid_at).toLocaleString("ru-RU") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${uiStyles.btn} ${uiStyles.btnGhost}`}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <button
              type="button"
              className={`${uiStyles.btn} ${uiStyles.btnGhost}`}
              disabled={!data.items.length || page * data.per_page >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
