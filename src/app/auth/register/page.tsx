"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api";
import { setTokens, Tokens } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState<number>(7);
  const [program, setProgram] = useState("basic");
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
      }>("/api/auth/register", {
        method: "POST",
        body: { email, password, grade, program },
      });

      const tokens: Tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };
      setTokens(tokens);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ marginBottom: 8 }}>Регистрация</h1>
      <p style={{ marginBottom: 18 }}>Укажите класс и программу обучения.</p>

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

        <label style={{ display: "grid", gap: 6 }}>
          Класс
          <input
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            type="number"
            required
            min={1}
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Программа
          <input
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            type="text"
            required
            style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        {error ? <div style={{ color: "crimson" }}>Ошибка: {error}</div> : null}

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
          {isLoading ? "Подождите..." : "Создать аккаунт"}
        </button>
      </form>

      <button
        onClick={() => router.push("/auth/login")}
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
        Уже есть аккаунт? Вход
      </button>
    </main>
  );
}

