import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  MONTHS,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  addDays,
  fa,
  fmt,
  longDate,
  monthLength,
  parse,
  shiftMonth,
  today,
  weekday,
  ymOf,
  type YM,
} from "@/lib/jalali";
import { Button, IconButton, inputCls, useLayer } from "./ui";

/* ---------- نوار ماه و سال ---------- */

interface NavProps {
  view: YM;
  onView: (v: YM) => void;
  onToday: () => void;
  /** جایگزین حرکت ماهانه (مثلاً حرکت هفتگی) */
  onStep?: (dir: -1 | 1) => void;
  stepLabel?: string;
  extra?: ReactNode;
}

const navSel =
  "h-9 rounded-lg border border-line bg-surface px-1.5 text-sm font-semibold focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

export function CalendarNav({ view, onView, onToday, onStep, stepLabel = "ماه", extra }: NavProps) {
  const cur = parse(today()).y;
  const from = Math.min(view.y, cur - 10);
  const to = Math.max(view.y, cur + 5);
  const years = Array.from({ length: to - from + 1 }, (_, n) => from + n);
  const step = (dir: -1 | 1) => (onStep ? onStep(dir) : onView(shiftMonth(view, dir)));
  return (
    <div className="flex items-center gap-1">
      <IconButton label={`${stepLabel} قبل`} onClick={() => step(-1)}>
        <ChevronRight />
      </IconButton>
      <select aria-label="ماه" className={navSel} value={view.m} onChange={(e) => onView({ y: view.y, m: +e.target.value })}>
        {MONTHS.map((name, n) => (
          <option key={name} value={n + 1}>
            {name}
          </option>
        ))}
      </select>
      <select aria-label="سال" className={navSel} value={view.y} onChange={(e) => onView({ y: +e.target.value, m: view.m })}>
        {years.map((y) => (
          <option key={y} value={y}>
            {fa(y)}
          </option>
        ))}
      </select>
      <IconButton label={`${stepLabel} بعد`} onClick={() => step(1)}>
        <ChevronLeft />
      </IconButton>
      <div className="flex-1" />
      {extra}
      <Button size="sm" onClick={onToday}>
        امروز
      </Button>
    </div>
  );
}

/* ---------- جدول روزهای ماه ---------- */

interface GridProps {
  view: YM;
  onView: (v: YM) => void;
  selected: string;
  onSelect: (date: string) => void;
  size?: "sm" | "lg";
  /** فقط هفته‌ای که این تاریخ در آن است نمایش داده شود */
  weekOf?: string;
  renderMeta?: (date: string, selected: boolean) => ReactNode;
  describe?: (date: string) => string;
  autoFocus?: boolean;
  className?: string;
}

