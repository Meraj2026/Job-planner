import { WEEKDAYS, fa, longDate, today, weekday } from "./jalali";
import type { AppData } from "./types";
import { TASK_KINDS, calcWork, deliveredQty, faNum, hm, hmLong, sumWork } from "./utils";

export type SectionKey = "attendance" | "purchases" | "deliveries" | "tasks";

export const SECTION_LABELS: Record<SectionKey, string> = {
  attendance: "ورود و خروج و کارکرد",
  purchases: "خریدها (کارپردازی)",
  deliveries: "تحویل به همکاران",
  tasks: "امور محوله",
};

export interface ReportOptions {
  from: string;
  to: string;
  title: string;
  author: string;
  sections: Record<SectionKey, boolean>;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const n = (s: string | number) => `<span class="n">${esc(s)}</span>`;

const CSS = `
.rpt{font-family:"Vazirmatn Variable",Vazirmatn,Tahoma,"Segoe UI",sans-serif;color:#1e2330;direction:rtl;text-align:right;font-size:12px;line-height:1.8}
.rpt *{box-sizing:border-box}
.rpt h1{font-size:19px;margin:0 0 2px;font-weight:800}
.rpt .meta{display:flex;flex-wrap:wrap;gap:4px 20px;color:#444;border-bottom:2px solid #1e2330;padding-bottom:8px;margin-bottom:6px}
.rpt h2{font-size:14px;margin:18px 0 6px;font-weight:700;break-after:avoid}
.rpt table{width:100%;border-collapse:collapse}
.rpt th,.rpt td{border:1px solid #8a8a8a;padding:3px 6px;text-align:right;vertical-align:top}
.rpt th{background:#ececec;font-weight:700;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rpt tfoot td{background:#f5f5f5;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rpt tr{break-inside:avoid}
.rpt .n{direction:ltr;unicode-bidi:isolate;display:inline-block;white-space:nowrap}
.rpt .c{text-align:center;white-space:nowrap}
.rpt .none{color:#666;border:1px dashed #aaa;padding:6px 10px;margin:0}
.rpt .sum{margin:6px 0 0}
.rpt .sign{display:flex;justify-content:space-between;gap:24px;margin-top:44px;break-inside:avoid}
.rpt .sign div{flex:1;border-top:1px solid #8a8a8a;padding-top:6px}
`;

function table(head: string[], rows: string[][], foot = "") {
  return `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ""}</table>`;
}

function select(data: AppData, o: ReportOptions) {
  const inRange = (d: string) => d >= o.from && d <= o.to;
  const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);
  return {
    attendance: data.attendance.filter((a) => inRange(a.date)).sort(byDate),
    purchases: data.purchases.filter((p) => inRange(p.date)).sort(byDate),
    deliveries: data.deliveries.filter((d) => inRange(d.date)).sort(byDate),
    tasks: data.tasks.filter((t) => inRange(t.date)).sort(byDate),
  };
}

export function reportCounts(data: AppData, o: ReportOptions): Record<SectionKey, number> {
  const s = select(data, o);
  return {
    attendance: s.attendance.length,
    purchases: s.purchases.length,
    deliveries: s.deliveries.length,
    tasks: s.tasks.length,
  };
}

