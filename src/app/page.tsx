import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

import styles from "./landing.module.css";

export default function Home() {
  return (
    <>
      <header
        className="pt-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 56,
          paddingTop: 12,
          paddingBottom: 12,
        }}
      >
        <Link href="/" className="pt-heading" style={{ fontWeight: 800, color: "var(--pt-text)" }}>
          φ яТренер
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle />
          <Link href="/auth/login" className="pt-btn pt-btn-secondary" style={{ padding: "10px 16px" }}>
            Войти
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <div className={styles.particles} aria-hidden>
          {[...Array(5)].map((_, i) => (
            <span key={i} className={styles.particle} />
          ))}
        </div>
        <div className={`pt-container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <h1>Тренируй предметы с электронным наставником</h1>
            <p>
              Математика, информатика, химия и физика: интерактивные задачи, мгновенная проверка решений и персонализированный план обучения
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/register" className="pt-btn pt-btn-primary">
                Начать бесплатно
              </Link>
              <Link href="/auth/login" className="pt-btn pt-btn-secondary">
                Демо-режим
              </Link>
            </div>
          </div>
          <div className={styles.illus} aria-hidden>
            <div className={styles.illusOrbit} />
            <div className={styles.illusFormula}>F = ma</div>
            <div className={`${styles.illusFormula} ${styles.illusFormula2}`}>E = mc²</div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="pt-container">
          <h2 className={styles.sectionTitle}>Выберите предмет</h2>
          <p className={styles.sectionSub}>Предмет влияет на темы, задачи, экзамены и рекомендации</p>
          <div className={`${styles.grid3} pt-stagger`}>
            {[
              { slug: "physics", title: "Физика", icon: "φ", desc: "Классика: механика, МКТ, электричество и т.д." },
              { slug: "math", title: "Математика", icon: "∑", desc: "Алгебра, геометрия, функции, логика." },
              { slug: "cs", title: "Информатика", icon: "⌘", desc: "Алгоритмы, структуры данных, код и логика." },
              { slug: "chemistry", title: "Химия", icon: "⚗", desc: "Реакции, расчёты, хим. связь и т.д." },
            ].map((s) => (
              <article key={s.slug} className={`pt-card pt-card-interactive ${styles.modeCard}`}>
                <div className={styles.modeIcon}>{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div style={{ marginTop: 12 }}>
                  <Link href={`/${s.slug}/dashboard`} className="pt-btn pt-btn-secondary">
                    Открыть
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className="pt-container">
          <h2 className={styles.sectionTitle}>Режимы обучения</h2>
          <p className={styles.sectionSub}>Выбери стиль, который подходит именно тебе</p>
          <div className={`${styles.grid3} pt-stagger`}>
            <article className={`pt-card pt-card-interactive ${styles.modeCard}`}>
              <div className={styles.modeIcon}>💡</div>
              <h3>Объяснение</h3>
              <p>Наставник решит задачу и расскажет по шагам</p>
            </article>
            <article className={`pt-card pt-card-interactive ${styles.modeCard}`}>
              <div className={styles.modeIcon}>🤝</div>
              <h3>Интерактивный</h3>
              <p>Подсказки и пошаговое решение вместе с наставником</p>
            </article>
            <article className={`pt-card pt-card-interactive ${styles.modeCard}`}>
              <div className={styles.modeIcon}>📸</div>
              <h3>Сам с проверкой</h3>
              <p>Фото решения и анализ от наставником</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section} style={{ background: "var(--pt-surface-2)" }}>
        <div className="pt-container">
          <h2 className={styles.sectionTitle}>Почему яТренер</h2>
          <div className={styles.sectionSub}>
            <p>
              Представьте: вы решаете задачу, но не тупите в одиночестве и не смотрите готовый ответ. Рядом есть мудрый наставник с
              искусственным интеллектом. Он не торопится решать за вас, потому что его главная цель — научить вас справляться самому.
              Нужен толчок? Получите объяснение. Застряли? Тонкая подсказка направит мысль. Уже решили? Система проверит каждую
              строчку вашего решения.
            </p>
            <p style={{ marginTop: 12 }}>
              Авторская платформа для самостоятельного погружения в физику. Мы объединили фундаментальную теорию с уникальной методикой
              практики, где главный инструмент — не готовое решение, а ваш собственный интеллект. Ваш наставник — интеллектуальная система
              с элементами ИИ, которая не делает работу за вас, а мягко ведет к пониманию: помогает через объяснения, подсказки или умную
              проверку уже написанного решения. Более 1000 задач в экосистеме сервиса — это ваш путь к уверенной сдаче экзаменов и
              истинному мастерству.
            </p>
          </div>
          <div className={styles.benefits}>
            {[
              { icon: "📚", t: "1000+ задач", d: "От базовых до олимпиадного уровня" },
              { icon: "⚡", t: "Мгновенная проверка", d: "Обратная связь без ожидания" },
              { icon: "🎯", t: "Адаптивно под твой уровень", d: "План и рекомендации на основе ошибок" },
            ].map((x) => (
              <div key={x.t} className={`pt-card ${styles.benefit}`}>
                <div className={styles.benefitIcon}>{x.icon}</div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{x.t}</h3>
                  <p className="pt-muted" style={{ fontSize: "0.95rem" }}>
                    {x.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} style={{ background: "var(--pt-surface-2)" }}>
        <div className="pt-container">
          <h2 className={styles.sectionTitle}>Стилизация задач</h2>
          <p className={styles.sectionSub}>Долой скучные задачи. Решения должны приносить радость и удовольствие. Включи режимм стилизации. В премиум режиме доступны разные стили</p>
          <div className={styles.benefits}>
            {[
              { icon: "🏎️", t: "Мультфильмы", d: "Молния Маккуин мчится на помощь в Радиатор-Спрингс. Его масса вместе с прицепом составляет 4000 кг, а скорость на прямом участке шоссе — 30 м/с. Чтобы суметь вписаться в поворот, ему нужно передать по суперкомпьютеру число — свою кинетическую энергию.\n\nКакое число отправит Маккуин? Не забудь, что энергия измеряется в джоулях!" },
              { icon: "🎬", t: "Кино", d: "Имперский разведывательный дроид модели KX-100 массой 420 кг движется над поверхностью Татуина к базе повстанцев со скоростью 200 м/с. Пилот X-wing, засекший цель, должен рассчитать кинетическую энергию дроида, чтобы определить, хватит ли мощности лазерной пушки для его уничтожения одним выстрелом, не повредив песчаные хижины. Рассчитай энергию (в джоулях). Да пребудет с тобой Сила!" },
              { icon: "📖", t: "Руская литература", d: "Зимним утром, когда мороз крепчал, а солнце робко золотило заснеженные верхушки берёз, молодой барин Алексей Петрович отправился в губернский город.\n\nДорожная кибитка, гружённая провизией и книгами, имела общую массу 20 пудов*. Ямщик, лихой малый с рыжей бородой, пустил лошадей вскачь, и кибитка помчалась по тракту со скоростью 30 вёрст в час.\n\nАлексей Петрович, человек мыслящий и чувствительный, задумался о судьбе России, а также о том, какую кинетическую энергию (в джоулях) имеет сейчас его экипаж. Помогите барину разрешить сие математическое затруднение, дабы он мог с чистой совестью предаться размышлениям о превратностях судьбы." },
            ].map((x) => (
              <div key={x.t} className={`pt-card ${styles.benefit}`}>
                <div className={styles.benefitIcon}>{x.icon}</div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{x.t}</h3>
                  <p className="pt-muted" style={{ fontSize: "0.95rem" }}>
                    {x.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.social}>
        <div className={styles.avatars} aria-hidden>
          {["А", "М", "К", "Д"].map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <p className="pt-muted">Уже 5000+ учеников готовятся с яТренер</p>
      </div>

      <footer className={`pt-container ${styles.footer}`}>
        © {new Date().getFullYear()} яТренер · Предметы с электронным-наставником
      </footer>
    </>
  );
}
