import { useMemo, useState } from "react";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { WEEKDAYS, addDays, diffDays, fa, monthEnd, monthStart, shiftMonth, today, weekday, ymOf } from "@/lib/jalali";
import { useStore } from "@/lib/store";
import type { Attendance } from "@/lib/types";
import { calcWork, hm, hmLong, sumWork } from "@/lib/utils";
import { useRemovers } from "@/components/actions";
import { DateField } from "@/components/DatePicker";
import { useDialogs } from "@/components/forms";
import { Button, Empty, IconButton, Segmented } from "@/components/ui";

type Preset = "week" | "month" | "prev" | "custom";

function Stat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "brand" | "bad" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-2 py-2 text-center sm:px-4 sm:py-3 sm:text-start">
      <p className="truncate text-[11px] text-muted sm:text-xs">{label}</p>
      <p
        className={cn(
          "num text-lg font-bold leading-7 sm:text-2xl sm:leading-9",
          tone === "brand" && "text-brand",
          tone === "bad" && value > 0 && "text-bad"
        )}
        title={hmLong(value)}
      >
        {hm(value)}
      </p>
      <p className="hidden truncate text-xs text-muted sm:block">{sub ?? hmLong(value)}</p>
    </div>
  );
}

const th = "whitespace-nowrap px-1 py-2 text-start text-[11px] font-medium text-muted first:ps-3 last:pe-2 sm:px-4 sm:text-xs sm:first:ps-4 sm:last:pe-4";
const td = "whitespace-nowrap px-1 py-1 first:ps-3 last:pe-2 sm:px-4 sm:first:ps-4 sm:last:pe-4";

