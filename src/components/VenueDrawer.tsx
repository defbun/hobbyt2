import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowUpRight, Bookmark, Check, Clock3, Copy, Mail, MapPin, Phone, Share2, Sparkles, UsersRound, X } from 'lucide-react';
import type { Venue } from '../data/places';
import { categoryById, yandexMapsUrl } from '../data/places';
import { copyText } from '../utils/clipboard';

type Props = {
  venue: Venue | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export default function VenueDrawer({ venue, onClose, isFavorite, onToggleFavorite }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState('');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!venue) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setNotice('');
    const timer = window.setTimeout(() => closeRef.current?.focus(), 80);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [venue?.id]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleShare = async () => {
    if (!venue) return;
    const url = new URL(window.location.href);
    url.hash = `place=${venue.id}`;
    const shareData = { title: `${venue.name} — Хоббиты`, text: `${venue.name}: ${venue.short}`, url: url.toString() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await copyText(url.toString());
        setNotice('Ссылка на место скопирована');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setNotice('Не получилось поделиться — скопируйте адрес страницы');
    }
  };

  const handleCopyAddress = async () => {
    if (!venue) return;
    try {
      await copyText(`Москва, ${venue.address}`);
      setNotice('Адрес скопирован');
    } catch {
      setNotice('Не получилось скопировать адрес');
    }
  };

  return (
    <AnimatePresence>
      {venue && (
        <motion.div
          className="drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            ref={panelRef}
            className="venue-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="venue-title"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
          >
            <div className="drawer-visual">
              <img src={venue.image} alt={venue.imageAlt} onError={(event) => { if (event.currentTarget.dataset.fallback) return; event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = categoryById(venue.category).image; }} />
              <div className="drawer-visual-shade" />
              <div className="drawer-topbar">
                <button ref={closeRef} className="round-button light" onClick={onClose} aria-label="Закрыть карточку">
                  <ArrowLeft size={21} />
                </button>
                <div className="drawer-actions">
                  <button className={`round-button light ${isFavorite ? 'is-saved' : ''}`} onClick={() => onToggleFavorite(venue.id)} aria-label={isFavorite ? 'Удалить из сохранённых' : 'Сохранить место'}>
                    <Bookmark size={19} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button className="round-button light" onClick={handleShare} aria-label="Поделиться местом"><Share2 size={19} /></button>
                  <button className="round-button light desktop-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
                </div>
              </div>
              <div className="drawer-visual-copy">
                <span className="venue-category">{categoryById(venue.category).title}</span>
                <h2 id="venue-title">{venue.name}</h2>
                <p>{venue.short}</p>
              </div>
            </div>

            <div className="drawer-content">
              <div className="drawer-quickfacts">
                <div><MapPin size={18} /><span><small>Округ</small>{venue.district}</span></div>
                <div><Clock3 size={18} /><span><small>Время</small>{venue.duration}</span></div>
                <div><UsersRound size={18} /><span><small>Возраст</small>{venue.ageMin === null ? 'Уточните при записи' : `от ${venue.ageMin} лет`}</span></div>
              </div>

              <section className="drawer-section">
                <span className="drawer-section-number">01</span>
                <div><h3>Что это за место</h3><p>{venue.description}</p></div>
              </section>

              <section className="drawer-section">
                <span className="drawer-section-number">02</span>
                <div>
                  <h3>Сколько стоит</h3>
                  <p className="drawer-price">{venue.priceLabel}</p>
                  <ul className="price-list">{venue.priceDetails.map((price) => <li key={price}>{price}</li>)}</ul>
                </div>
              </section>

              <section className="drawer-section">
                <span className="drawer-section-number">03</span>
                <div>
                  <h3>Как всё проходит</h3>
                  <dl className="venue-details">
                    <div><dt>Для кого</dt><dd>{venue.ageLabel}</dd></div>
                    <div><dt>Форматы</dt><dd>{venue.formats.join(' · ')}</dd></div>
                    <div><dt>Что входит</dt><dd>{venue.includes}</dd></div>
                    <div><dt>Как записаться</dt><dd>{venue.booking}</dd></div>
                  </dl>
                </div>
              </section>

              <section className="drawer-section">
                <span className="drawer-section-number">04</span>
                <div>
                  <h3>Как добраться и связаться</h3>
                  <div className="address-block">
                    <MapPin size={20} />
                    <div><strong>{venue.address}</strong>{venue.metro && <span>{venue.metro}</span>}<small>Москва · {venue.district}</small></div>
                    <button onClick={handleCopyAddress} aria-label="Скопировать адрес"><Copy size={17} /></button>
                  </div>
                  <div className="contact-links">
                    {venue.phone && <a href={`tel:${venue.phone.replace(/[^+\d]/g, '')}`}><Phone size={17} />{venue.phone}</a>}
                    {venue.email && <a href={`mailto:${venue.email}`}><Mail size={17} />{venue.email}</a>}
                  </div>
                </div>
              </section>

              <div className="drawer-notice"><Sparkles size={17} /><p>Стоимость, расписание и условия могут меняться. Перед посещением уточните актуальные данные у мастерской.</p></div>
            </div>

            <div className="drawer-bookbar">
              <a className="button button-primary" href={venue.website || (venue.phone ? `tel:${venue.phone.replace(/[^+\d]/g, '')}` : yandexMapsUrl(venue))} target={venue.website ? '_blank' : undefined} rel="noreferrer">
                {venue.website ? 'Сайт и запись' : venue.phone ? 'Позвонить' : 'Открыть место'} <ArrowUpRight size={19} />
              </a>
              <a className="button button-outline" href={yandexMapsUrl(venue)} target="_blank" rel="noreferrer">Маршрут <MapPin size={18} /></a>
            </div>
            <AnimatePresence>{notice && <motion.div className="drawer-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={17} />{notice}</motion.div>}</AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
