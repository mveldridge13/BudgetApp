'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Approximate popup size, used to keep it on-screen before it renders.
const POPUP_WIDTH = 320; // matches w-80
const POPUP_HEIGHT = 360;

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface DatePickerProps {
  /** Value as an ISO date string (YYYY-MM-DD), or '' when empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Optional inclusive min date (YYYY-MM-DD). Days before it are disabled. */
  min?: string;
  /** Optional inclusive max date (YYYY-MM-DD). Days after it are disabled. */
  max?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const YEARS_PER_PAGE = 12;

// Parse a YYYY-MM-DD string into a local Date (no timezone shift).
function parseISO(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Format a Date as YYYY-MM-DD in local time.
function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select a date',
  disabled = false,
  error = false,
  min,
  max,
}: DatePickerProps) {
  const selected = useMemo(() => parseISO(value), [value]);
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => parseISO(min || ''), [min]);
  const maxDate = useMemo(() => parseISO(max || ''), [max]);

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [viewYear, setViewYear] = useState((selected || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected || today).getMonth());
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  // Fixed viewport coords for the portal'd popup (so no ancestor `overflow`
  // can clip it, e.g. inside a scrollable modal).
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // When opening, snap the view back to the selected date (or today).
  useEffect(() => {
    if (isOpen) {
      const base = selected || today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
      setView('days');
    }
  }, [isOpen, selected, today]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // The popup is portal'd to <body>, so check it separately.
      const inTrigger = containerRef.current?.contains(target);
      const inPopup = popupRef.current?.contains(target);
      if (!inTrigger && !inPopup) setIsOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Position the popup relative to the trigger, flipping above / shifting
  // horizontally as needed so it always stays within the viewport.
  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !containerRef.current) {
      setCoords(null);
      return;
    }
    const compute = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.left;
      if (left + POPUP_WIDTH > vw - 8) left = vw - POPUP_WIDTH - 8;
      if (left < 8) left = 8;
      let top = rect.bottom + 8;
      if (top + POPUP_HEIGHT > vh - 8) {
        const above = rect.top - POPUP_HEIGHT - 8;
        top = above >= 8 ? above : Math.max(8, vh - POPUP_HEIGHT - 8);
      }
      setCoords({ top, left });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isOpen]);

  const isDisabledDay = (date: Date) => {
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  };

  const handleSelectDay = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (isDisabledDay(date)) return;
    onChange(toISO(date));
    setIsOpen(false);
  };

  const goToPrevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const goToNextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  // Build the day grid (leading blanks + days of month).
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Year grid page (12 years), aligned so the current viewYear is on the page.
  const yearPageStart = viewYear - (((viewYear % YEARS_PER_PAGE) + YEARS_PER_PAGE) % YEARS_PER_PAGE);
  const yearOptions = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i);

  const displayLabel = selected
    ? selected.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 border rounded-lg text-sm text-left transition-all bg-white
          ${error ? 'border-red-300' : isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-indigo-300 cursor-pointer'}
        `}
      >
        <span className={displayLabel ? 'text-gray-900' : 'text-gray-400'}>
          {displayLabel || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className="fixed w-80 bg-white border border-gray-100 rounded-xl shadow-lg p-2.5 z-[60]"
          style={{ top: coords.top, left: coords.left, animation: 'dropdownIn 0.15s ease-out forwards' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={view === 'years' ? () => setViewYear((y) => y - YEARS_PER_PAGE) : goToPrevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {view === 'days' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setView('months')}
                  className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  {MONTHS[viewMonth]}
                </button>
                <button
                  type="button"
                  onClick={() => setView('years')}
                  className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  {viewYear}
                </button>
              </div>
            )}
            {view === 'months' && (
              <button
                type="button"
                onClick={() => setView('years')}
                className="px-2 py-1 rounded-lg text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                {viewYear}
              </button>
            )}
            {view === 'years' && (
              <span className="px-2 py-1 text-sm font-semibold text-gray-900">
                {yearOptions[0]} – {yearOptions[yearOptions.length - 1]}
              </span>
            )}

            <button
              type="button"
              onClick={view === 'years' ? () => setViewYear((y) => y + YEARS_PER_PAGE) : goToNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days view */}
          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-0.5">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {dayCells.map((day, i) => {
                  if (day === null) return <div key={`b-${i}`} />;
                  const date = new Date(viewYear, viewMonth, day);
                  const isSelected = selected && isSameDay(date, selected);
                  const isToday = isSameDay(date, today);
                  const disabledDay = isDisabledDay(date);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      disabled={disabledDay}
                      className={`h-7 w-full flex items-center justify-center rounded-lg text-sm transition-colors
                        ${isSelected
                          ? 'bg-indigo-600 text-white font-semibold'
                          : disabledDay
                            ? 'text-gray-300 cursor-not-allowed'
                            : isToday
                              ? 'text-indigo-600 font-semibold hover:bg-indigo-50'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Months view */}
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((m, i) => {
                const isSelectedMonth = selected && selected.getFullYear() === viewYear && selected.getMonth() === i;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setViewMonth(i); setView('days'); }}
                    className={`py-2 rounded-lg text-sm transition-colors
                      ${isSelectedMonth
                        ? 'bg-indigo-600 text-white font-semibold'
                        : viewMonth === i
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Years view */}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1.5">
              {yearOptions.map((y) => {
                const isSelectedYear = selected && selected.getFullYear() === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setViewYear(y); setView('months'); }}
                    className={`py-2 rounded-lg text-sm transition-colors
                      ${isSelectedYear
                        ? 'bg-indigo-600 text-white font-semibold'
                        : viewYear === y
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                // Normalize to midnight so the day-granular isDisabledDay check
                // doesn't reject "today" because of the current time of day.
                const now = new Date();
                const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (!isDisabledDay(t)) {
                  onChange(toISO(t));
                  setIsOpen(false);
                } else {
                  setViewYear(t.getFullYear());
                  setViewMonth(t.getMonth());
                  setView('days');
                }
              }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
