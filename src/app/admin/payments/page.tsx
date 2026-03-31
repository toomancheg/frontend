"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

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
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 12px", color: "#e8ecf4" }}>Платежи</h1>
      <p style={{ color: "#94a3b8", lineHeight: 1.6, marginBottom: 16 }}>
        Платежи подписок (Robokassa). Подтверждение приходит на Result URL backend.
      </p>
      {error ? <p style={{ color: "#f87171" }}>{error}</p> : null}

      {data ? (
        <>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: 12 }}>
            Всего: {data.total}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#94a3b8" }}>
                  <th style={{ padding: "8px 6px" }}>ID</th>
                  <th style={{ padding: "8px 6px" }}>Email</th>
                  <th style={{ padding: "8px 6px" }}>План</th>
                  <th style={{ padding: "8px 6px" }}>Сумма</th>
                  <th style={{ padding: "8px 6px" }}>Статус</th>
                  <th style={{ padding: "8px 6px" }}>Создан</th>
                  <th style={{ padding: "8px 6px" }}>Оплачен</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid #334155" }}>
                    <td style={{ padding: "8px 6px", color: "#e8ecf4" }}>{r.id}</td>
                    <td style={{ padding: "8px 6px", color: "#e8ecf4" }}>{r.email}</td>
                    <td style={{ padding: "8px 6px" }}>{r.plan}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {r.amount_out_sum} {r.currency}
                    </td>
                    <td style={{ padding: "8px 6px" }}>{r.status}</td>
                    <td style={{ padding: "8px 6px", color: "#94a3b8" }}>
                      {new Date(r.created_at).toLocaleString("ru-RU")}
                    </td>
                    <td style={{ padding: "8px 6px", color: "#94a3b8" }}>
                      {r.paid_at ? new Date(r.paid_at).toLocaleString("ru-RU") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              type="button"
              className="pt-btn pt-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </button>
            <button
              type="button"
              className="pt-btn pt-btn-secondary"
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