export function MonthGrid({ view, onView, selected, onSelect, size = "sm", weekOf, renderMeta, describe, autoFocus, className }: GridProps) {
  const root = useRef<HTMLDivElement>(null);
  const [focusDate, setFocusDate] = useState<string | null>(autoFocus ? selected : null);
  const now = today();

  const offset = weekday(fmt(view.y, view.m, 1));
  const len = monthLength(view.y, view.m);
  const cells: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: len }, (_, n) => fmt(view.y, view.m, n + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  let rows: (string | null)[][] = [];
  for (let n = 0; n < cells.length; n += 7) rows.push(cells.slice(n, n + 7));
  if (weekOf) {
    const only = rows.filter((r) => r.includes(weekOf));
    rows = only.length ? only : rows.slice(0, 1);
  }
  const visible = rows.flat().filter((c): c is string => c !== null);
  const tabbable =
    [focusDate, selected, now].find((d): d is string => !!d && visible.includes(d)) ?? visible[0];

  useEffect(() => {
    if (!focusDate) return;
    root.current?.querySelector<HTMLElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate, view.y, view.m]);

  const onKeyDown = (e: KeyboardEvent) => {
    const date = (e.target as HTMLElement).dataset?.date;
    if (!date) return;
    // در چیدمان راست‌به‌چپ، کلید راست یعنی روز قبل
    const delta = { ArrowRight: -1, ArrowLeft: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = addDays(date, delta);
    const ym = ymOf(next);
    if (weekOf) {
      onSelect(next);
    } else if (ym.y !== view.y || ym.m !== view.m) {
      onView(ym);
    }
    setFocusDate(next);
  };

  return (
    <div ref={root} className={cn("flex flex-col", className)} onKeyDown={onKeyDown}>
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-medium text-muted" aria-hidden="true">
        {WEEKDAYS_SHORT.map((w, n) => (
          <div key={w} className={cn("py-1", n === 6 && "text-bad")}>
            <span className={size === "lg" ? "md:hidden" : undefined}>{w}</span>
            {size === "lg" && <span className="hidden md:inline">{WEEKDAYS[n]}</span>}
          </div>
        ))}
      </div>
      <div
        className={cn(
          "grid grid-cols-7 gap-1",
          size === "lg" ? "min-h-0 flex-1 auto-rows-[minmax(2.5rem,1fr)]" : "auto-rows-[2.25rem]"
        )}
      >
        {rows.flat().map((date, n) => {
          if (!date) return <div key={`e${n}`} />;
          const isSel = date === selected;
          const isToday = date === now;
          const friday = n % 7 === 6;
          const more = describe?.(date);
          return (
            <button
              key={date}
              type="button"
              data-date={date}
              tabIndex={date === tabbable ? 0 : -1}
              aria-pressed={isSel}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${longDate(date)}${isToday ? "، امروز" : ""}${more ? `، ${more}` : ""}`}
              onClick={() => {
                setFocusDate(null);
                onSelect(date);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors",
                size === "lg" && "md:text-base",
                isSel
                  ? "bg-brand font-bold text-white"
                  : cn(
                      "hover:bg-ink/[0.06]",
                      friday && "text-bad",
                      isToday && "bg-brand-soft font-bold text-brand ring-1 ring-inset ring-brand/50"
                    )
              )}
            >
              <span className="num leading-none">{fa(parse(date).d)}</span>
              {renderMeta?.(date, isSel)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- فیلد انتخاب تاریخ ---------- */

interface DateFieldProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  className?: string;
}

export function DateField({ value, onChange, label, className }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label ?? "تاریخ"}: ${longDate(value)}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(inputCls, "@container flex items-center gap-2 text-start", className)}
      >
        <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="num">{fa(value)}</span>
        <span className="hidden truncate text-xs text-muted @[10.5rem]:inline">{WEEKDAYS[weekday(value)]}</span>
      </button>
      {open && (
        <DatePopover
          anchor={btn}
          value={value}
          onClose={() => setOpen(false)}
          onPick={(d) => {
            onChange(d);
            setOpen(false);
            btn.current?.focus();
          }}
        />
      )}
    </>
  );
}

interface PopoverProps {
  anchor: RefObject<HTMLButtonElement | null>;
  value: string;
  onPick: (date: string) => void;
  onClose: () => void;
}

function DatePopover({ anchor, value, onPick, onClose }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<YM>(() => ymOf(value));
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayer(() => {
    onClose();
    anchor.current?.focus();
  });

  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const el = ref.current;
      if (!a || !el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const left = Math.max(8, Math.min(a.right - w, window.innerWidth - w - 8));
      let top = a.bottom + 6;
      if (top + h > window.innerHeight - 8) top = a.top - h - 6;
      if (top < 8) top = Math.max(8, window.innerHeight - h - 8);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor, view]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="انتخاب تاریخ"
      dir="rtl"
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, opacity: pos ? 1 : 0 }}
      className="fixed z-[80] w-[19rem] max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface p-3 shadow-2xl"
    >
      <CalendarNav view={view} onView={setView} onToday={() => onPick(today())} />
      <MonthGrid className="mt-2" view={view} onView={setView} selected={value} onSelect={onPick} autoFocus />
    </div>,
    document.body
  );
}