/** بدنهٔ گزارش (HTML ایمن‌شده) — هم برای پیش‌نمایش و چاپ، هم برای فایل خروجی */
export function buildReportBody(data: AppData, o: ReportOptions) {
  const s = select(data, o);
  const cur = data.settings.currency;
  const out: string[] = [];
  const none = '<p class="none">در این بازه موردی ثبت نشده است.</p>';

  out.push(`<style>${CSS}</style><div class="rpt">`);
  out.push(`<h1>${esc(o.title || "گزارش عملکرد")}</h1>`);
  out.push(
    `<div class="meta"><span>بازه: از ${n(fa(o.from))} تا ${n(fa(o.to))}</span><span>تاریخ تهیه: ${esc(
      longDate(today())
    )}</span>${o.author ? `<span>تهیه‌کننده: ${esc(o.author)}</span>` : ""}</div>`
  );

  if (o.sections.attendance) {
    out.push(`<h2>${SECTION_LABELS.attendance}</h2>`);
    if (!s.attendance.length) out.push(none);
    else {
      const sum = sumWork(s.attendance);
      out.push(
        table(
          ["ردیف", "تاریخ", "روز", "ورود", "خروج", "کل حضور", "عادی", "اضافه‌کاری", "کسر کار", "توضیح"],
          s.attendance.map((a, k) => {
            const c = calcWork(a);
            return [
              fa(k + 1),
              n(fa(a.date)),
              WEEKDAYS[weekday(a.date)],
              n(fa(a.in)),
              n(fa(a.out)),
              n(hm(c.total)),
              n(hm(c.regular)),
              n(hm(c.overtime)),
              n(hm(c.deficit)),
              esc([a.holiday ? "روز تعطیل" : "", a.note].filter(Boolean).join(" · ")),
            ];
          }),
          `<tr><td colspan="5">جمع ${fa(sum.days)} روز</td><td>${n(hm(sum.total))}</td><td>${n(hm(sum.regular))}</td><td>${n(
            hm(sum.overtime)
          )}</td><td>${n(hm(sum.deficit))}</td><td></td></tr>`
        )
      );
      out.push(
        `<p class="sum">کل حضور: <b>${hmLong(sum.total)}</b> — ساعت عادی (۸ تا ۱۴): <b>${hmLong(
          sum.regular
        )}</b> — اضافه‌کاری: <b>${hmLong(sum.overtime)}</b> — کسر کار: <b>${hmLong(sum.deficit)}</b></p>`
      );
    }
  }

  if (o.sections.purchases) {
    out.push(`<h2>${SECTION_LABELS.purchases}</h2>`);
    if (!s.purchases.length) out.push(none);
    else {
      const total = s.purchases.reduce((t, p) => t + p.amount, 0);
      out.push(
        table(
          ["ردیف", "تاریخ", "شرح", "نوع", "مقدار", `مبلغ (${esc(cur)})`, "فروشنده", "فاکتور", "تحویل‌شده", "باقی‌مانده"],
          s.purchases.map((p, k) => {
            const done = deliveredQty(data.deliveries, p.id);
            return [
              fa(k + 1),
              n(fa(p.date)),
              esc(p.title) + (p.note ? `<br><small>${esc(p.note)}</small>` : ""),
              p.kind === "goods" ? "کالا" : "خدمت",
              `${faNum(p.qty)} ${esc(p.unit)}`,
              p.amount ? faNum(p.amount) : "—",
              esc(p.seller),
              esc(fa(p.invoice)),
              faNum(done),
              faNum(Math.round((p.qty - done) * 100) / 100),
            ];
          }),
          `<tr><td colspan="5">جمع ${fa(s.purchases.length)} خرید</td><td>${faNum(total)}</td><td colspan="4"></td></tr>`
        )
      );
    }
  }

  if (o.sections.deliveries) {
    out.push(`<h2>${SECTION_LABELS.deliveries}</h2>`);
    if (!s.deliveries.length) out.push(none);
    else {
      out.push(
        table(
          ["ردیف", "تاریخ تحویل", "کالا / خدمت", "مقدار", "تحویل‌گیرنده", "توضیح", "امضای گیرنده"],
          s.deliveries.map((d, k) => {
            const p = data.purchases.find((x) => x.id === d.purchaseId);
            return [
              fa(k + 1),
              n(fa(d.date)),
              esc(p?.title ?? "—"),
              `${faNum(d.qty)} ${esc(p?.unit ?? "")}`,
              esc(d.recipient),
              esc(d.note),
              "",
            ];
          })
        )
      );
    }
  }

  if (o.sections.tasks) {
    out.push(`<h2>${SECTION_LABELS.tasks}</h2>`);
    if (!s.tasks.length) out.push(none);
    else {
      const label = { pending: "در انتظار", done: "انجام شد", cancelled: "منتفی شد" };
      const cnt = (st: keyof typeof label) => s.tasks.filter((t) => t.status === st).length;
      out.push(
        table(
          ["ردیف", "تاریخ", "عنوان کار", "نوع", "ارجاع‌دهنده", "مقصد / شمارهٔ نامه", "نتیجه"],
          s.tasks.map((t, k) => [
            fa(k + 1),
            n(fa(t.date)),
            (t.important ? "★ " : "") + esc(t.title) + (t.note ? `<br><small>${esc(t.note)}</small>` : ""),
            TASK_KINDS[t.kind],
            esc(t.assigner),
            esc([t.target, t.letterNo && `نامهٔ ${fa(t.letterNo)}`].filter(Boolean).join(" · ")),
            label[t.status] + (t.postponed ? ` (${fa(t.postponed)} بار موکول)` : ""),
          ])
        )
      );
      out.push(
        `<p class="sum">انجام شد: <b>${fa(cnt("done"))}</b> — در انتظار: <b>${fa(cnt("pending"))}</b> — منتفی شد: <b>${fa(
          cnt("cancelled")
        )}</b></p>`
      );
    }
  }

  out.push(`<div class="sign"><div>تهیه‌کننده: ${esc(o.author)}</div><div>تأییدکننده:</div></div></div>`);
  return out.join("");
}

/** فایل مستقل HTML که بدون برنامه هم باز و چاپ می‌شود */
export function buildReportFile(data: AppData, o: ReportOptions) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title || "گزارش عملکرد")} — ${fa(o.from)} تا ${fa(o.to)}</title>
<style>
@page{size:A4;margin:14mm}
body{margin:0 auto;max-width:210mm;padding:16px;background:#fff}
.bar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:16px;font-family:Tahoma,sans-serif}
.bar button{font:inherit;padding:8px 18px;border:0;border-radius:8px;background:#2d4b9a;color:#fff;cursor:pointer}
@media print{body{max-width:none;padding:0}.bar{display:none}}
</style>
</head>
<body>
<div class="bar"><button onclick="window.print()">چاپ گزارش</button></div>
${buildReportBody(data, o)}
</body>
</html>`;
}
