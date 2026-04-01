"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { apiFetch, apiFetchForm, resolveMediaUrl } from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import { setDisplayName } from "@/lib/displayName";
import { useRequireAuth } from "@/lib/useRequireAuth";

import styles from "./settings.module.css";

const FONT_SIZE_KEY = "phystr-font-size";
const FONT_SIZES = ["0.9rem", "1rem", "1.1rem"] as const;

function uiLog(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  // Включение: localStorage.setItem("phystr:ui:log", "1") или добавьте к URL `?ptlog=1`
  const enabled =
    window.location.search.includes("ptlog=1") || localStorage.getItem("phystr:ui:log") === "1";
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.info(`[ui][settings] ${event}`, data ?? {});
}

const PROGRAMS = [
  { value: "basic", label: "Базовая" },
  { value: "profile", label: "Профильная" },
  { value: "olympiad", label: "Олимпиадная" },
] as const;

const GRADES = [
  { value: 7, label: "7 класс" },
  { value: 8, label: "8 класс" },
  { value: 9, label: "9 класс" },
  { value: 10, label: "10 класс" },
  { value: 11, label: "11 класс" },
  { value: 12, label: "Студент (12 класс)" },
] as const;

type NotificationPrefs = {
  training_reminders: boolean;
  new_tasks: boolean;
  exam_results: boolean;
};

