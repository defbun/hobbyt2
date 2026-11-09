import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, RotateCcw, X } from 'lucide-react';
import { categories, venues, type CategoryId, type Venue } from '../data/places';

type Answers = { company?: string; mood?: string; budget?: number };

const questions = [
  {
    key: 'company' as const,
    eyebrow: 'Вопрос 1 из 3',
    title: 'С кем пойдёте пробовать?',
    options: [
      { value: 'self', label: 'В одиночку', note: 'Время для себя' },
      { value: 'friends', label: 'С друзьями или парой', note: 'Общее впечатление' },
      { value: 'kids', label: 'С ребёнком', note: 'Семейное занятие' },
    ],
  },
  {
    key: 'mood' as const,
    eyebrow: 'Вопрос 2 из 3',
    title: 'Чего хочется больше?',
    options: [
      { value: 'calm', label: 'Замедлиться', note: 'Наблюдать и смешивать цвета' },
      { value: 'bold', label: 'Сделать что-то смелое', note: 'Яркий результат с первого раза' },
      { value: 'tactile', label: 'Поработать руками', note: 'Почувствовать материал' },
    ],
  },
  {
    key: 'budget' as const,
    eyebrow: 'Вопрос 3 из 3',
    title: 'Какой бюджет на человека?',
    options: [
      { value: 2500, label: 'До 2 500 ₽', note: 'Попробовать без больших трат' },
      { value: 5000, label: 'До 5 000 ₽', note: 'Средний бюджет' },
      { value: 10000, label: 'До 10 000 ₽', note: 'Можно выбрать любой формат' },
    ],
  },
];

function getRecommendation(answers: Answers) {
  const scores: Record<CategoryId, number> = { tufting: 0, drawing: 0, pottery: 0 };
  if (answers.company === 'self') { scores.drawing += 2; scores.pottery += 1; }
  if (answers.company === 'friends') { scores.tufting += 2; scores.pottery += 1; }
  if (answers.company === 'kids') { scores.pottery += 2; scores.drawing += 2; scores.tufting -= 2; }
  if (answers.mood === 'calm') { scores.drawing += 3; scores.pottery += 1; }
  if (answers.mood === 'bold') scores.tufting += 3;
  if (answers.mood === 'tactile') { scores.pottery += 3; scores.tufting += 1; }
  if (answers.budget === 2500) { scores.tufting -= 3; scores.drawing += 2; scores.pottery += 2; }
  if (answers.budget === 5000) { scores.tufting += 1; scores.drawing += 1; scores.pottery += 1; }
  if (answers.budget === 10000) { scores.tufting += 2; scores.pottery += 1; }
  const category = (Object.entries(scores) as Array<[CategoryId, number]>).sort((a, b) => b[1] - a[1])[0][0];
  const matches = venues.filter((venue) => {
    if (venue.category !== category) return false;
    if (answers.budget && venue.priceFrom > answers.budget) return false;
    if (answers.company === 'kids' && ((venue.ageMin !== null && venue.ageMin > 14) || !venue.formats.includes('С детьми'))) return false;
    if (answers.company === 'friends' && !venue.formats.some((format) => ['Групповые', 'Для двоих'].includes(format))) return false;
    return true;
  }).sort((a, b) => a.priceFrom - b.priceFrom);
  const fallback = venues.filter((venue) => venue.category === category).sort((a, b) => a.priceFrom - b.priceFrom);
  return { category, matches: (matches.length ? matches : fallback).slice(0, 3), exactMatches: matches.length > 0 };
}

type Props = {
  open: boolean;
  onClose: () => void;
  onExplore: (category: CategoryId) => void;
  onOpenVenue: (venue: Venue) => void;
};

export default function HobbyQuiz({ open, onClose, onExplore, onOpenVenue }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [locked, setLocked] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const advanceTimer = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const result = useMemo(() => step === 3 ? getRecommendation(answers) : null, [step, answers]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => closeRef.current?.focus(), 100);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep(0); setAnswers({}); setLocked(false);
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    }
  }, [open]);

  const choose = (value: string | number) => {
    if (locked) return;
    setLocked(true);
    const key = questions[step].key;
    setAnswers((previous) => ({ ...previous, [key]: value }));
    advanceTimer.current = window.setTimeout(() => {
      setStep((current) => current + 1);
      setLocked(false);
    }, reduceMotion ? 0 : 180);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="quiz-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.section
            ref={panelRef}
            className="quiz-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 25, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="quiz-topbar">
              <a className="quiz-brand" href="#top" onClick={onClose}>Хоббиты<span>*</span></a>
              <button ref={closeRef} className="round-button" onClick={onClose} aria-label="Закрыть подбор"><X size={20} /></button>
            </div>
            <div className="quiz-progress" aria-label={`Шаг ${Math.min(step + 1, 4)} из 4`}><motion.span animate={{ width: `${((step + 1) / 4) * 100}%` }} /></div>

            <AnimatePresence mode="wait">
              {step < 3 ? (
                <motion.div className="quiz-question" key={step} initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -25 }} transition={{ duration: reduceMotion ? 0 : 0.25 }}>
                  <span className="eyebrow">{questions[step].eyebrow}</span>
                  <h2 id="quiz-title">{questions[step].title}</h2>
                  <div className="quiz-options">
                    {questions[step].options.map((option) => (
                      <button key={option.value} onClick={() => choose(option.value)} disabled={locked}>
                        <span><strong>{option.label}</strong><small>{option.note}</small></span>
                        <span className="quiz-option-arrow"><ArrowRight size={20} /></span>
                      </button>
                    ))}
                  </div>
                  {step > 0 && <button className="quiz-back" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} />Назад</button>}
                </motion.div>
              ) : result ? (
                <motion.div className="quiz-result" key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <span className="eyebrow"><Check size={15} />Ваше направление</span>
                  <h2 id="quiz-title">Попробуйте<br /><em>{categories.find((category) => category.id === result.category)?.title.toLowerCase()}</em></h2>
                  <p>{categories.find((category) => category.id === result.category)?.note}</p>
                  <div className="quiz-result-places">
                    {result.matches.map((venue) => (
                      <button key={venue.id} onClick={() => { onClose(); onOpenVenue(venue); }}>
                        <img src={venue.image} alt="" onError={(event) => { if (event.currentTarget.dataset.fallback) return; event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = categories.find((category) => category.id === venue.category)?.image || ''; }} />
                        <span><strong>{venue.name}</strong><small>{venue.district} · {venue.priceLabel}</small></span>
                        <ArrowUpRight size={19} />
                      </button>
                    ))}
                  </div>
                  {!result.exactMatches && <small className="quiz-fallback">Точного совпадения по бюджету нет — показываем самые доступные места направления.</small>}
                  <div className="quiz-result-actions">
                    <button className="button button-primary" onClick={() => { onClose(); onExplore(result.category); }}>Все места на карте <ArrowRight size={18} /></button>
                    <button className="quiz-restart" onClick={() => { setStep(0); setAnswers({}); }}><RotateCcw size={16} />Пройти заново</button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
