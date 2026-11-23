import { addDays, en, fa } from "./jalali";
import type { Attendance, Delivery, Task, TaskKind } from "./types";

/* ---------- ورود و خروج ---------- */

export const DEFAULT_IN = "07:10";
export const DEFAULT_OUT = "14:50";
/** ساعت کاری رسمی: ۸ تا ۱۴ */
export const WORK_START = 8 * 60;
export const WORK_END = 14 * 60;

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export interface WorkCalc {
  total: number;
  regular: number;
  overtime: number;
  deficit: number;
}

/** محاسبهٔ کارکرد یک روز (به دقیقه): هر حضوری بیرون از ۸ تا ۱۴ اضافه‌کاری است. */
export function calcWork(r: Pick<Attendance, "in" | "out" | "holiday">): WorkCalc {
  const a = toMin(r.in);
  const b = toMin(r.out);
  const total = Math.max(0, b - a);
  if (r.holiday) return { total, regular: 0, overtime: total, deficit: 0 };
  const regular = Math.max(0, Math.min(b, WORK_END) - Math.max(a, WORK_START));
  return { total, regular, overtime: total - regular, deficit: WORK_END - WORK_START - regular };
}

export function sumWork(list: Attendance[]) {
  const s = { days: list.length, total: 0, regular: 0, overtime: 0, deficit: 0 };
  for (const r of list) {
    const c = calcWork(r);
    s.total += c.total;
    s.regular += c.regular;
    s.overtime += c.overtime;
    s.deficit += c.deficit;
  }
  return s;
}

/** دقیقه → «۷:۴۰» */
export const hm = (min: number) => fa(`${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`);

/** دقیقه → «۷ ساعت و ۴۰ دقیقه» */
export function hmLong(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h && !m) return "صفر";
  if (!m) return fa(`${h} ساعت`);
  if (!h) return fa(`${m} دقیقه`);
  return fa(`${h} ساعت و ${m} دقیقه`);
}

/* ---------- اعداد ---------- */

export const faNum = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 2 });

export function parseNum(s: string) {
  const v = parseFloat(
    en(s)
      .replace(/[٫/]/g, ".")
      .replace(/[٬,،\s]/g, "")
  );
  return Number.isFinite(v) ? v : NaN;
}

export const onlyDigits = (s: string) => en(s).replace(/\D/g, "");

/* ---------- عمومی ---------- */

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const uniq = (list: string[]) =>
  [...new Set(list.map((s) => s.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa"));

/* ---------- کارپردازی ---------- */

export const deliveredQty = (deliveries: Delivery[], purchaseId: string, exceptId?: string) =>
  deliveries.reduce((s, d) => (d.purchaseId === purchaseId && d.id !== exceptId ? s + d.qty : s), 0);

/* ---------- امور محوله ---------- */

export const TASK_KINDS: Record<TaskKind, string> = {
  courier: "نامه‌رسانی",
  secretariat: "دبیرخانه",
  special: "کار ویژه",
};

/** اولین روزی که یک کار مهم در تقویم دیده می‌شود */
export const remindFrom = (t: Pick<Task, "date" | "important" | "remindDays">) =>
  t.important && t.remindDays > 0 ? addDays(t.date, -t.remindDays) : t.date;

/** کارهای مربوط به یک روز: سررسید همان روز، یادآوری کارهای مهمِ پیشِ رو، و (برای امروز) عقب‌افتاده‌ها */
export function tasksOn(tasks: Task[], date: string, todayStr: string) {
  const due: Task[] = [];
  const reminders: Task[] = [];
  const overdue: Task[] = [];
  for (const t of tasks) {
    if (t.date === date) due.push(t);
    else if (t.date > date && remindFrom(t) <= date && t.status !== "cancelled") reminders.push(t);
    else if (date === todayStr && t.date < date && t.status === "pending") overdue.push(t);
  }
  const byDate = (a: Task, b: Task) => a.date.localeCompare(b.date);
  return { due, reminders: reminders.sort(byDate), overdue: overdue.sort(byDate) };
}
