"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api";
import { setTokens, Tokens } from "@/lib/auth";
import { setDisplayName } from "@/lib/displayName";

import styles from "../auth.module.css";

const PROGRAMS = [
  { value: "basic", label: "Базовая" },
  { value: "profile", label: "Профильная" },
  { value: "olympiad", label: "Олимпиадная" },
];

const GRADES = [
  { value: "7", label: "7 класс" },
  { value: "8", label: "8 класс" },
  { value: "9", label: "9 класс" },
  { value: "10", label: "10 класс" },
  { value: "11", label: "11 класс" },
  { value: "student", label: "Студент" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [grade, setGrade] = useState("9");
  const [program, setProgram] = useState("basic");
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
      const gradeNum = grade === "student" ? 12 : Number(grade);
      const data = await apiFetch<{
        access_token: string;
        refresh_token: string;
      }>("/api/auth/register", {
        method: "POST",
        body: {
          email,
          password,
          grade: gradeNum,
          program,
          display_name: name.trim() || undefined,
        },
      });

      const tokens: Tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };
      setTokens(tokens);
      setDisplayName(name.trim() || email.split("@")[0] || "Ученик");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка регистрации");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.bgParticles} aria-hidden />
      <div className={`pt-glass ${styles.card}`}>
        <h1>Регистрация</h1>
        <p className="pt-muted">Создай аккаунт и начни тренироваться.</p>

        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label}>
            Имя
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
              minLength={2}
              className="pt-input"
              autoComplete="name"
            />
          </label>

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
                minLength={8}
                className="pt-input"
                style={{ flex: 1 }}
                autoComplete="new-password"
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

          <label className={styles.label}>
            Класс
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="pt-input">
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Программа
            <select value={program} onChange={(e) => setProgram(e.target.value)} className="pt-input">
              {PROGRAMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <div className={styles.error}>Ошибка: {error}</div> : null}

          <button type="submit" disabled={isLoading} className="pt-btn pt-btn-primary" style={{ width: "100%" }}>
            {isLoading ? (
              <>
                <span className={styles.spinner} aria-hidden />
                Создаём аккаунт…
              </>
            ) : (
              "Создать аккаунт"
            )}
          </button>
        </form>

        <div className={styles.oauth}>
          <button type="button" className={styles.oauthBtn} onClick={loginWithVk}>
            VK
          </button>
        </div>

        <div className={styles.links}>
          <span />
          <Link href="/auth/login">Уже есть аккаунт? Вход</Link>
        </div>
      </div>
    </main>
  );
}
