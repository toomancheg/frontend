"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

import { getSubjectPrefixFromPathname } from "@/lib/subject";

import styles from "./AdminShell.module.css";

const NAV = [
  { href: "/admin", label: "Дашборд", short: "Дашборд" },
  { href: "/admin/users", label: "Пользователи", short: "Юзеры" },
  { href: "/admin/payments", label: "Платежи", short: "Оплаты" },
  { href: "/admin/content", label: "Контент", short: "Контент" },
  { href: "/admin/stats", label: "Статистика", short: "Стат." },
  { href: "/admin/settings", label: "Настройки", short: "Настр." },
  { href: "/admin/logs", label: "Логи аудита", short: "Логи" },
] as const;

const SUBJECT_META: Record<string, { mark: string; name: string }> = {
  physics: { mark: "φ", name: "Физика" },
  math: { mark: "∑", name: "Математика" },
  cs: { mark: "⌘", name: "Информатика" },
  chemistry: { mark: "⚗", name: "Химия" },
};

type Props = {
  children: ReactNode;
  userEmail?: string | null;
};

export function AdminShell({ children, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const subjectPrefix = getSubjectPrefixFromPathname(pathname);
  const currentSubject = subjectPrefix ? subjectPrefix.slice(1) : "physics";
  const canonicalPrefix = `/${currentSubject}`;
  const subjectMeta = SUBJECT_META[currentSubject] ?? SUBJECT_META.physics;

  const hrefInSubject = (href: string) => `${canonicalPrefix}${href}`;

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>{subjectMeta.mark}</span>
          <span>{subjectMeta.name} · Админ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select
            className={styles.subjectSelect}
            value={currentSubject}
            onChange={(e) => {
              const next = e.target.value;
              const p = pathname || "/admin";
              const normalized = p.startsWith("/") ? p : `/${p}`;
              const replaced = normalized.replace(
                /^\/([a-z][a-z0-9_-]*)\/(admin)(\/|$)/i,
                `/${next}/$2$3`
              );
              router.push(replaced === normalized ? `/${next}/admin` : replaced);
            }}
            aria-label="Предмет"
          >
            <option value="physics">Физика</option>
            <option value="math">Математика</option>
            <option value="cs">Информатика</option>
            <option value="chemistry">Химия</option>
          </select>
          {userEmail ? (
            <span style={{ color: "var(--adm-muted)", fontSize: "0.85rem" }}>{userEmail}</span>
          ) : null}
          <Link href={hrefInSubject("/dashboard")} className={styles.backLink}>
            ← В приложение
          </Link>
        </div>
      </header>
      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Админ-разделы">
          {NAV.map((item) => {
            const fullHref = hrefInSubject(item.href);
            const active = item.href === "/admin" ? pathname === fullHref : pathname === fullHref || pathname.startsWith(`${fullHref}/`);
            return (
              <Link
                key={item.href}
                href={fullHref}
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
