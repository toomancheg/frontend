"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api";
import { setTokens, Tokens } from "@/lib/auth";

import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loginWithVk() {
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth/vk/start", { method: "GET", credentials: "include" });
      if (!res.ok) {
        throw new Error("Не удалось начать вход через VK");
      }
      const data = (await res.json()) as { auth_url?: string };
      if (!data.auth_url) {
        throw new Error("OAuth URL не получен");
      }
      window.location.assign(data.auth_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка OAuth");
    }
  }

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
    <main className={styles.wrap}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.bgParticles} aria-hidden />
      <div className={`pt-glass ${styles.card}`}>
        <h1>Вход</h1>
        <p className="pt-muted">Введите email и пароль.</p>

        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="pt-input"
              autoComplete="email"
            />
          </label>

          <label className={styles.label}>
            Пароль
            <div className={styles.row}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPw ? "text" : "password"}
                required
                className="pt-input"
                style={{ flex: 1 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pt-btn pt-btn-secondary"
                style={{ flexShrink: 0 }}
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? "Скрыть" : "Показать"}
              </button>
            </div>
          </label>

          {error ? <div className={styles.error}>Ошибка: {error}</div> : null}

          <div className={styles.submitWrap}>
            <button type="submit" disabled={isLoading} className="pt-btn pt-btn-primary" style={{ width: "100%" }}>
              {isLoading ? (
                <>
                  <span className={styles.spinner} aria-hidden />
                  Входим…
                </>
              ) : (
                "Войти"
              )}
            </button>
          </div>
        </form>

        <div className={styles.oauth}>
          <button type="button" className={styles.oauthBtn} onClick={loginWithVk}>
            VK
          </button>
        </div>

        <div className={styles.links}>
          <Link href="#">Забыли пароль?</Link>
          <Link href="/auth/register">Нет аккаунта? Зарегистрироваться</Link>
        </div>
      </div>
    </main>
  );
}