type MeUser = {
  id: string;
  email: string;
  role: "student" | "admin";
  grade: number;
  program: string;
  display_name: string | null;
  avatar_url: string | null;
  notification_prefs: NotificationPrefs;
};

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: "training_reminders", label: "Напоминания о тренировках" },
  { key: "new_tasks", label: "Новые задачи" },
  { key: "exam_results", label: "Результаты экзаменов" },
];

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accessToken = useRequireAuth();
  const didLogBlocksRef = useRef(false);

  const [user, setUser] = useState<MeUser | null>(null);
  const [displayName, setDisplayNameState] = useState("");
  const [grade, setGrade] = useState(9);
  const [program, setProgram] = useState("basic");
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    training_reminders: true,
    new_tasks: true,
    exam_results: true,
  });
  const [fontSize, setFontSize] = useState<(typeof FONT_SIZES)[number]>("1rem");
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "appearance" | "privacy">(
    "profile"
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);

  useEffect(() => {
    uiLog("page.mount");
    return () => uiLog("page.unmount");
  }, []);

  useEffect(() => {
    uiLog("auth.token.state", { hasToken: Boolean(accessToken) });
  }, [accessToken]);

  useEffect(() => {
    const raw = localStorage.getItem(FONT_SIZE_KEY);
    if (raw && (FONT_SIZES as readonly string[]).includes(raw)) {
      const s = raw as (typeof FONT_SIZES)[number];
      setFontSize(s);
      document.documentElement.style.setProperty("--pt-font-size", s);
    }
  }, [accessToken]);

  const scrollTo = useCallback((id: string, tab: typeof activeTab) => {
    setActiveTab(tab);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!accessToken) {
      uiLog("me.skip.no_token");
      return;
    }
    (async () => {
      try {
        uiLog("me.fetch.start", { path: "/api/auth/me" });
        const me = await apiFetch<MeUser>("/api/auth/me", { token: accessToken });
        uiLog("me.fetch.success", {
          id: me.id,
          email: me.email,
          role: me.role,
          grade: me.grade,
          program: me.program,
          hasAvatar: Boolean(me.avatar_url),
          hasDisplayName: Boolean(me.display_name && me.display_name.trim()),
          notificationKeys: Object.keys(me.notification_prefs ?? {}),
        });
        setUser(me);
        setDisplayNameState(me.display_name ?? "");
        setGrade(me.grade);
        setProgram(me.program);
        setPrefs(me.notification_prefs);
        const dn = me.display_name?.trim();
        if (dn) setDisplayName(dn);
      } catch (err) {
        uiLog("me.fetch.error", { message: err instanceof Error ? err.message : String(err) });
        setError(err instanceof Error ? err.message : "Не удалось загрузить настройки");
      } finally {
        uiLog("me.fetch.finally", { isLoadingBefore: isLoading });
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      uiLog("render.done.no_user", { error: error ?? null });
      return;
    }
    if (didLogBlocksRef.current) return;
    didLogBlocksRef.current = true;

    uiLog("render.block.success", { block: "profile" });
    uiLog("render.block.success", { block: "notifications" });
    uiLog("render.block.success", { block: "appearance" });
    uiLog("render.block.success", { block: "privacy" });
  }, [isLoading, user, error]);

  async function onLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: {} });
    } catch {
      // идемпотентно
    } finally {
      clearTokens();
      router.push("/auth/login");
    }
  }

  async function saveProfile() {
    if (!accessToken) return;
    setProfileMessage(null);
    setError(null);
    setIsSavingProfile(true);
    try {
      const updated = await apiFetch<MeUser>("/api/users/me", {
        method: "PATCH",
        token: accessToken,
        body: {
          display_name: displayName.trim(),
          grade,
          program,
        },
      });
      setUser(updated);
      const dn = updated.display_name?.trim();
      if (dn) setDisplayName(dn);
      setProfileMessage("Профиль сохранён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function saveNotificationPrefs() {
    if (!accessToken) return;
    setPrefsMessage(null);
    setError(null);
    setIsSavingPrefs(true);
    try {
      const updated = await apiFetch<MeUser>("/api/users/me", {
        method: "PATCH",
        token: accessToken,
        body: { notification_prefs: prefs },
      });
      setUser(updated);
      setPrefs(updated.notification_prefs);
      setPrefsMessage("Настройки уведомлений сохранены");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setIsSavingPrefs(false);
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !accessToken) return;
    setError(null);
    setIsUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const updated = await apiFetchForm<MeUser>("/api/users/me/avatar", {
        token: accessToken,
        body: fd,
      });
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить фото");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    if (!accessToken) return;
    setError(null);
    setIsUploadingAvatar(true);
    try {
      const updated = await apiFetch<MeUser>("/api/users/me/avatar", {
        method: "DELETE",
        token: accessToken,
      });
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить фото");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function deleteAccount() {
    if (!accessToken) return;
    const ok = window.confirm(
      "Удалить аккаунт безвозвратно? Все данные прогресса будут удалены."
    );
    if (!ok) return;
    setError(null);
    setIsDeleting(true);
    try {
      await apiFetch("/api/users/me", { method: "DELETE", token: accessToken });
      try {
        await apiFetch("/api/auth/logout", { method: "POST", body: {} });
      } catch {
        // ignore
      }
      clearTokens();
      router.push("/auth/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить аккаунт");
    } finally {
      setIsDeleting(false);
    }
  }

  function setFont(size: (typeof FONT_SIZES)[number]) {
    setFontSize(size);
    document.documentElement.style.setProperty("--pt-font-size", size);
    localStorage.setItem(FONT_SIZE_KEY, size);
  }

  const avatarSrc = resolveMediaUrl(user?.avatar_url ?? null);

  return (
    <AppShell
      title="Настройки"
      userEmail={user?.email ?? null}
      userRole={user?.role ?? null}
      userAvatarUrl={avatarSrc}
      onLogout={onLogout}
    >
      {error ? (
        <div className="pt-card" style={{ padding: 14, marginBottom: 16, borderColor: "var(--pt-danger)" }}>
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="pt-card" style={{ padding: 24 }}>
          <div className="pt-skeleton" style={{ height: 24, width: "40%", marginBottom: 12 }} />
          <div className="pt-skeleton" style={{ height: 120, width: "100%" }} />
        </div>
      ) : (
        <>
          <div className={styles.tabs} role="tablist" aria-label="Разделы настроек">
            <button
              type="button"
              className="pt-chip"
              data-active={activeTab === "profile" || undefined}
              onClick={() => scrollTo("settings-profile", "profile")}
            >
              Профиль
            </button>
            <button
              type="button"
              className="pt-chip"
              data-active={activeTab === "notifications" || undefined}
              onClick={() => scrollTo("settings-notifications", "notifications")}
            >
              Уведомления
            </button>
            <button
              type="button"
              className="pt-chip"
              data-active={activeTab === "appearance" || undefined}
              onClick={() => scrollTo("settings-appearance", "appearance")}
            >
              Внешний вид
            </button>
            <button
              type="button"
              className="pt-chip"
              data-active={activeTab === "privacy" || undefined}
              onClick={() => scrollTo("settings-privacy", "privacy")}
            >
              Конфиденциальность
            </button>
          </div>

          <section id="settings-profile" className={`pt-card ${styles.section}`}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 16 }}>
              Профиль
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.hiddenFile}
              onChange={onPickAvatar}
            />
            <div className={styles.avatarRow}>
              <div className={styles.avatar}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarPlaceholder}>+</span>
                )}
              </div>
              <div className={styles.avatarActions}>
                <button
                  type="button"
                  className="pt-btn pt-btn-secondary"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingAvatar ? "Загрузка…" : "Загрузить фото"}
                </button>
                {user?.avatar_url ? (
                  <button
                    type="button"
                    className="pt-btn pt-btn-secondary"
                    disabled={isUploadingAvatar}
                    onClick={removeAvatar}
                  >
                    Удалить фото
                  </button>
                ) : null}
              </div>
            </div>
            <label className={styles.field}>
              Имя
              <input
                className="pt-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayNameState(e.target.value)}
                maxLength={255}
                autoComplete="name"
                placeholder="Как к вам обращаться"
              />
            </label>
            <label className={styles.field}>
              Email
              <input className="pt-input" type="email" value={user?.email ?? ""} readOnly />
            </label>
            <label className={styles.field}>
              Класс
              <select
                className="pt-input"
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
              >
                {GRADES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Программа
              <select
                className="pt-input"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                {PROGRAMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {profileMessage ? <p className={styles.okMsg}>{profileMessage}</p> : null}
            <button
              type="button"
              className="pt-btn pt-btn-primary"
              disabled={isSavingProfile}
              onClick={saveProfile}
            >
              {isSavingProfile ? "Сохранение…" : "Сохранить"}
            </button>
          </section>

          <section id="settings-notifications" className={`pt-card ${styles.section}`}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 16 }}>
              Уведомления
            </h2>
            <p className="pt-muted" style={{ marginBottom: 12, fontSize: "0.9rem" }}>
              Предпочтения хранятся в вашем аккаунте (рассылки в MVP могут быть не подключены).
            </p>
            {NOTIFICATION_ROWS.map((row) => (
              <label key={row.key} className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={prefs[row.key]}
                  onChange={(e) => setPrefs((p) => ({ ...p, [row.key]: e.target.checked }))}
                />
                {row.label}
              </label>
            ))}
            {prefsMessage ? <p className={styles.okMsg}>{prefsMessage}</p> : null}
            <button
              type="button"
              className="pt-btn pt-btn-primary"
              style={{ marginTop: 8 }}
              disabled={isSavingPrefs}
              onClick={saveNotificationPrefs}
            >
              {isSavingPrefs ? "Сохранение…" : "Сохранить уведомления"}
            </button>
          </section>

          <section id="settings-appearance" className={`pt-card ${styles.section}`}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 16 }}>
              Внешний вид
            </h2>
            <p className="pt-muted" style={{ marginBottom: 8 }}>
              Тема
            </p>
            <ThemeToggle />
            <p className="pt-muted" style={{ margin: "20px 0 8px" }}>
              Размер шрифта
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FONT_SIZES.map((size, i) => (
                <button
                  key={size}
                  type="button"
                  className="pt-chip"
                  data-active={fontSize === size || undefined}
                  onClick={() => setFont(size)}
                >
                  {["Мелкий", "Средний", "Крупный"][i]}
                </button>
              ))}
            </div>
          </section>

          <section id="settings-privacy" className={`pt-card ${styles.section}`}>
            <h2 className="pt-heading" style={{ fontSize: "1.1rem", marginBottom: 16 }}>
              Конфиденциальность
            </h2>
            <ul className={styles.list}>
              <li>
                <button
                  type="button"
                  className="pt-btn pt-btn-danger"
                  disabled={isDeleting}
                  onClick={deleteAccount}
                >
                  {isDeleting ? "Удаление…" : "Удалить аккаунт"}
                </button>
              </li>
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
