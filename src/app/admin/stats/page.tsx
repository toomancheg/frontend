import uiStyles from "../users/users.module.css";

export default function AdminStatsPlaceholder() {
  return (
    <section style={{ maxWidth: 640 }}>
      <h1 className={uiStyles.title}>Статистика и аналитика</h1>
      <p style={{ color: "var(--adm-muted)", lineHeight: 1.6 }}>
        DAU/WAU, когорты, MRR и отчёты в PDF/Excel — в очереди на реализацию после накопления событий
        активности и платёжных данных.
      </p>
    </section>
  );
}
