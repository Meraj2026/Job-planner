/** تاریخ‌ها به‌صورت شمسی و با قالب «1404/07/15» ذخیره می‌شوند. */

export interface Attendance {
  date: string;
  in: string; // HH:MM
  out: string; // HH:MM
  holiday: boolean; // روز تعطیل: کل حضور اضافه‌کاری حساب می‌شود
  note: string;
}

export type PurchaseKind = "goods" | "service";

export interface Purchase {
  id: string;
  date: string;
  title: string;
  kind: PurchaseKind;
  qty: number;
  unit: string;
  amount: number;
  seller: string;
  invoice: string;
  note: string;
}

export interface Delivery {
  id: string;
  purchaseId: string;
  date: string;
  qty: number;
  recipient: string;
  note: string;
}

export type TaskKind = "courier" | "secretariat" | "special";
export type TaskStatus = "pending" | "done" | "cancelled";

export interface Task {
  id: string;
  date: string;
  title: string;
  kind: TaskKind;
  assigner: string;
  target: string;
  letterNo: string;
  note: string;
  important: boolean;
  remindDays: number;
  status: TaskStatus;
  postponed: number;
}

export type Currency = "ریال" | "تومان";

export interface Settings {
  currency: Currency;
  lastBackup: string;
}

export interface AppData {
  version: 1;
  attendance: Attendance[];
  purchases: Purchase[];
  deliveries: Delivery[];
  tasks: Task[];
  settings: Settings;
}
