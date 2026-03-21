"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api";
import { setTokens, Tokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiFetch<{
        access_token: string;
        refresh_token: string;
      }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      const tokens: Tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };
      setTokens(tokens);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ marginBottom: 8 }}>Вход</h1>
      <p style={{ marginBottom: 18 }}>Введите email и пароль.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Пароль
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        {error ? (
          <div style={{ color: "crimson" }}>Ошибка: {error}</div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          {isLoading ? "Подождите..." : "Войти"}
        </button>
      </form>

      <button
        onClick={() => router.push("/auth/register")}
        style={{
          marginTop: 14,
          background: "transparent",
          border: "none",
          color: "#2563eb",
          cursor: "pointer",
          padding: 0,
        }}
        type="button"
      >
        Нет аккаунта? Регистрация
      </button>
    </main>
  );
}

