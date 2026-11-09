import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown,
  Clock3, ListFilter, Map as MapIcon, MapPin, Menu, Search, Send, SlidersHorizontal,
  Sparkles, UsersRound, X,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import HobbyMap from './components/HobbyMap';
import VenueDrawer from './components/VenueDrawer';
import HobbyQuiz from './components/HobbyQuiz';
import { categories, categoryById, formatPrice, venues, type CategoryId, type Venue } from './data/places';

const TELEGRAM_URL = 'https://t.me/hobbyskrolling';

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 70, clipPath: 'inset(0 0 28% 0)' }}
      whileInView={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <a className="logo" href="#top" onClick={onClick} aria-label="Хоббиты — на главную">
      Хоббиты
      <span className="logo-star" aria-hidden="true">
        <svg viewBox="0 0 12 12" fill="none"><path d="M6 0v12M0 6h12M1.8 1.8l8.4 8.4M10.2 1.8l-8.4 8.4" stroke="currentColor" strokeWidth="1.4" /></svg>
      </span>
    </a>
  );
}

const heroCards = [
  { category: categories[0], className: 'hero-card-yarn', label: 'Тафтинг' },
  { category: categories[1], className: 'hero-card-paint', label: 'Рисование' },
  { category: categories[2], className: 'hero-card-clay', label: 'Гончарка' },
];

const faqItems = [
  {
    question: 'Нужно ли что-то уметь заранее?',
    answer: 'В подборке есть занятия специально для новичков: мастер показывает процесс и помогает на каждом этапе. Если хотите продолжить, ищите в карточках формат «Курсы» — там есть и профессиональное обучение.',
  },
  {
    question: 'Что уточнить перед записью?',
    answer: 'Проверьте актуальное расписание, итоговую стоимость и предоплату. Отдельно спросите, входят ли материалы, обжиг или финальная обработка: условия различаются даже между программами одной мастерской.',
  },
  {
    question: 'Когда можно забрать готовую работу?',
    answer: 'Ковру в тафтинге часто нужна сушка и обработка — обычно 10–14 дней. Керамика проходит сушку, обжиг и глазурование, поэтому в карточках указан срок от 3 до 6 недель. Точную дату подтвердит студия.',
  },
  {
    question: 'Как выбрать занятие с ребёнком?',
    answer: 'Включите фильтр «С детьми» и посмотрите возраст в карточке. У некоторых студий дети занимаются отдельно, в других нужен сопровождающий взрослый или общий гончарный круг. Лучше подтвердить формат при записи.',
  },
];

