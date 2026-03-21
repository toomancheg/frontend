import type { CSSProperties } from "react";

export const uiStyles = {
  page: { padding: 24, maxWidth: 980 } as CSSProperties,
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    background: "#fff",
  } as CSSProperties,
  mutedCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    background: "#f9fafb",
  } as CSSProperties,
  buttonRow: { display: "flex", gap: 10, marginBottom: 14 } as CSSProperties,
  select: { padding: 8, minWidth: 420 } as CSSProperties,
  output: {
    whiteSpace: "pre-wrap",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 140,
    margin: 0,
  } as CSSProperties,
};

export function buttonStyle(options?: { active?: boolean; disabled?: boolean }): CSSProperties {
  const active = options?.active ?? false;
  const disabled = options?.disabled ?? false;

  return {
    textAlign: "left",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    background: active ? "#f3f4f6" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}
