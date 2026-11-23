import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, isDateStr, today } from "./jalali";
import type { AppData, Attendance, Delivery, Purchase, Settings, Task, TaskStatus } from "./types";
import { uid } from "./utils";

const KEY = "mizkar:data:v1";

export const emptyData = (): AppData => ({
  version: 1,
  attendance: [],
  purchases: [],
  deliveries: [],
  tasks: [],
  settings: { currency: "ریال", lastBackup: "" },
});

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
type Rec = Record<string, unknown>;
const list = (v: unknown): Rec[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Rec[]) : [];

/** اعتبارسنجی و یکدست‌سازی داده‌های خوانده‌شده از حافظه یا فایل پشتیبان */
export function normalizeData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("invalid");
  const r = raw as Rec;
  if (!["attendance", "purchases", "deliveries", "tasks"].some((k) => Array.isArray(r[k]))) {
    throw new Error("invalid");
  }
  const seen = new Set<string>();
  const attendance: Attendance[] = [];
  for (const a of list(r.attendance)) {
    if (!isDateStr(a.date) || !isTime(a.in) || !isTime(a.out) || seen.has(a.date)) continue;
    seen.add(a.date);
    attendance.push({ date: a.date, in: a.in, out: a.out, holiday: a.holiday === true, note: str(a.note) });
  }
  const purchases: Purchase[] = list(r.purchases)
    .filter((p) => isDateStr(p.date) && str(p.title))
    .map((p) => ({
      id: str(p.id) || uid(),
      date: p.date as string,
      title: str(p.title),
      kind: p.kind === "service" ? "service" : "goods",
      qty: Math.max(0, num(p.qty, 1)),
      unit: str(p.unit, "عدد"),
      amount: Math.max(0, num(p.amount)),
      seller: str(p.seller),
      invoice: str(p.invoice),
      note: str(p.note),
    }));
  const ids = new Set(purchases.map((p) => p.id));
  const deliveries: Delivery[] = list(r.deliveries)
    .filter((d) => isDateStr(d.date) && ids.has(str(d.purchaseId)))
    .map((d) => ({
      id: str(d.id) || uid(),
      purchaseId: str(d.purchaseId),
      date: d.date as string,
      qty: Math.max(0, num(d.qty, 1)),
      recipient: str(d.recipient),
      note: str(d.note),
    }));
  const tasks: Task[] = list(r.tasks)
    .filter((t) => isDateStr(t.date) && str(t.title))
    .map((t) => ({
      id: str(t.id) || uid(),
      date: t.date as string,
      title: str(t.title),
      kind: t.kind === "secretariat" || t.kind === "special" ? t.kind : "courier",
      assigner: str(t.assigner),
      target: str(t.target),
      letterNo: str(t.letterNo),
      note: str(t.note),
      important: t.important === true,
      remindDays: Math.min(60, Math.max(0, Math.round(num(t.remindDays, 7)))),
      status: t.status === "done" || t.status === "cancelled" ? t.status : "pending",
      postponed: Math.max(0, Math.round(num(t.postponed))),
    }));
  const s = (r.settings && typeof r.settings === "object" ? r.settings : {}) as Rec;
  return {
    version: 1,
    attendance,
    purchases,
    deliveries,
    tasks,
    settings: { currency: s.currency === "تومان" ? "تومان" : "ریال", lastBackup: str(s.lastBackup) },
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalizeData(JSON.parse(raw)) : emptyData();
  } catch {
    return emptyData();
  }
}

interface Store {
  data: AppData;
  saveError: boolean;
  upsertAttendance(rec: Attendance): void;
  removeAttendance(date: string): void;
  savePurchase(p: Purchase): void;
  removePurchase(id: string): void;
  saveDelivery(d: Delivery): void;
  removeDelivery(id: string): void;
  saveTask(t: Task): void;
  removeTask(id: string): void;
  setTaskStatus(id: string, status: TaskStatus): void;
  /** موکول به فردا؛ تاریخ جدید را برمی‌گرداند */
  postponeTask(id: string): string | null;
  replaceAll(d: AppData): void;
  patchSettings(p: Partial<Settings>): void;
}

const Ctx = createContext<Store | null>(null);

const upsert = <T extends { id: string }>(arr: T[], item: T) =>
  arr.some((x) => x.id === item.id) ? arr.map((x) => (x.id === item.id ? item : x)) : [...arr, item];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [data]);

  // هماهنگی بین چند پنجرهٔ باز از برنامه
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          setData(normalizeData(JSON.parse(e.newValue)));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const store = useMemo<Store>(
    () => ({
      data,
      saveError,
      upsertAttendance: (rec) =>
        setData((d) => ({ ...d, attendance: [...d.attendance.filter((a) => a.date !== rec.date), rec] })),
      removeAttendance: (date) =>
        setData((d) => ({ ...d, attendance: d.attendance.filter((a) => a.date !== date) })),
      savePurchase: (p) => setData((d) => ({ ...d, purchases: upsert(d.purchases, p) })),
      removePurchase: (id) =>
        setData((d) => ({
          ...d,
          purchases: d.purchases.filter((p) => p.id !== id),
          deliveries: d.deliveries.filter((x) => x.purchaseId !== id),
        })),
      saveDelivery: (x) => setData((d) => ({ ...d, deliveries: upsert(d.deliveries, x) })),
      removeDelivery: (id) => setData((d) => ({ ...d, deliveries: d.deliveries.filter((x) => x.id !== id) })),
      saveTask: (t) => setData((d) => ({ ...d, tasks: upsert(d.tasks, t) })),
      removeTask: (id) => setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),
      setTaskStatus: (id, status) =>
        setData((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
      postponeTask: (id) => {
        const task = data.tasks.find((t) => t.id === id);
        if (!task) return null;
        const now = today();
        const next = addDays(task.date > now ? task.date : now, 1);
        setData((d) => ({
          ...d,
          tasks: d.tasks.map((t) =>
            t.id === id ? { ...t, date: next, status: "pending", postponed: t.postponed + 1 } : t
          ),
        }));
        return next;
      },
      replaceAll: (d) => setData(d),
      patchSettings: (p) => setData((d) => ({ ...d, settings: { ...d.settings, ...p } })),
    }),
    [data, saveError]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}
