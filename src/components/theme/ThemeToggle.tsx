"use client";

import { useTheme, type ThemeMode } from "./ThemeProvider";

import styles from "./ThemeToggle.module.css";

const MODES: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Системная" },
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { mode, setMode, resolved } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        className={styles.compact}
        onClick={() => {
          const order: ThemeMode[] = ["system", "light", "dark"];
          const i = order.indexOf(mode);
          setMode(order[(i + 1) % order.length]);
        }}
        title={`Тема: ${resolved === "dark" ? "тёмная" : "светлая"}`}
        aria-label="Переключить тему"
      >
        {resolved === "dark" ? "🌙" : "☀️"}
      </button>
    );
  }

  return (
    <div className={styles.group} role="group" aria-label="Тема оформления">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={mode === value ? styles.active : undefined}
          onClick={() => setMode(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
