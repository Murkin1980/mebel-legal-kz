import Link from 'next/link';

const Check = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="m4 10 3.5 3.5L16 5" />
  </svg>
);

const Arrow = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="brand" href="/" aria-label="MebelDocs — главная">
          <span className="brand-mark">M</span>
          <span>MebelDocs</span>
        </Link>
        <nav aria-label="Основная навигация">
          <a href="#workflow">Как работает</a>
          <a href="#documents">Документы</a>
          <a href="#security">Контроль</a>
        </nav>
        <Link className="nav-login" href="/login">
          Войти
          <Arrow />
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />
            Документооборот для мебельных компаний Казахстана
          </div>
          <h1>
            Весь заказ —
            <br />
            <em>в одном рабочем окне.</em>
          </h1>
          <p className="hero-lead">
            Создавайте счёт и акт, контролируйте сроки, храните версии документов.
            Договор подключается только когда он действительно нужен.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/login">
              Открыть рабочее пространство
              <Arrow />
            </Link>
            <a className="button button-secondary" href="#workflow">
              Посмотреть сценарий
            </a>
          </div>
          <ul className="hero-proof" aria-label="Ключевые свойства">
            <li><Check /> KZT без ошибок округления</li>
            <li><Check /> История действий</li>
            <li><Check /> Данные разделены по компаниям</li>
          </ul>
        </div>

        <div className="product-stage" aria-label="Пример рабочего пространства заказа">
          <div className="stage-topline">
            <div className="stage-dots"><i /><i /><i /></div>
            <span>Заказ ORD-0248</span>
            <b>В работе</b>
          </div>
          <div className="stage-body">
            <aside className="stage-sidebar">
              <div className="stage-logo">M</div>
              <span className="is-active">Заказы</span>
              <span>Документы</span>
              <span>Сроки</span>
              <span>Юр. модуль</span>
            </aside>
            <div className="stage-content">
              <div className="order-heading">
                <div>
                  <small>ORD-0248 · КУХНЯ</small>
                  <strong>Кухня «Терра»</strong>
                  <span>Айгуль Сарсенова</span>
                </div>
                <div className="order-total">
                  <small>СУММА ЗАКАЗА</small>
                  <strong>2 840 000 ₸</strong>
                </div>
              </div>
              <div className="stage-grid">
                <div className="stage-panel documents-panel">
                  <div className="panel-title">
                    <strong>Документы</strong>
                    <button type="button">+ Добавить</button>
                  </div>
                  <div className="document-row">
                    <i>₸</i><span><b>Счёт № 248</b><small>Версия 1 · Черновик</small></span><em>2 840 000 ₸</em>
                  </div>
                  <div className="document-row">
                    <i>А</i><span><b>Акт № 248</b><small>Версия 1 · Черновик</small></span><em>Готов</em>
                  </div>
                  <div className="document-row optional">
                    <i>Д</i><span><b>Договор</b><small>Необязательный документ</small></span><em>Не создан</em>
                  </div>
                </div>
                <div className="stage-panel deadline-panel">
                  <div className="panel-title"><strong>Ближайший срок</strong></div>
                  <small>ОПЛАТА СЧЁТА</small>
                  <strong>29 июля</strong>
                  <span>через 3 рабочих дня</span>
                  <div className="deadline-line"><i /></div>
                  <p>Напоминания: за 3 дня, за 1 день, в день срока</p>
                </div>
              </div>
              <div className="activity-line">
                <span>Последнее действие</span>
                <b>Счёт создан менеджером · сегодня, 10:42</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="problem-strip" aria-label="Проблемы, которые решает MebelDocs">
        <p>Не папка с файлами.</p>
        <p>Не бухгалтерская программа.</p>
        <p>Не тяжёлая CRM.</p>
        <strong>Рабочий контур конкретного заказа.</strong>
      </section>

      <section className="workflow section" id="workflow">
        <div className="section-heading">
          <span className="section-number">01</span>
          <div>
            <p className="kicker">Понятный процесс</p>
            <h2>От заказа до закрывающих документов</h2>
          </div>
          <p>
            Система ведёт команду по реальному рабочему сценарию, не заставляя
            начинать каждый заказ с договора.
          </p>
        </div>
        <div className="workflow-track">
          {[
            ['01', 'Заказ', 'Клиент, изделие, сумма и даты становятся единым основанием для документов.'],
            ['02', 'Счёт', 'Создаётся из карточки заказа и хранится как отдельная версия.'],
            ['03', 'Производство', 'Сроки считаются в рабочих днях, напоминания появляются заранее.'],
            ['04', 'Акт', 'Закрывающий документ остаётся привязан к тому же заказу и сумме.'],
          ].map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="documents section" id="documents">
        <div className="documents-copy">
          <p className="kicker">Документы без хаоса</p>
          <h2>Один источник данных. Несколько нужных документов.</h2>
          <p>
            Номер заказа, клиент, сумма и сроки не копируются вручную между
            таблицами. Документы получают снимок данных заказа и собственную версию.
          </p>
          <ul>
            <li><Check /><span><b>Счёт на оплату</b> — сумма и клиент из заказа</span></li>
            <li><Check /><span><b>Акт выполненных работ</b> — закрытие того же заказа</span></li>
            <li><Check /><span><b>Договор</b> — подключается по необходимости</span></li>
            <li><Check /><span><b>Версии и аудит</b> — кто и когда создал документ</span></li>
          </ul>
        </div>
        <div className="paper-stack" aria-label="Примеры документов">
          <article className="paper paper-back">
            <small>АКТ ВЫПОЛНЕННЫХ РАБОТ</small>
            <strong>№ ACT-0248</strong>
            <i />
          </article>
          <article className="paper paper-front">
            <div className="paper-brand"><b>M</b><span>MebelDocs<small>ДОКУМЕНТ ЗАКАЗА</small></span></div>
            <div className="paper-title"><span>СЧЁТ НА ОПЛАТУ</span><strong>№ INV-0248</strong></div>
            <dl>
              <dt>Покупатель</dt><dd>Айгуль Сарсенова</dd>
              <dt>Основание</dt><dd>Заказ ORD-0248</dd>
              <dt>Наименование</dt><dd>Изготовление кухни «Терра»</dd>
            </dl>
            <div className="paper-total"><span>ИТОГО К ОПЛАТЕ</span><strong>2 840 000 ₸</strong></div>
            <small className="paper-note">Версия 1 · сформировано 26.07.2026</small>
          </article>
        </div>
      </section>

      <section className="control section" id="security">
        <div className="section-heading">
          <span className="section-number">02</span>
          <div>
            <p className="kicker">Контроль без бюрократии</p>
            <h2>Видно, что происходит с каждым заказом</h2>
          </div>
        </div>
        <div className="control-grid">
          <article>
            <span>01</span>
            <h3>Сроки в рабочих днях</h3>
            <p>Выходные пропускаются, напоминания рассчитываются заранее.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Разделение компаний</h3>
            <p>Сотрудник видит только данные своей организации и своей роли.</p>
          </article>
          <article>
            <span>03</span>
            <h3>История действий</h3>
            <p>Создание заказа и запись в аудит выполняются одной операцией.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Юридический модуль внутри</h3>
            <p>Сложные договоры и согласования доступны, но не мешают обычному заказу.</p>
          </article>
        </div>
      </section>

      <section className="closing">
        <div>
          <p className="kicker">Рабочий прототип</p>
          <h2>Начните с одного заказа.</h2>
          <p>Создайте счёт, поставьте срок и подготовьте акт — в одном контуре.</p>
        </div>
        <Link className="button button-light" href="/login">
          Перейти в MebelDocs
          <Arrow />
        </Link>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">M</span><span>MebelDocs</span></div>
        <p>Документооборот мебельной компании · Казахстан</p>
        <div><a href="#workflow">Продукт</a><Link href="/login">Вход</Link></div>
      </footer>
    </main>
  );
}
