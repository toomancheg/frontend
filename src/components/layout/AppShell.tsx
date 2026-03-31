"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

import styles from "./AppShell.module.css";

const NAV = [
  { href: "/dashboard", label: "Главная", short: "Главная", icon: "⌂" },
  { href: "/theory", label: "Теория", short: "Теория", icon: "📖" },
  { href: "/practice", label: "Задачи", short: "Задачи", icon: "🧪" },
  { href: "/exam", label: "Экзамены", short: "Экзамен", icon: "⏱" },
  { href: "/progress", label: "Прогресс", short: "Прогресс", icon: "📈" },
  { href: "/subscription", label: "Подписка", short: "Про", icon: "💳" },
  { href: "/settings", label: "Настройки", short: "Ещё", icon: "⚙" },
] as const;

type Props = {
  children: ReactNode;
  title?: string;
  userEmail?: string | null;
  userRole?: string | null;
  userAvatarUrl?: string | null;
  onLogout?: () => void;
};

export function AppShell({ children, title, userEmail, userRole, userAvatarUrl, onLogout }: Props) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={`pt-container ${styles.topInner}`}>
          <Link href="/dashboard" className={styles.logo}>
            <span className={styles.logoMark}>φ</span>
            <span>Phystrainer</span>
          </Link>

          <div className={`${styles.searchWrap} pt-hide-mobile`}>
            <span className={styles.searchIcon} aria-hidden>
              🔍
            </span>
            <input
              type="search"
              placeholder="Поиск задач и тем…"
              className={styles.search}
              aria-label="Поиск задач и тем"
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.iconBtn} pt-hide-desktop`}
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Поиск"
            >
              🔍
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Уведомления">
              🔔
            </button>
            <ThemeToggle compact />
            <div className={styles.userMenu}>
              <button
                type="button"
                className={styles.avatar}
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="" className={styles.avatarImg} />
                ) : (
                  (userEmail?.[0] ?? "?").toUpperCase()
                )}
              </button>
              {menuOpen ? (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownEmail}>{userEmail ?? "Гость"}</div>
                  <Link href="/settings" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Профиль и настройки
                  </Link>
                  {userRole === "admin" ? (
                    <Link href="/admin" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Админ-панель
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    Выйти
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {searchOpen ? (
          <div className={`${styles.searchMobile} pt-hide-desktop`}>
            <input
              type="search"
              placeholder="Поиск…"
              className={styles.search}
              aria-label="Поиск"
            />
          </div>
        ) : null}
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <nav className={styles.sideNav} aria-label="Основная навигация">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? styles.navActive : undefined}
                >
                  <span className={styles.navIcon} aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className={styles.main}>
          {title ? (
            <h1 className={styles.pageTitle}>
              {title}
            </h1>
          ) : null}
          <div className="pt-page-enter">{children}</div>
        </main>
      </div>

      <nav className={styles.bottomNav} aria-label="Мобильная навигация">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.bottomActive : undefined}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
