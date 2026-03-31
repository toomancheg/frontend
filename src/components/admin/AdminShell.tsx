"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import styles from "./AdminShell.module.css";

const NAV = [
  { href: "/admin", label: "Дашборд", short: "Дашборд" },
  { href: "/admin/users", label: "Пользователи", short: "Юзеры" },
  { href: "/admin/payments", label: "Платежи", short: "Оплаты" },
  { href: "/admin/content", label: "Контент", short: "Теория" },
  { href: "/admin/stats", label: "Статистика", short: "Стат." },
  { href: "/admin/settings", label: "Настройки", short: "Настр." },
  { href: "/admin/logs", label: "Логи аудита", short: "Логи" },
] as const;

type Props = {
  children: ReactNode;
  userEmail?: string | null;
};

export function AdminShell({ children, userEmail }: Props) {
  const pathname = usePathname();

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>φ</span>
          <span>Phystrainer · Админ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {userEmail ? (
            <span style={{ color: "var(--adm-muted)", fontSize: "0.85rem" }}>{userEmail}</span>
          ) : null}
          <Link href="/dashboard" className={styles.backLink}>
            ← В приложение
          </Link>
        </div>
      </header>
      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Админ-разделы">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                <span className="pt-hide-mobile">{item.label}</span>
                <span className="pt-hide-desktop">{item.short}</span>
              </Link>
            );
          })}
        </nav>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
