import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { addDays, fa, longDate, today } from "@/lib/jalali";
import { useStore } from "@/lib/store";
import type { PurchaseKind, TaskKind } from "@/lib/types";
import {
  DEFAULT_IN,
  DEFAULT_OUT,
  TASK_KINDS,
  calcWork,
  deliveredQty,
  faNum,
  hm,
  onlyDigits,
  parseNum,
  toMin,
  uid,
  uniq,
} from "@/lib/utils";
import { DateField } from "./DatePicker";
import { Button, Empty, Field, Modal, Segmented, TimeField, inputCls, useUI } from "./ui";

export type DialogSpec =
  | { type: "attendance"; date: string }
  | { type: "purchase"; id?: string; date?: string }
  | { type: "delivery"; id?: string; purchaseId?: string; date?: string }
  | { type: "task"; id?: string; date?: string };

const DialogCtx = createContext<{ open: (s: DialogSpec) => void } | null>(null);

export function useDialogs() {
  const c = useContext(DialogCtx);
  if (!c) throw new Error("DialogProvider missing");
  return c;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<(DialogSpec & { key: number }) | null>(null);
  const [api] = useState(() => ({ open: (s: DialogSpec) => setSpec({ ...s, key: Date.now() }) }));
  const close = () => setSpec(null);
  return (
    <DialogCtx.Provider value={api}>
      {children}
      {spec?.type === "attendance" && <AttendanceDialog key={spec.key} date={spec.date} onClose={close} />}
      {spec?.type === "purchase" && <PurchaseDialog key={spec.key} id={spec.id} date={spec.date} onClose={close} />}
      {spec?.type === "delivery" && (
        <DeliveryDialog key={spec.key} id={spec.id} purchaseId={spec.purchaseId} date={spec.date} onClose={close} />
      )}
      {spec?.type === "task" && <TaskDialog key={spec.key} id={spec.id} date={spec.date} onClose={close} />}
    </DialogCtx.Provider>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const areaCls = `${inputCls} h-auto min-h-[4.5rem] resize-none py-2 leading-6`;

/* ---------- ورود و خروج ---------- */

function AttendanceDialog({ date, onClose }: { date: string; onClose: () => void }) {
  const { data, upsertAttendance, removeAttendance } = useStore();
  const ui = useUI();
  const find = (d: string) => data.attendance.find((a) => a.date === d);
  const init = (d: string) => {
    const ex = find(d);
    return { in: ex?.in ?? DEFAULT_IN, out: ex?.out ?? DEFAULT_OUT, holiday: ex?.holiday ?? false, note: ex?.note ?? "" };
  };
  const [d, setD] = useState(date);
  const [f, setF] = useState(() => init(date));
  const existing = find(d);
  const invalid = toMin(f.out) <= toMin(f.in);
  const c = calcWork(f);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    upsertAttendance({ date: d, in: f.in, out: f.out, holiday: f.holiday, note: f.note.trim() });
    ui.toast(existing ? "ورود و خروج ویرایش شد" : "ورود و خروج ثبت شد");
    onClose();
  };

  const remove = async () => {
    const ok = await ui.confirm({
      title: "حذف ورود و خروج",
      message: `ثبت ورود و خروج ${longDate(d)} حذف شود؟`,
      confirmLabel: "حذف",
      danger: true,
    });
    if (!ok) return;
    removeAttendance(d);
    ui.toast("ورود و خروج حذف شد");
    onClose();
  };

  return (
    <Modal
      title={existing ? "ویرایش ورود و خروج" : "ثبت ورود و خروج"}
      onClose={onClose}
      footer={
        <>
          {existing && (
            <Button variant="ghost" className="me-auto text-bad hover:bg-bad-soft hover:text-bad" onClick={remove}>
              <Trash2 className="size-4" aria-hidden="true" />
              حذف
            </Button>
          )}
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" type="submit" form="att-form" disabled={invalid} data-autofocus>
            {existing ? "ذخیرهٔ تغییرات" : "ثبت"}
          </Button>
        </>
      }
    >
      <form id="att-form" onSubmit={submit} className="space-y-4">
        <Field label="تاریخ" hint={existing ? "برای این روز قبلاً ثبت شده است؛ با ذخیره، همان ثبت ویرایش می‌شود." : undefined}>
          <DateField
            value={d}
            onChange={(nd) => {
              setD(nd);
              setF(init(nd));
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field group label="ساعت ورود">
            <TimeField label="ساعت ورود" value={f.in} onChange={(v) => setF({ ...f, in: v })} />
          </Field>
          <Field group label="ساعت خروج">
            <TimeField label="ساعت خروج" value={f.out} onChange={(v) => setF({ ...f, out: v })} />
          </Field>
        </div>
        {invalid ? (
          <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
            ساعت خروج باید بعد از ساعت ورود باشد.
          </p>
        ) : (
          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-paper p-3 text-center">
            {[
              ["کل حضور", c.total, "text-ink"],
              ["عادی (۸ تا ۱۴)", c.regular, "text-ink"],
              ["اضافه‌کاری", c.overtime, "text-brand"],
            ].map(([label, v, cls]) => (
              <div key={label as string}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className={`num text-lg font-bold ${cls}`}>{hm(v as number)}</dd>
              </div>
            ))}
          </dl>
        )}
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-brand"
            checked={f.holiday}
            onChange={(e) => setF({ ...f, holiday: e.target.checked })}
          />
          <span>
            روز تعطیل است
            <span className="block text-xs text-muted">کل حضور این روز اضافه‌کاری حساب می‌شود.</span>
          </span>
        </label>
        <Field label="توضیح">
          <input
            className={inputCls}
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            placeholder="مثلاً: مأموریت، مرخصی ساعتی…"
          />
        </Field>
      </form>
    </Modal>
  );
}

/* ---------- خرید ---------- */

const UNITS = ["عدد", "بسته", "جعبه", "کارتن", "دستگاه", "کیلوگرم", "متر", "لیتر", "سرویس"];

function PurchaseDialog({ id, date, onClose }: { id?: string; date?: string; onClose: () => void }) {
  const { data, savePurchase } = useStore();
  const ui = useUI();
  const editing = data.purchases.find((p) => p.id === id);
  const [f, setF] = useState(() => ({
    title: editing?.title ?? "",
    kind: (editing?.kind ?? "goods") as PurchaseKind,
    date: editing?.date ?? date ?? today(),
    qty: editing ? String(editing.qty) : "1",
    unit: editing?.unit ?? "عدد",
    amount: editing?.amount ? String(editing.amount) : "",
    seller: editing?.seller ?? "",
    invoice: editing?.invoice ?? "",
    note: editing?.note ?? "",
  }));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const qty = parseNum(f.qty);
  const delivered = editing ? deliveredQty(data.deliveries, editing.id) : 0;
  const errTitle = f.title.trim() ? "" : "شرح کالا یا خدمت را بنویسید.";
  const errQty = !(qty > 0)
    ? "مقدار باید عددی بیشتر از صفر باشد."
    : qty < delivered
      ? `تاکنون ${faNum(delivered)} ${f.unit} تحویل شده است؛ مقدار نمی‌تواند کمتر از آن باشد.`
      : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errTitle || errQty) return;
    savePurchase({
      id: editing?.id ?? uid(),
      title: f.title.trim(),
      kind: f.kind,
      date: f.date,
      qty: round2(qty),
      unit: f.unit.trim() || "عدد",
      amount: Number(f.amount || 0),
      seller: f.seller.trim(),
      invoice: f.invoice.trim(),
      note: f.note.trim(),
    });
    ui.toast(editing ? "خرید ویرایش شد" : "خرید ثبت شد");
    onClose();
  };

  return (
    <Modal
      title={editing ? "ویرایش خرید" : "ثبت خرید کالا یا خدمت"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" type="submit" form="purchase-form">
            {editing ? "ذخیرهٔ تغییرات" : "ثبت خرید"}
          </Button>
        </>
      }
    >
      <form id="purchase-form" onSubmit={submit} noValidate className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Field label="شرح کالا / خدمت" required error={tried ? errTitle : ""} className="col-span-2">
          <input
            data-autofocus
            className={inputCls}
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="مثلاً: کاغذ A4، تعمیر پرینتر"
          />
        </Field>
        <Field group label="نوع">
          <Segmented
            full
            label="نوع"
            value={f.kind}
            onChange={(v) => set("kind", v)}
            options={[
              { value: "goods", label: "کالا" },
              { value: "service", label: "خدمت" },
            ]}
          />
        </Field>
        <Field label="تاریخ خرید">
          <DateField value={f.date} onChange={(v) => set("date", v)} label="تاریخ خرید" />
        </Field>
        <Field label="تعداد / مقدار" required error={tried ? errQty : ""}>
          <input className={inputCls} inputMode="decimal" value={fa(f.qty)} onChange={(e) => set("qty", e.target.value)} />
        </Field>
        <Field label="واحد">
          <input className={inputCls} list="units-list" value={f.unit} onChange={(e) => set("unit", e.target.value)} />
          <datalist id="units-list">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Field>
        <Field label={`مبلغ کل (${data.settings.currency})`}>
          <input
            className={inputCls}
            inputMode="numeric"
            value={f.amount ? Number(f.amount).toLocaleString("fa-IR") : ""}
            onChange={(e) => set("amount", onlyDigits(e.target.value).slice(0, 15))}
            placeholder="۰"
          />
        </Field>
        <Field label="شمارهٔ فاکتور">
          <input className={inputCls} value={f.invoice} onChange={(e) => set("invoice", e.target.value)} />
        </Field>
        <Field label="فروشنده" className="col-span-2">
          <input className={inputCls} list="sellers-list" value={f.seller} onChange={(e) => set("seller", e.target.value)} />
          <datalist id="sellers-list">
            {uniq(data.purchases.map((p) => p.seller)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="توضیح" className="col-span-2">
          <textarea className={areaCls} rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

/* ---------- تحویل به همکار ---------- */

function DeliveryDialog({ id, purchaseId, date, onClose }: { id?: string; purchaseId?: string; date?: string; onClose: () => void }) {
  const { data, saveDelivery } = useStore();
  const ui = useUI();
  const dialogs = useDialogs();
  const editing = data.deliveries.find((x) => x.id === id);
  const remainingOf = (pid: string) => {
    const p = data.purchases.find((x) => x.id === pid);
    return p ? round2(p.qty - deliveredQty(data.deliveries, pid, editing?.id)) : 0;
  };
  const [pid, setPid] = useState(editing?.purchaseId ?? purchaseId ?? "");
  const [d, setD] = useState(editing?.date ?? date ?? today());
  const [qtyStr, setQtyStr] = useState(() => {
    if (editing) return String(editing.qty);
    const start = purchaseId ?? "";
    return start ? String(remainingOf(start)) : "";
  });
  const [recipient, setRecipient] = useState(editing?.recipient ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [tried, setTried] = useState(false);

  const purchase = data.purchases.find((p) => p.id === pid);
  const remaining = remainingOf(pid);
  const options = data.purchases
    .filter((p) => p.id === pid || remainingOf(p.id) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const qty = parseNum(qtyStr);

  const errPurchase = purchase ? "" : "کالا یا خدمت را انتخاب کنید.";
  const errRecipient = recipient.trim() ? "" : "نام تحویل‌گیرنده را بنویسید.";
  const errQty = !(qty > 0)
    ? "مقدار باید عددی بیشتر از صفر باشد."
    : purchase && qty > remaining + 1e-9
      ? `فقط ${faNum(remaining)} ${purchase.unit} باقی مانده است.`
      : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errPurchase || errRecipient || errQty) return;
    saveDelivery({
      id: editing?.id ?? uid(),
      purchaseId: pid,
      date: d,
      qty: round2(qty),
      recipient: recipient.trim(),
      note: note.trim(),
    });
    ui.toast(editing ? "تحویل ویرایش شد" : `تحویل به ${recipient.trim()} ثبت شد`);
    onClose();
  };

  if (!options.length) {
    return (
      <Modal title="ثبت تحویل به همکار" onClose={onClose} size="sm">
        <Empty
          icon={<PackagePlus />}
          title={data.purchases.length ? "همهٔ خریدها کامل تحویل شده‌اند" : "هنوز خریدی ثبت نشده است"}
          hint="برای ثبت تحویل، ابتدا کالا یا خدمت خریداری‌شده را ثبت کنید."
          action={
            <Button variant="primary" onClick={() => dialogs.open({ type: "purchase", date: d })}>
              ثبت خرید
            </Button>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={editing ? "ویرایش تحویل" : "ثبت تحویل به همکار"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" type="submit" form="delivery-form">
            {editing ? "ذخیرهٔ تغییرات" : "ثبت تحویل"}
          </Button>
        </>
      }
    >
      <form id="delivery-form" onSubmit={submit} noValidate className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Field
          label="کالا / خدمت"
          required
          className="col-span-2"
          error={tried ? errPurchase : ""}
          hint={purchase ? `باقی‌مانده برای تحویل: ${faNum(remaining)} ${purchase.unit}` : undefined}
        >
          <select
            className={inputCls}
            value={pid}
            onChange={(e) => {
              setPid(e.target.value);
              if (!editing) setQtyStr(e.target.value ? String(remainingOf(e.target.value)) : "");
            }}
          >
            <option value="">انتخاب کنید…</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {fa(p.date)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="تحویل‌گیرنده" required className="col-span-2" error={tried ? errRecipient : ""}>
          <input
            data-autofocus
            className={inputCls}
            list="recipients-list"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="نام همکار یا واحد"
          />
          <datalist id="recipients-list">
            {uniq(data.deliveries.map((x) => x.recipient)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label={`مقدار${purchase ? ` (${purchase.unit})` : ""}`} required error={tried ? errQty : ""}>
          <input className={inputCls} inputMode="decimal" value={fa(qtyStr)} onChange={(e) => setQtyStr(e.target.value)} />
        </Field>
        <Field label="تاریخ تحویل">
          <DateField value={d} onChange={setD} label="تاریخ تحویل" />
        </Field>
        <Field label="توضیح" className="col-span-2">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: با رسید شمارهٔ ۱۲" />
        </Field>
      </form>
    </Modal>
  );
}

/* ---------- امور محوله ---------- */

function TaskDialog({ id, date, onClose }: { id?: string; date?: string; onClose: () => void }) {
  const { data, saveTask } = useStore();
  const ui = useUI();
  const editing = data.tasks.find((t) => t.id === id);
  const [f, setF] = useState(() => ({
    title: editing?.title ?? "",
    kind: (editing?.kind ?? "courier") as TaskKind,
    date: editing?.date ?? date ?? today(),
    assigner: editing?.assigner ?? "",
    target: editing?.target ?? "",
    letterNo: editing?.letterNo ?? "",
    note: editing?.note ?? "",
    important: editing?.important ?? false,
    remindDays: String(editing?.remindDays || 7),
  }));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const days = Math.min(60, Math.max(1, Math.round(parseNum(f.remindDays)) || 7));
  const errTitle = f.title.trim() ? "" : "عنوان کار را بنویسید.";
  const withLetter = f.kind !== "special";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errTitle) return;
    saveTask({
      id: editing?.id ?? uid(),
      title: f.title.trim(),
      kind: f.kind,
      date: f.date,
      assigner: f.assigner.trim(),
      target: withLetter ? f.target.trim() : "",
      letterNo: withLetter ? f.letterNo.trim() : "",
      note: f.note.trim(),
      important: f.important,
      remindDays: days,
      status: editing?.status ?? "pending",
      postponed: editing?.postponed ?? 0,
    });
    ui.toast(editing ? "کار ویرایش شد" : "کار ثبت شد");
    onClose();
  };

  return (
    <Modal
      title={editing ? "ویرایش کار" : "افزودن کار محول‌شده"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>انصراف</Button>
          <Button variant="primary" type="submit" form="task-form">
            {editing ? "ذخیرهٔ تغییرات" : "افزودن"}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Field label="عنوان کار" required error={tried ? errTitle : ""} className="col-span-2">
          <input
            data-autofocus
            className={inputCls}
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="مثلاً: رساندن نامه به ادارهٔ مالیات"
          />
        </Field>
        <Field group label="نوع کار" className="col-span-2">
          <Segmented
            full
            label="نوع کار"
            value={f.kind}
            onChange={(v) => set("kind", v)}
            options={(Object.keys(TASK_KINDS) as TaskKind[]).map((k) => ({ value: k, label: TASK_KINDS[k] }))}
          />
        </Field>
        <Field label="تاریخ انجام">
          <DateField value={f.date} onChange={(v) => set("date", v)} label="تاریخ انجام" />
        </Field>
        <Field label="ارجاع‌دهنده">
          <input
            className={inputCls}
            list="assigners-list"
            value={f.assigner}
            onChange={(e) => set("assigner", e.target.value)}
            placeholder="چه کسی سپرده؟"
          />
          <datalist id="assigners-list">
            {uniq(data.tasks.map((t) => t.assigner)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        {withLetter && (
          <>
            <Field label="گیرنده / مقصد">
              <input className={inputCls} value={f.target} onChange={(e) => set("target", e.target.value)} />
            </Field>
            <Field label="شمارهٔ نامه">
              <input className={inputCls} value={f.letterNo} onChange={(e) => set("letterNo", e.target.value)} />
            </Field>
          </>
        )}
        <div className="col-span-2 rounded-xl border border-line p-3">
          <label className="flex items-start gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-bad"
              checked={f.important}
              onChange={(e) => set("important", e.target.checked)}
            />
            <span>
              اهمیت بالا؛ از روزهای قبل یادآوری شود
              <span className="block text-xs font-normal text-muted">
                کار در روزهای پیش از موعد هم در تقویم و فهرست امروز دیده می‌شود.
              </span>
            </span>
          </label>
          {f.important && (
            <div className="mt-3 flex flex-wrap items-center gap-2 ps-6 text-sm">
              <span>از</span>
              <input
                aria-label="تعداد روزهای یادآوری پیش از موعد"
                className={cn(inputCls, "w-16 text-center")}
                inputMode="numeric"
                value={fa(f.remindDays)}
                onChange={(e) => set("remindDays", onlyDigits(e.target.value).slice(0, 2))}
              />
              <span>روز قبل</span>
              <span className="text-xs text-muted">(از {longDate(addDays(f.date, -days))})</span>
            </div>
          )}
        </div>
        <Field label="توضیح" className="col-span-2">
          <textarea className={areaCls} rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
