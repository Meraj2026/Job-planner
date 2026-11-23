import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardList,
  Clock,
  HandHelping,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { addDays, diffDays, fa, gregorianLabel, longDate, today, ymOf, type YM } from "@/lib/jalali";
import { useStore } from "@/lib/store";
import { DEFAULT_IN, DEFAULT_OUT, calcWork, deliveredQty, faNum, hm, tasksOn } from "@/lib/utils";
import { useRemovers } from "@/components/actions";
import { CalendarNav, MonthGrid } from "@/components/DatePicker";
import { useDialogs } from "@/components/forms";
import { TaskItem } from "@/components/TaskItem";
import { Badge, Button, IconButton } from "@/components/ui";

interface DayMeta {
  att?: boolean;
  proc?: boolean;
  tasks: number;
  hot?: boolean;
}

function relative(date: string, now: string) {
  const n = diffDays(now, date);
  if (n === 0) return "";
  if (n === 1) return "فردا";
  if (n === -1) return "دیروز";
  return n > 0 ? `${fa(n)} روز دیگر` : `${fa(-n)} روز پیش`;
}

function Section({ icon, title, actions, children }: { icon: ReactNode; title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex min-h-9 items-center gap-2">
        <span className="text-muted [&_svg]:size-4" aria-hidden="true">
          {icon}
        </span>
        <h3 className="flex-1 text-sm font-bold">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

const None = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl border border-dashed border-line px-3 py-2.5 text-xs text-muted">{children}</p>
);

export function CalendarTab({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const { data } = useStore();
  const dialogs = useDialogs();
  const remove = useRemovers();
  const [view, setView] = useState<YM>(() => ymOf(selected));
  const [weekly, setWeekly] = useState(false);
  const now = today();
  const cur = data.settings.currency;

  const select = (d: string) => {
    onSelect(d);
    setView(ymOf(d));
  };

  const meta = useMemo(() => {
    const map = new Map<string, DayMeta>();
    const get = (d: string) => {
      let m = map.get(d);
      if (!m) map.set(d, (m = { tasks: 0 }));
      return m;
    };
    for (const a of data.attendance) get(a.date).att = true;
    for (const p of data.purchases) get(p.date).proc = true;
    for (const d of data.deliveries) get(d.date).proc = true;
    for (const t of data.tasks) {
      get(t.date).tasks++;
      if (t.important && t.status === "pending") {
        get(t.date).hot = true;
        for (let n = 1; n <= t.remindDays; n++) get(addDays(t.date, -n)).hot = true;
      }
    }
    return map;
  }, [data]);

  const att = data.attendance.find((a) => a.date === selected);
  const work = att ? calcWork(att) : null;
  const { due, reminders, overdue } = tasksOn(data.tasks, selected, now);
  const purchases = data.purchases.filter((p) => p.date === selected);
  const deliveries = data.deliveries.filter((d) => d.date === selected);
  const rel = relative(selected, now);

  return (
    <div className="flex h-full flex-col gap-3 lg:flex-row">
      {/* تقویم */}
      <section
        aria-label="تقویم ماه"
        className="flex shrink-0 flex-col rounded-2xl border border-line bg-surface p-2 sm:p-3 lg:min-h-0 lg:min-w-0 lg:flex-[5] lg:shrink lg:p-4"
      >
        <CalendarNav
          view={view}
          onView={setView}
          onToday={() => select(now)}
          onStep={weekly ? (dir) => select(addDays(selected, dir * 7)) : undefined}
          stepLabel={weekly ? "هفتهٔ" : "ماه"}
          extra={
            <IconButton
              className="lg:hidden"
              label={weekly ? "نمایش کل ماه" : "نمایش فشردهٔ هفتگی"}
              aria-pressed={weekly}
              onClick={() => {
                setWeekly(!weekly);
                setView(ymOf(selected));
              }}
            >
              {weekly ? <ChevronsUpDown /> : <ChevronsDownUp />}
            </IconButton>
          }
        />
        <MonthGrid
          className="mt-1 lg:mt-3 lg:min-h-0 lg:flex-1"
          size="lg"
          view={view}
          onView={setView}
          selected={selected}
          onSelect={select}
          weekOf={weekly ? selected : undefined}
          describe={(d) => {
            const m = meta.get(d);
            if (!m) return "";
            return [
              m.att && "ورود و خروج ثبت شده",
              m.tasks > 0 && `${fa(m.tasks)} کار`,
              m.proc && "خرید یا تحویل",
              m.hot && "کار مهم",
            ]
              .filter(Boolean)
              .join("، ");
          }}
          renderMeta={(d, sel) => {
            const m = meta.get(d);
            const ring = sel && "ring-1 ring-white";
            return (
              <span className="flex h-1.5 items-center gap-[3px]" aria-hidden="true">
                {m?.att && <i className={cn("size-1.5 rounded-full bg-ok", ring)} />}
                {m?.proc && <i className={cn("size-1.5 rounded-full bg-amber-500", ring)} />}
                {!!m?.tasks && <i className={cn("size-1.5 rounded-full", sel ? "bg-white" : "bg-brand")} />}
                {m?.hot && <i className={cn("size-1.5 rounded-full bg-bad", ring)} />}
              </span>
            );
          }}
        />
        <ul className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-xs text-muted lg:flex">
          {[
            ["bg-ok", "ورود و خروج"],
            ["bg-amber-500", "کارپردازی"],
            ["bg-brand", "امور محوله"],
            ["bg-bad", "کار مهم / یادآوری"],
          ].map(([c, label]) => (
            <li key={label} className="flex items-center gap-1.5">
              <i className={cn("size-2 rounded-full", c)} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* روز انتخاب‌شده */}
      <section
        aria-label={`داده‌های ${longDate(selected)}`}
        className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface lg:min-w-0 lg:flex-[4]"
      >
        <header className="flex items-center gap-2 border-b border-line px-3 py-2 sm:px-4 sm:py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold leading-6">{longDate(selected)}</h2>
            <p className="truncate text-xs text-muted">
              {gregorianLabel(selected)}
              {rel && ` · ${rel}`}
            </p>
          </div>
          {selected === now && <Badge tone="brand">امروز</Badge>}
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          <Section icon={<Clock />} title="ورود و خروج">
            {att && work ? (
              <div className="flex items-center gap-1 rounded-xl border border-line p-2 ps-3">
                <dl className="grid flex-1 grid-cols-4 gap-1 text-center">
                  {[
                    ["ورود", fa(att.in)],
                    ["خروج", fa(att.out)],
                    ["کارکرد", hm(work.total)],
                    ["اضافه‌کاری", hm(work.overtime)],
                  ].map(([label, v], n) => (
                    <div key={label}>
                      <dt className="text-[11px] text-muted">{label}</dt>
                      <dd className={cn("num text-sm font-bold", n === 3 && "text-brand")}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <IconButton label="ویرایش ورود و خروج" onClick={() => dialogs.open({ type: "attendance", date: selected })}>
                  <Pencil />
                </IconButton>
                <IconButton label="حذف ورود و خروج" tone="danger" onClick={() => remove.attendance(selected)}>
                  <Trash2 />
                </IconButton>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => dialogs.open({ type: "attendance", date: selected })}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand-soft/50 px-3 py-2.5 text-start text-sm font-medium text-brand transition-colors hover:bg-brand-soft"
              >
                <Plus className="size-4" aria-hidden="true" />
                ثبت ورود و خروج این روز
                <span className="ms-auto text-xs font-normal text-muted">
                  پیش‌فرض <span className="num">{fa(DEFAULT_IN)}</span> تا <span className="num">{fa(DEFAULT_OUT)}</span>
                </span>
              </button>
            )}
            {att?.note && <p className="mt-1.5 text-xs text-muted">توضیح: {att.note}</p>}
            {att?.holiday && <p className="mt-1.5 text-xs text-muted">روز تعطیل — کل حضور اضافه‌کاری حساب شده است.</p>}
          </Section>

          <Section
            icon={<ClipboardList />}
            title="امور محوله"
            actions={
              <Button size="sm" variant="soft" onClick={() => dialogs.open({ type: "task", date: selected })}>
                <Plus className="size-4" aria-hidden="true" />
                افزودن کار
              </Button>
            }
          >
            {due.length + reminders.length + overdue.length === 0 ? (
              <None>کاری برای این روز ثبت نشده است.</None>
            ) : (
              <ul className="space-y-2">
                {overdue.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
                {due.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
                {reminders.map((t) => (
                  <TaskItem key={t.id} task={t} viewDate={selected} />
                ))}
              </ul>
            )}
          </Section>

          <Section
            icon={<ShoppingBag />}
            title="کارپردازی"
            actions={
              <>
                <Button size="sm" variant="soft" onClick={() => dialogs.open({ type: "purchase", date: selected })}>
                  <Plus className="size-4" aria-hidden="true" />
                  خرید
                </Button>
                <Button size="sm" variant="soft" onClick={() => dialogs.open({ type: "delivery", date: selected })}>
                  <HandHelping className="size-4" aria-hidden="true" />
                  تحویل
                </Button>
              </>
            }
          >
            {purchases.length + deliveries.length === 0 ? (
              <None>خرید یا تحویلی در این روز ثبت نشده است.</None>
            ) : (
              <ul className="space-y-2">
                {purchases.map((p) => {
                  const left = p.qty - deliveredQty(data.deliveries, p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-1 rounded-xl border border-line p-2 ps-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          <Badge tone="warn" className="me-1.5 align-middle">
                            خرید
                          </Badge>
                          {p.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {faNum(p.qty)} {p.unit}
                          {p.amount > 0 && ` · ${faNum(p.amount)} ${cur}`}
                          {p.seller && ` · ${p.seller}`}
                        </p>
                      </div>
                      {left > 0 && (
                        <Button
                          size="sm"
                          onClick={() => dialogs.open({ type: "delivery", purchaseId: p.id, date: selected })}
                        >
                          تحویل
                        </Button>
                      )}
                      <IconButton label={`ویرایش ${p.title}`} onClick={() => dialogs.open({ type: "purchase", id: p.id })}>
                        <Pencil />
                      </IconButton>
                      <IconButton label={`حذف ${p.title}`} tone="danger" onClick={() => remove.purchase(p)}>
                        <Trash2 />
                      </IconButton>
                    </li>
                  );
                })}
                {deliveries.map((d) => {
                  const p = data.purchases.find((x) => x.id === d.purchaseId);
                  if (!p) return null;
                  return (
                    <li key={d.id} className="flex items-center gap-1 rounded-xl border border-line p-2 ps-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          <Badge tone="ok" className="me-1.5 align-middle">
                            تحویل
                          </Badge>
                          {d.recipient}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {faNum(d.qty)} {p.unit} از «{p.title}»{d.note && ` · ${d.note}`}
                        </p>
                      </div>
                      <IconButton label="ویرایش تحویل" onClick={() => dialogs.open({ type: "delivery", id: d.id })}>
                        <Pencil />
                      </IconButton>
                      <IconButton label="حذف تحویل" tone="danger" onClick={() => remove.delivery(d, p.unit)}>
                        <Trash2 />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </section>
    </div>
  );
}