export default function App() {
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroClip = useTransform(scrollYProgress, [0, 0.92], ['inset(0% 0% 0% 0% round 0px)', 'inset(5% 3% 5% 3% round 48px)']);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const titleScale = useTransform(scrollYProgress, [0, 1], [1, 0.78]);
  const yarnY = useTransform(scrollYProgress, [0, 1], [0, -210]);
  const yarnRotate = useTransform(scrollYProgress, [0, 1], [-8, -22]);
  const paintY = useTransform(scrollYProgress, [0, 1], [0, -270]);
  const paintRotate = useTransform(scrollYProgress, [0, 1], [9, 24]);
  const clayY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const clayScale = useTransform(scrollYProgress, [0, 1], [1, 1.22]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('tufting');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [search, setSearch] = useState('');
  const [priceCap, setPriceCap] = useState('all');
  const [audience, setAudience] = useState('all');
  const [district, setDistrict] = useState('all');
  const [sort, setSort] = useState('recommended');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [openFaq, setOpenFaq] = useState(0);
  const [saveNotice, setSaveNotice] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('hobbity-favorites') || '[]');
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && venues.some((venue) => venue.id === id)) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('hobbity-favorites', JSON.stringify(favorites)); }
    catch { /* The guide remains usable when storage is unavailable. */ }
  }, [favorites]);

  useEffect(() => {
    const openFromHash = () => {
      if (!window.location.hash.startsWith('#place=')) return;
      const id = decodeURIComponent(window.location.hash.replace('#place=', ''));
      const venue = venues.find((item) => item.id === id);
      if (venue) {
        setActiveCategory(venue.category);
        setSelectedVenue(venue);
        setSelectedId(venue.id);
      }
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(''), 2300);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  const toggleFavorite = (id: string) => {
    setFavorites((previous) => {
      const removing = previous.includes(id);
      setSaveNotice(removing ? 'Место удалено из сохранённых' : 'Место сохранено на этом устройстве');
      return removing ? previous.filter((item) => item !== id) : [...previous, id];
    });
  };

  const openVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setSelectedId(venue.id);
    const url = new URL(window.location.href);
    url.hash = `place=${venue.id}`;
    window.history.replaceState({}, '', url);
  };

  const closeVenue = () => {
    setSelectedVenue(null);
    if (window.location.hash.startsWith('#place=')) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const explore = (category: CategoryId) => {
    setActiveCategory(category);
    setDistrict('all');
    setSelectedId(null);
    setFavoritesOnly(false);
    setMobileView('list');
    window.setTimeout(() => scrollTo('explorer'), 30);
  };

  const showFavorites = () => {
    const firstSaved = venues.find((venue) => favorites.includes(venue.id));
    if (firstSaved) setActiveCategory(firstSaved.category);
    setFavoritesOnly(true);
    setDistrict('all');
    setSearch('');
    setPriceCap('all');
    setAudience('all');
    window.setTimeout(() => scrollTo('explorer'), 30);
  };

  const categoryVenues = useMemo(() => venues.filter((venue) => venue.category === activeCategory), [activeCategory]);
  const districts = useMemo(() => Array.from(new Set(categoryVenues.map((venue) => venue.district))).sort(), [categoryVenues]);

  const filteredVenues = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru');
    const result = categoryVenues.filter((venue) => {
      if (favoritesOnly && !favorites.includes(venue.id)) return false;
      if (priceCap !== 'all' && venue.priceFrom > Number(priceCap)) return false;
      if (audience === 'kids' && ((venue.ageMin !== null && venue.ageMin > 14) || !venue.formats.includes('С детьми'))) return false;
      if (district !== 'all' && venue.district !== district) return false;
      if (query) {
        const haystack = [venue.name, venue.short, venue.description, venue.address, venue.district, venue.metro, ...venue.formats].join(' ').toLocaleLowerCase('ru');
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    if (sort === 'price') result.sort((a, b) => a.priceFrom - b.priceFrom);
    if (sort === 'duration') result.sort((a, b) => a.durationMinutes - b.durationMinutes);
    return result;
  }, [categoryVenues, search, priceCap, audience, district, sort, favoritesOnly, favorites]);

  const resetFilters = () => {
    setSearch(''); setPriceCap('all'); setAudience('all'); setDistrict('all'); setSort('recommended'); setFavoritesOnly(false); setSelectedId(null);
  };

  const active = categoryById(activeCategory);
  const minPrice = (category: CategoryId) => Math.min(...venues.filter((venue) => venue.category === category).map((venue) => venue.priceFrom));
  const ideaWords = 'Не нужно уметь. Нужно захотеть попробовать.'.split(' ');

  return (
    <div className="site-shell">
      <header className="site-header">
        <Logo onClick={() => setMenuOpen(false)} />
        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href="#idea">Идея</a>
          <a href="#maps">Карты</a>
          <a href="#first-visit">Перед занятием</a>
        </nav>
        <div className="header-actions">
          <button className="saved-header" onClick={showFavorites} aria-label={`Сохранённые места: ${favorites.length}`}>
            <Bookmark size={17} fill={favorites.length ? 'currentColor' : 'none'} /><span>Сохранённое</span>{favorites.length > 0 && <b>{favorites.length}</b>}
          </button>
          <a className="header-telegram" href={TELEGRAM_URL} target="_blank" rel="noreferrer">Телеграм <ArrowUpRight size={16} /></a>
          <button className="mobile-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav className="mobile-nav" aria-label="Мобильная навигация" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
            <a href="#idea" onClick={() => setMenuOpen(false)}>Идея <ArrowDownRight /></a>
            <a href="#maps" onClick={() => setMenuOpen(false)}>Три карты <ArrowDownRight /></a>
            <a href="#first-visit" onClick={() => setMenuOpen(false)}>Перед занятием <ArrowDownRight /></a>
            <button onClick={() => { setMenuOpen(false); setQuizOpen(true); }}>Подобрать хобби <Sparkles /></button>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Наш Телеграм <ArrowUpRight /></a>
          </motion.nav>
        )}
      </AnimatePresence>

      <main>
        <section className="hero-wrap" id="top" ref={heroRef}>
          <motion.div className="hero-scene" style={reduceMotion ? undefined : { clipPath: heroClip }}>
            <div className="hero-grain" />
            <div className="hero-orbit" aria-hidden="true"><span>попробовать · испачкать руки · удивиться · </span></div>
            <div className="hero-kicker"><span>Москва</span><span>Творческие мастерские</span><span>Можно с нуля</span></div>

            <motion.div className={`hero-photo-wrap ${heroCards[0].className}`} style={reduceMotion ? undefined : { y: yarnY, rotate: yarnRotate }}>
              <motion.div className="hero-photo" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.45, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
                <img src={heroCards[0].category.image} alt="Тафтинг — работа с цветной пряжей" />
                <span>01 · Тафтинг</span>
              </motion.div>
            </motion.div>
            <motion.div className={`hero-photo-wrap ${heroCards[1].className}`} style={reduceMotion ? undefined : { y: paintY, rotate: paintRotate }}>
              <motion.div className="hero-photo" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: 15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.62, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
                <img src={heroCards[1].category.image} alt="Рисование — акварельные краски" />
                <span>02 · Рисование</span>
              </motion.div>
            </motion.div>
            <motion.div className={`hero-photo-wrap ${heroCards[2].className}`} style={reduceMotion ? undefined : { y: clayY, scale: clayScale }}>
              <motion.div className="hero-photo" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: 90 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.78, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
                <img src={heroCards[2].category.image} alt="Гончарка — создание формы из глины" />
                <span>03 · Гончарка</span>
              </motion.div>
            </motion.div>

            <motion.div className="hero-title-wrap" style={reduceMotion ? undefined : { y: titleY, scale: titleScale }}>
              <h1 className="hero-title" aria-label="Хоббиты">
                {Array.from('ХОББИТЫ').map((letter, index) => (
                  <span className="hero-letter-mask" key={`${letter}-${index}`} aria-hidden="true">
                    <motion.span initial={reduceMotion ? { opacity: 0 } : { y: '110%', rotate: 5 }} animate={reduceMotion ? { opacity: 1 } : { y: 0, rotate: 0 }} transition={{ delay: 0.1 + index * 0.055, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}>{letter}</motion.span>
                  </span>
                ))}
              </h1>
            </motion.div>

            <motion.div className="hero-bottom" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.8 }}>
              <div className="hero-subtitle"><span>Найдите хобби по душе</span><p>Три направления, {venues.length} мест и ни одного требования «уметь заранее».</p></div>
              <button className="hero-cta" onClick={() => scrollTo('maps')}><span>Выбрать<br />направление</span><ArrowDown size={27} /></button>
            </motion.div>
          </motion.div>
        </section>

        <section className="idea-section" id="idea">
          <div className="section-index"><span>01</span><span>Идея проекта</span></div>
          <motion.h2 className="idea-headline" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.35 }} variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } } }}>
            {ideaWords.map((word, index) => <motion.span key={`${word}-${index}`} variants={{ hidden: { opacity: 0, y: 70, rotate: 3 }, visible: { opacity: 1, y: 0, rotate: 0, transition: { duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] } } }}>{word}&nbsp;</motion.span>)}
          </motion.h2>
          <div className="idea-grid">
            <Reveal className="idea-copy">
              <p>Проект «Хоббиты» о том, как не бояться пробовать что-то новое. Мы сделали интерактивные карты Москвы с мастерскими и творческими пространствами, где можно познакомиться с разными увлечениями.</p>
              <p>Выбирайте интересующее направление хобби, изучайте места и находите то, что подходит вам.</p>
            </Reveal>
            <Reveal className="idea-side" delay={0.12}>
              <div className="idea-stat"><strong>3</strong><span>направления<br />для первого раза</span></div>
              <div className="idea-stat"><strong>{venues.length}</strong><span>мастерских<br />с деталями</span></div>
              <div className="idea-stat"><strong>0</strong><span>опыта нужно,<br />чтобы начать</span></div>
            </Reveal>
          </div>
          <Reveal className="find-hobby-banner">
            <div><Sparkles size={26} /><span>Не знаете, с чего начать?</span><p>Ответьте на три вопроса — подберём направление и конкретные места.</p></div>
            <button className="button button-dark" onClick={() => setQuizOpen(true)}>Подобрать за 30 секунд <ArrowRight size={19} /></button>
          </Reveal>
        </section>

        <section className="maps-section" id="maps">
          <div className="section-index light"><span>02</span><span>Карты увлечений</span></div>
          <Reveal className="maps-heading"><h2>Три способа<br /><em>сделать своё</em></h2><p>Откройте направление, сравните места по цене, времени и возрасту — и выберите мастерскую на карте.</p></Reveal>
          <div className="category-showcase">
            {categories.map((category, index) => {
              const count = venues.filter((venue) => venue.category === category.id).length;
              return (
                <motion.article
                  className={`category-row category-${category.id}`}
                  key={category.id}
                  style={{ '--category-color': category.color, '--category-ink': category.ink } as React.CSSProperties}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 100, rotate: index % 2 ? 1.5 : -1.5 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button className="category-image-button" onClick={() => explore(category.id)} aria-label={`Открыть карту: ${category.title}`}>
                    <motion.img src={category.image} alt={category.title} whileHover={reduceMotion ? undefined : { scale: 1.06 }} transition={{ duration: 0.6 }} />
                    <span className="category-number">0{index + 1}</span>
                    <span className="category-image-arrow"><ArrowUpRight size={30} /></span>
                  </button>
                  <div className="category-copy">
                    <span className="eyebrow">{category.eyebrow}</span>
                    <h3>{category.title}</h3>
                    <p>{category.description}</p>
                    <div className="category-meta"><span>{count} {count === 4 ? 'места' : 'мест'}</span><span>от {formatPrice(minPrice(category.id))}</span><span>Можно новичкам</span></div>
                    <button className="category-open" onClick={() => explore(category.id)}>Открыть карту <span><ArrowRight size={22} /></span></button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="explorer-section" id="explorer" style={{ '--active-color': active.color, '--active-ink': active.ink } as React.CSSProperties}>
          <div className="explorer-heading">
            <div><div className="section-index"><span>03</span><span>Интерактивная карта</span></div><h2>Найдите свою<br />мастерскую</h2></div>
            <p>Данные собраны по официальным сайтам. Нажмите на метку или место в списке, чтобы рассмотреть детали.</p>
          </div>

          <div className="category-tabs" role="tablist" aria-label="Направления хобби">
            {categories.map((category, index) => (
              <button key={category.id} role="tab" aria-selected={activeCategory === category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => { setActiveCategory(category.id); setDistrict('all'); setSelectedId(null); }}>
                <span>0{index + 1}</span>{category.title}<b>{venues.filter((venue) => venue.category === category.id).length}</b>
              </button>
            ))}
          </div>

          <div className="explorer-controls">
            <label className="search-field"><Search size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название, метро или адрес" aria-label="Поиск мастерской" />{search && <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={16} /></button>}</label>
            <button className={`filter-mobile-toggle ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={18} />Фильтры<ChevronDown size={16} /></button>
            <div className={`filter-fields ${filtersOpen ? 'is-open' : ''}`}>
              <label><span>Бюджет</span><select value={priceCap} onChange={(event) => setPriceCap(event.target.value)}><option value="all">Любая</option><option value="2500">до 2 500 ₽</option><option value="5000">до 5 000 ₽</option><option value="10000">до 10 000 ₽</option></select></label>
              <label><span>Участники</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="all">Все</option><option value="kids">С детьми 7–14</option></select></label>
              <label><span>Округ</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">Вся Москва</option>{districts.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
              <label><span>Сначала</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">По подборке</option><option value="price">Дешевле</option><option value="duration">Короче</option></select></label>
            </div>
          </div>

          <div className="results-toolbar">
            <div><strong>{filteredVenues.length}</strong><span>{filteredVenues.length === 1 ? 'место' : filteredVenues.length > 1 && filteredVenues.length < 5 ? 'места' : 'мест'} в подборке</span>{favoritesOnly && <b className="saved-filter-label"><Bookmark size={13} fill="currentColor" />Сохранённые</b>}</div>
            <div className="results-actions">
              <button className={favoritesOnly ? 'active' : ''} onClick={() => setFavoritesOnly((value) => !value)}><Bookmark size={16} fill={favoritesOnly ? 'currentColor' : 'none'} />Сохранённые</button>
              <button onClick={resetFilters}>Сбросить</button>
            </div>
            <div className="mobile-view-switch"><button className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}><ListFilter size={17} />Список</button><button className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}><MapIcon size={17} />Карта</button></div>
          </div>

          <div className={`explorer-workspace mobile-view-${mobileView}`}>
            <motion.div className="venue-list" layout>
              <AnimatePresence mode="popLayout">
                {filteredVenues.map((venue, index) => (
                  <motion.article
                    layout
                    key={venue.id}
                    className={`venue-card ${selectedId === venue.id ? 'is-selected' : ''}`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.2) }}
                  >
                    <button className="venue-card-image" onClick={() => openVenue(venue)} aria-label={`Подробнее: ${venue.name}`}><img src={venue.image} alt={venue.imageAlt} loading="lazy" onError={(event) => { if (event.currentTarget.dataset.fallback) return; event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = categoryById(venue.category).image; }} /><span>{String(index + 1).padStart(2, '0')}</span></button>
                    <div className="venue-card-copy">
                      <div className="venue-card-top"><span>{venue.district}{venue.metro ? ` · ${venue.metro.split(' · ')[0]}` : ''}</span><button className={favorites.includes(venue.id) ? 'is-saved' : ''} onClick={() => toggleFavorite(venue.id)} aria-label={favorites.includes(venue.id) ? 'Удалить из сохранённых' : 'Сохранить'}><Bookmark size={18} fill={favorites.includes(venue.id) ? 'currentColor' : 'none'} /></button></div>
                      <h3><button onClick={() => openVenue(venue)}>{venue.name}</button></h3>
                      <p>{venue.short}</p>
                      <div className="venue-facts"><span><b>{venue.priceLabel}</b></span><span><Clock3 size={14} />{venue.duration.split(';')[0]}</span><span><UsersRound size={14} />{venue.ageMin === null ? 'Возраст уточняйте' : `от ${venue.ageMin} лет`}</span></div>
                      <div className="venue-card-actions"><button onClick={() => openVenue(venue)}>Подробнее <ArrowUpRight size={17} /></button><button className={selectedId === venue.id ? 'active' : ''} onClick={() => { setSelectedId(venue.id); setMobileView('map'); }}><MapPin size={16} />На карте</button></div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
              {filteredVenues.length === 0 && (
                <motion.div className="empty-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Search size={30} /><h3>Таких мест пока не нашли</h3><p>{favoritesOnly && favorites.length === 0 ? 'Сохраняйте мастерские закладкой — они появятся здесь.' : 'Попробуйте увеличить бюджет, выбрать другой округ или убрать поисковый запрос.'}</p><button className="button button-dark" onClick={resetFilters}>Сбросить фильтры</button></motion.div>
              )}
            </motion.div>
            <div className="map-column">
              <HobbyMap places={filteredVenues} selectedId={selectedId} onSelect={(venue) => setSelectedId(venue.id)} onOpen={openVenue} accent={active.ink} />
              {filteredVenues.length === 0 && <div className="map-empty"><MapPin size={28} /><span>Метки появятся после изменения фильтров</span></div>}
            </div>
          </div>
        </section>

        <section className="first-visit-section" id="first-visit">
          <div className="section-index"><span>04</span><span>Перед первым занятием</span></div>
          <div className="first-visit-grid">
            <Reveal className="first-visit-title"><span className="handwritten">спокойно,</span><h2>всё получится<br />не сразу.<br /><em>И это нормально.</em></h2><p>Немного практических деталей, чтобы первый раз прошёл легче.</p></Reveal>
            <div className="faq-list">
              {faqItems.map((item, index) => (
                <Reveal key={item.question} delay={index * 0.06}>
                  <div className={`faq-item ${openFaq === index ? 'is-open' : ''}`}>
                    <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>0{index + 1}</span><strong>{item.question}</strong><span className="faq-toggle"><ChevronDown size={21} /></span></button>
                    <AnimatePresence initial={false}>{openFaq === index && <motion.div className="faq-answer" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.35 }}><p>{item.answer}</p></motion.div>}</AnimatePresence>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="telegram-section">
          <div className="telegram-doodle" aria-hidden="true"><Send /></div>
          <Reveal className="telegram-content">
            <span className="eyebrow">Продолжаем в Телеграме</span>
            <h2>Любопытно,<br />что <em>дальше?</em></h2>
            <p>Если хочется узнать про выбранное хобби больше, то в нашем телеграм-канале мы осваиваем разные хобби с нуля и делимся впечатлениями.</p>
            <a className="telegram-button" href={TELEGRAM_URL} target="_blank" rel="noreferrer"><span><Send size={22} />@hobbyskrolling</span><ArrowUpRight size={30} /></a>
            <div className="telegram-points"><span><Check size={16} />Осваиваем с нуля</span><span><Check size={16} />Делимся впечатлениями</span><span><Check size={16} />Пробуем разное</span></div>
          </Reveal>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top"><Logo /><p>Интерактивный путеводитель<br />по творческой Москве.</p><a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Мы в Телеграме <ArrowUpRight size={18} /></a></div>
        <div className="footer-bottom"><span>Хоббиты · {new Date().getFullYear()}</span><span>Информация о ценах и расписании может меняться — уточняйте у мастерских.</span><button onClick={() => scrollTo('top')}>Наверх <ArrowUpRight size={16} /></button></div>
      </footer>

      <VenueDrawer venue={selectedVenue} onClose={closeVenue} isFavorite={selectedVenue ? favorites.includes(selectedVenue.id) : false} onToggleFavorite={toggleFavorite} />
      <HobbyQuiz open={quizOpen} onClose={() => setQuizOpen(false)} onExplore={explore} onOpenVenue={openVenue} />
      <AnimatePresence>{saveNotice && <motion.div className="global-toast" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 10, x: '-50%' }}><Check size={17} />{saveNotice}</motion.div>}</AnimatePresence>
    </div>
  );
}
