import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system" }}>
      <h1 style={{ marginBottom: 12 }}>Phystrainer</h1>
      <p style={{ marginBottom: 18 }}>Тренировки физики с личным кабинетом.</p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/auth/login"
          style={{
            padding: "10px 14px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Войти
        </Link>
        <Link
          href="/auth/register"
          style={{
            padding: "10px 14px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Регистрация
        </Link>
        <Link
          href="/theory"
          style={{
            padding: "10px 14px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Теория
        </Link>
        <Link
          href="/practice"
          style={{
            padding: "10px 14px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Практика
        </Link>
        <Link
          href="/exam"
          style={{
            padding: "10px 14px",
            border: "1px solid #ddd",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Экзамен
        </Link>
      </div>
    </main>
  );
}