export function AttendanceTab() {
  const { data } = useStore();
  const dialogs = useDialogs();
  const remove = useRemovers();
  const now = today();

  const presets = useMemo(() => {
    const ym = ymOf(now);
    const prev = shiftMonth(ym, -1);
    const sat = addDays(now, -weekday(now));
    return {
      week: { from: sat, to: addDays(sat, 6) },
      month: { from: monthStart(ym), to: monthEnd(ym) },
      prev: { from: monthStart(prev), to: monthEnd(prev) },
    };
  }, [now]);

  const [range, setRange] = useState(presets.month);
  const [showEmpty, setShowEmpty] = useState(true);
  const { from, to } = range;
  const preset: Preset =
    (Object.keys(presets) as (keyof typeof presets)[]).find((k) => presets[k].from === from && presets[k].to === to) ??
    "custom";

  const { rows, stats, recorded } = useMemo(() => {
    const recs = data.attendance.filter((a) => a.date >= from && a.date <= to);
    const byDate = new Map(recs.map((r) => [r.date, r]));
    const span = diffDays(from, to) + 1;
    let days: string[];
    if (showEmpty && span <= 400) {
      days = [];
      for (let n = 0; n < span; n++) {
        const d = addDays(from, n);
        if (byDate.has(d) || d <= now) days.push(d);
      }
    } else {
      days = recs.map((r) => r.date).sort();
    }
    return {
      rows: days.reverse().map((d) => ({ date: d, rec: byDate.get(d) as Attendance | undefined })),
      stats: sumWork(recs),
      recorded: recs.length,
    };
  }, [data.attendance, from, to, showEmpty, now]);

  const todayRec = data.attendance.some((a) => a.date === now);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* بازهٔ زمانی */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Preset>
          label="بازهٔ زمانی"
          value={preset}
          onChange={(v) => v !== "custom" && setRange(presets[v])}
          options={[
            { value: "week", label: "این هفته" },
            { value: "month", label: "این ماه" },
            { value: "prev", label: "ماه قبل" },
          ]}
        />
        <div className="order-last flex w-full items-center gap-2 text-sm text-muted sm:order-none sm:w-auto">
          <span>از</span>
          <DateField
            label="از تاریخ"
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
            value={from}
            onChange={(d) => setRange({ from: d, to: d > to ? d : to })}
          />
          <span>تا</span>
          <DateField
            label="تا تاریخ"
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
            value={to}
            onChange={(d) => setRange({ from: d < from ? d : from, to: d })}
          />
        </div>
        <div className="flex-1" />
        <Button variant="primary" onClick={() => dialogs.open({ type: "attendance", date: now })}>
          {todayRec ? <Pencil className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {todayRec ? "ویرایش امروز" : "ثبت امروز"}
        </Button>
      </div>

      {/* جمع کارکرد بازه */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="جمع کارکرد در بازهٔ انتخابی">
        <Stat label="کل حضور" value={stats.total} sub={`${fa(recorded)} روز ثبت‌شده`} />
        <Stat label="ساعت عادی" value={stats.regular} sub="۸ تا ۱۴" />
        <Stat label="اضافه‌کاری" value={stats.overtime} tone="brand" />
        <Stat label="کسر کار" value={stats.deficit} tone="bad" />
      </div>

      {/* ریز روزها */}
      <section aria-label="ریز کارکرد روزانه" className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-3 border-b border-line px-3 py-2 sm:px-4">
          <h2 className="flex-1 text-sm font-bold">ریز کارکرد روزانه</h2>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              checked={showEmpty}
              onChange={(e) => setShowEmpty(e.target.checked)}
            />
            نمایش روزهای ثبت‌نشده
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <Empty
              icon={<Clock />}
              title="در این بازه ورود و خروجی ثبت نشده است"
              hint="بازهٔ دیگری انتخاب کنید یا ورود و خروج امروز را ثبت کنید."
            />
          ) : (
            <table className="w-full border-collapse text-[13px] sm:text-sm">
              <thead className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--color-line)]">
                <tr>
                  <th className={th}>تاریخ</th>
                  <th className={th}>ورود</th>
                  <th className={th}>خروج</th>
                  <th className={th}>کارکرد</th>
                  <th className={cn(th, "hidden sm:table-cell")}>عادی</th>
                  <th className={th}>اضافه‌کاری</th>
                  <th className={cn(th, "hidden md:table-cell")}>کسر کار</th>
                  <th className={cn(th, "hidden lg:table-cell")}>توضیح</th>
                  <th className={th}>
                    <span className="sr-only">عملیات</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ date, rec }) => {
                  const wd = weekday(date);
                  const c = rec ? calcWork(rec) : null;
                  return (
                    <tr key={date} className={cn("border-t border-line/70", date === now && "bg-brand-soft/40")}>
                      <td className={td}>
                        <span className="num font-medium">{fa(date)}</span>
                        <span
                          className={cn(
                            "block text-[11px] leading-4 text-muted sm:ms-2 sm:inline sm:text-xs",
                            wd === 6 && "text-bad"
                          )}
                        >
                          {WEEKDAYS[wd]}
                          {date === now && " (امروز)"}
                        </span>
                      </td>
                      {rec && c ? (
                        <>
                          <td className={td}>
                            <span className="num">{fa(rec.in)}</span>
                          </td>
                          <td className={td}>
                            <span className="num">{fa(rec.out)}</span>
                          </td>
                          <td className={td}>
                            <span className="num font-semibold">{hm(c.total)}</span>
                          </td>
                          <td className={cn(td, "hidden sm:table-cell")}>
                            <span className="num">{hm(c.regular)}</span>
                          </td>
                          <td className={td}>
                            <span className="num font-semibold text-brand">{c.overtime ? hm(c.overtime) : "—"}</span>
                          </td>
                          <td className={cn(td, "hidden md:table-cell")}>
                            <span className={cn("num", c.deficit > 0 && "text-bad")}>{c.deficit ? hm(c.deficit) : "—"}</span>
                          </td>
                          <td className={cn(td, "hidden max-w-56 truncate text-xs text-muted lg:table-cell")}>
                            {[rec.holiday && "روز تعطیل", rec.note].filter(Boolean).join(" · ")}
                          </td>
                          <td className={cn(td, "text-end")}>
                            <span className="inline-flex">
                              <IconButton
                                label={`ویرایش ${fa(date)}`}
                                onClick={() => dialogs.open({ type: "attendance", date })}
                              >
                                <Pencil />
                              </IconButton>
                              <IconButton
                                className="max-sm:hidden"
                                label={`حذف ${fa(date)}`}
                                tone="danger"
                                onClick={() => remove.attendance(date)}
                              >
                                <Trash2 />
                              </IconButton>
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={cn(td, "text-xs text-muted")} colSpan={2}>
                            ثبت نشده
                          </td>
                          <td className={td} />
                          <td className={cn(td, "hidden sm:table-cell")} />
                          <td className={td} />
                          <td className={cn(td, "hidden md:table-cell")} />
                          <td className={cn(td, "hidden lg:table-cell")} />
                          <td className={cn(td, "text-end")}>
                            <Button size="sm" variant="soft" onClick={() => dialogs.open({ type: "attendance", date })}>
                              ثبت
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
