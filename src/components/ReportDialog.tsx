import { useMemo, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { addDays, fa, monthEnd, monthStart, shiftMonth, today, weekday, ymOf } from "@/lib/jalali";
import { SECTION_LABELS, buildReportBody, buildReportFile, reportCounts, type ReportOptions, type SectionKey } from "@/lib/report";
import { useStore } from "@/lib/store";
import { download } from "@/lib/utils";
import { DateField } from "./DatePicker";
import { Button, Field, Modal, Segmented, inputCls, useUI } from "./ui";

type Preset = "week" | "month" | "prev" | "custom";
const AUTHOR_KEY = "mizkar:author";

export function ReportDialog({ onClose }: { onClose: () => void }) {
  const { data } = useStore();
  const ui = useUI();
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

  const [o, setO] = useState<ReportOptions>(() => ({
    ...presets.month,
    title: "گزارش عملکرد",
    author: localStorage.getItem(AUTHOR_KEY) ?? "",
    sections: { attendance: true, purchases: true, deliveries: true, tasks: true },
  }));

  const preset: Preset =
    (Object.keys(presets) as (keyof typeof presets)[]).find((k) => presets[k].from === o.from && presets[k].to === o.to) ??
    "custom";
  const counts = reportCounts(data, o);
  const body = useMemo(() => buildReportBody(data, o), [data, o]);
  const anySection = Object.values(o.sections).some(Boolean);

  const setAuthor = (v: string) => {
    setO({ ...o, author: v });
    try {
      localStorage.setItem(AUTHOR_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const print = () => {
    const root = document.getElementById("print-root");
    if (!root) return;
    root.innerHTML = body;
    const clear = () => {
      root.innerHTML = "";
      window.removeEventListener("afterprint", clear);
    };
    window.addEventListener("afterprint", clear);
    try {
      window.print();
    } catch {
      ui.toast("چاپ در این مرورگر ممکن نشد؛ فایل گزارش را دریافت و چاپ کنید.", "bad");
    }
  };

  const save = () => {
    download(
      `mizkar-report-${o.from.replace(/\//g, "-")}_${o.to.replace(/\//g, "-")}.html`,
      buildReportFile(data, o),
      "text/html;charset=utf-8"
    );
    ui.toast("فایل گزارش دریافت شد");
  };

  return (
    <Modal
      title="گزارش‌گیری"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} className="me-auto">
            بستن
          </Button>
          <Button onClick={save} disabled={!anySection}>
            <FileDown className="size-4" aria-hidden="true" />
            دریافت فایل گزارش
          </Button>
          <Button variant="primary" onClick={print} disabled={!anySection}>
            <Printer className="size-4" aria-hidden="true" />
            چاپ / ذخیرهٔ PDF
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
        <div className="space-y-4">
          <Field group label="بازهٔ گزارش">
            <Segmented<Preset>
              full
              label="بازهٔ گزارش"
              value={preset}
              onChange={(v) => v !== "custom" && setO({ ...o, ...presets[v] })}
              options={[
                { value: "week", label: "این هفته" },
                { value: "month", label: "این ماه" },
                { value: "prev", label: "ماه قبل" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="از تاریخ">
              <DateField
                label="از تاریخ"
                value={o.from}
                onChange={(d) => setO({ ...o, from: d, to: d > o.to ? d : o.to })}
              />
            </Field>
            <Field label="تا تاریخ">
              <DateField
                label="تا تاریخ"
                value={o.to}
                onChange={(d) => setO({ ...o, to: d, from: d < o.from ? d : o.from })}
              />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1 text-[13px] font-medium">بخش‌های گزارش</legend>
            <div className="divide-y divide-line rounded-xl border border-line">
              {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
                <label key={k} className="flex min-h-10 items-center gap-2.5 px-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    checked={o.sections[k]}
                    onChange={(e) => setO({ ...o, sections: { ...o.sections, [k]: e.target.checked } })}
                  />
                  <span className="flex-1">{SECTION_LABELS[k]}</span>
                  <span className="text-xs text-muted">{fa(counts[k])} مورد</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="عنوان گزارش">
            <input className={inputCls} value={o.title} onChange={(e) => setO({ ...o, title: e.target.value })} />
          </Field>
          <Field label="نام تهیه‌کننده" hint="در سربرگ و محل امضای گزارش چاپ می‌شود.">
            <input className={inputCls} value={o.author} onChange={(e) => setAuthor(e.target.value)} />
          </Field>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[13px] font-medium">پیش‌نمایش</p>
          <div
            className="max-h-[26rem] overflow-auto rounded-xl border border-line bg-white p-4 lg:max-h-[34rem]"
            tabIndex={0}
            role="region"
            aria-label="پیش‌نمایش گزارش"
          >
            {anySection ? (
              <div className="min-w-[38rem]" dangerouslySetInnerHTML={{ __html: body }} />
            ) : (
              <p className="p-6 text-center text-sm text-muted">دست‌کم یکی از بخش‌های گزارش را انتخاب کنید.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
