"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import { clearTokens, getAccessToken, getRefreshToken } from "@/lib/auth";
import { buttonStyle, uiStyles } from "@/app/uiStyles";

type UserOut = {
  id: string;
  email: string;
  role: "student" | "admin";
  grade: number;
  program: string;
};
type DashboardStats = {
  solved_tasks: number;
  total_tasks: number;
  topics_total: number;
  by_difficulty: Record<string, number>;
  weak_topics: string[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const accessToken = useMemo(() => getAccessToken(), []);
  const refreshToken = useMemo(() => getRefreshToken(), []);

  useEffect(() => {
    if (!accessToken) {
      router.push("/auth/login");
      return;
    }

    (async () => {
      try {
        const me = await apiFetch<UserOut>("/api/auth/me", { token: accessToken });
        setUser(me);
        const dashboard = await apiFetch<DashboardStats>("/api/dashboard/stats", { token: accessToken });
        setStats(dashboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки профиля");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogout() {
    try {
      if (refreshToken) {
        await apiFetch("/api/auth/logout", {
          method: "POST",
          body: { refresh_token: refreshToken },
        });
      }
    } catch {
      // Logout идемпотентен
    } finally {
      clearTokens();
      router.push("/auth/login");
    }
  }

  return (
    <main style={{ ...uiStyles.page, maxWidth: 700 }}>
      <h1 style={{ marginBottom: 8 }}>Личный кабинет</h1>

      {error ? <div style={{ color: "crimson", marginBottom: 12 }}>Не удалось загрузить данные кабинета: {error}</div> : null}

      {isLoading ? (
        <div>Загрузка...</div>
      ) : user ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Роль:</strong> {user.role}
          </div>
          <div>
            <strong>Класс:</strong> {user.grade}
          </div>
          <div>
            <strong>Программа:</strong> {user.program}
          </div>

          <button onClick={onLogout} style={{ ...buttonStyle(), marginTop: 14 }}>
            Выйти
          </button>
          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <Link href="/theory">Теория</Link>
            <Link href="/practice">Практика</Link>
            <Link href="/exam">Экзамен</Link>
          </div>
          {stats ? (
            <div style={{ ...uiStyles.mutedCard, marginTop: 16 }}>
              <div>
                <strong>Прогресс:</strong> {stats.solved_tasks}/{stats.total_tasks} задач
              </div>
              <div>
                <strong>Темы:</strong> {stats.topics_total}
              </div>
              <div>
                <strong>Сложность:</strong> easy={stats.by_difficulty.easy ?? 0}, medium={stats.by_difficulty.medium ?? 0}, hard=
                {stats.by_difficulty.hard ?? 0}
              </div>
              <div>
                <strong>Слабые темы:</strong> {stats.weak_topics.length ? stats.weak_topics.join(", ") : "нет"}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div>Профиль не найден. Попробуйте обновить страницу или войти снова.</div>
      )}
    </main>
  );
}

