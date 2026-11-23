import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { fa } from "@/lib/jalali";

/* ---------- لایه‌ها: کلید Escape فقط بالاترین پنجره را می‌بندد ---------- */

const layers: Array<() => void> = [];
if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && layers.length) {
      e.preventDefault();
      layers[layers.length - 1]();
    }
  });
}

export function useLayer(onClose: () => void) {
  const ref = useRef(onClose);
  useEffect(() => {
    ref.current = onClose;
  });
  useEffect(() => {
    const fn = () => ref.current();
    layers.push(fn);
    return () => {
      const idx = layers.indexOf(fn);
      if (idx >= 0) layers.splice(idx, 1);
    };
  }, []);
}

/* ---------- دکمه ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft" | "ok";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-ink hover:bg-paper",
  ghost: "text-muted hover:bg-ink/5 hover:text-ink",
  danger: "bg-bad text-white hover:brightness-95",
  soft: "bg-brand-soft text-brand hover:bg-brand/15",
  ok: "bg-ok-soft text-ok hover:bg-ok/15",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "md" ? "h-10 px-4 text-sm" : "h-8 px-2.5 text-[13px] pointer-coarse:h-9",
        variants[variant],
        className
      )}
      {...rest}
    />
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "danger";
}

export function IconButton({ label, tone = "default", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors disabled:pointer-events-none disabled:opacity-40 pointer-coarse:size-10 [&_svg]:size-[18px]",
        tone === "danger" ? "hover:bg-bad-soft hover:text-bad" : "hover:bg-ink/5 hover:text-ink",
        className
      )}
      {...rest}
    />
  );
}

/* ---------- فیلدها ---------- */

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:text-sm";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /** برای گروهی از کنترل‌ها (به‌جای یک ورودی تکی) */
  group?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, error, group, className, children }: FieldProps) {
  const body = (
    <>
      <span className="mb-1 block text-[13px] font-medium text-ink">
        {label}
        {required && (
          <span className="text-bad" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs text-bad">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </>
  );
  return group ? (
    <div role="group" aria-label={label} className={cn("block", className)}>
      {body}
    </div>
  ) : (
    <label className={cn("block", className)}>{body}</label>
  );
}

/* ---------- انتخاب چندگزینه‌ای ---------- */

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
  full?: boolean;
}

export function Segmented<T extends string>({ value, onChange, options, label, className, full }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "max-w-full overflow-x-auto rounded-lg bg-ink/[0.06] p-0.5 [scrollbar-width:none]",
        full ? "flex" : "inline-flex",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] transition-colors pointer-coarse:h-9",
              full && "flex-1",
              active ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"
            )}
          >
            {o.label}
            {o.count !== undefined && o.count > 0 && (
              <span
                className={cn(
                  "num rounded-full px-1.5 text-[11px] leading-5",
                  active ? "bg-brand-soft text-brand" : "bg-ink/10"
                )}
              >
                {fa(o.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- انتخاب ساعت ---------- */

const HOURS = Array.from({ length: 24 }, (_, n) => String(n).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, n) => String(n).padStart(2, "0"));
const timeSel =
  "h-10 flex-1 min-w-0 rounded-lg border border-line bg-surface px-1 text-center text-base font-semibold tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

export function TimeField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [h, m] = value.split(":");
  return (
    <div dir="ltr" role="group" aria-label={label} className="flex items-center gap-1">
      <select aria-label={`${label}، ساعت`} value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} className={timeSel}>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {fa(x)}
          </option>
        ))}
      </select>
      <span className="font-bold text-muted" aria-hidden="true">
        :
      </span>
      <select aria-label={`${label}، دقیقه`} value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} className={timeSel}>
        {MINUTES.map((x) => (
          <option key={x} value={x}>
            {fa(x)}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- برچسب ---------- */

type Tone = "neutral" | "brand" | "ok" | "warn" | "bad";
const tones: Record<Tone, string> = {
  neutral: "bg-ink/[0.06] text-muted",
  brand: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-medium leading-5 [&_svg]:size-3",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- حالت خالی ---------- */

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
      {icon && <div className="text-muted/50 [&_svg]:size-9">{icon}</div>}
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ---------- پنجره ---------- */

const FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const modalSize = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-5xl" };

export function Modal({ title, onClose, children, footer, size = "md" }: ModalProps) {
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useLayer(onClose);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = box.current;
    if (el) {
      const fine = window.matchMedia("(pointer: fine)").matches;
      const first = fine ? el.querySelector<HTMLElement>("[data-autofocus]") : null;
      (first ?? el).focus();
    }
    return () => prev?.focus?.();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === box.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade bg-ink/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex max-h-[94dvh] w-full animate-rise flex-col rounded-t-2xl bg-surface shadow-2xl outline-none sm:max-h-[90dvh] sm:rounded-2xl",
          modalSize[size]
        )}
      >
        <header className="flex items-center gap-2 border-b border-line py-2 pe-2 ps-4">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-bold">
            {title}
          </h2>
          <IconButton label="بستن" onClick={onClose}>
            <X />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ---------- پیام کوتاه و تأیید ---------- */

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

interface UI {
  toast(message: string, kind?: "ok" | "bad"): void;
  confirm(o: ConfirmOptions): Promise<boolean>;
}

const UICtx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; kind: "ok" | "bad" } | null>(null);
  const [ask, setAsk] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string, kind: "ok" | "bad" = "ok") => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = window.setTimeout(() => setToast(null), kind === "bad" ? 5000 : 2800);
  }, []);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setAsk({ ...o, resolve })),
    []
  );

  const answer = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };

  const [api] = useState<UI>(() => ({ toast: (m, k) => showToast(m, k), confirm: (o) => confirm(o) }));

  return (
    <UICtx.Provider value={api}>
      {children}
      {ask && (
        <Modal
          title={ask.title}
          size="sm"
          onClose={() => answer(false)}
          footer={
            <>
              <Button onClick={() => answer(false)}>انصراف</Button>
              <Button variant={ask.danger ? "danger" : "primary"} onClick={() => answer(true)} data-autofocus>
                {ask.confirmLabel ?? "تأیید"}
              </Button>
            </>
          }
        >
          <div className="text-sm leading-7 text-ink">{ask.message}</div>
        </Modal>
      )}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-4 md:top-[4.25rem]"
      >
        {toast && (
          <div
            key={toast.id}
            className={cn(
              "animate-rise rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg",
              toast.kind === "bad" ? "bg-bad" : "bg-ink"
            )}
          >
            {toast.message}
          </div>
        )}
      </div>
    </UICtx.Provider>
  );
}

export function useUI() {
  const ui = useContext(UICtx);
  if (!ui) throw new Error("UIProvider missing");
  return ui;
}
