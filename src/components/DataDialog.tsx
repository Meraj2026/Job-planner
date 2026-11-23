import { useRef, type ChangeEvent } from "react";
import { DatabaseBackup, Trash2, Upload } from "lucide-react";
import { fa, today } from "@/lib/jalali";
import { emptyData, normalizeData, useStore } from "@/lib/store";
import type { AppData, Currency } from "@/lib/types";
import { download } from "@/lib/utils";
import { Button, Field, Modal, Segmented, useUI } from "./ui";

const countsOf = (d: AppData) =>
  `${fa(d.attendance.length)} ورود و خروج، ${fa(d.purchases.length)} خرید، ${fa(d.deliveries.length)} تحویل و ${fa(
    d.tasks.length
  )} کار`;

export function DataDialog({ onClose }: { onClose: () => void }) {
  const { data, replaceAll, patchSettings } = useStore();
  const ui = useUI();
  const file = useRef<HTMLInputElement>(null);
  const isEmpty = !data.attendance.length && !data.purchases.length && !data.deliveries.length && !data.tasks.length;

  const backup = () => {
    const now = today();
    const payload = {
      app: "mizkar",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { ...data, settings: { ...data.settings, lastBackup: now } },
    };
    download(`mizkar-backup-${now.replace(/\//g, "-")}.json`, JSON.stringify(payload, null, 2), "application/json");
    patchSettings({ lastBackup: now });
    ui.toast("فایل پشتیبان دریافت شد");
  };

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    let next: AppData;
    try {
      const raw = JSON.parse(await f.text());
      next = normalizeData(raw && typeof raw === "object" && "data" in raw ? raw.data : raw);
    } catch {
      ui.toast("این فایل، پشتیبان معتبر میزکار نیست.", "bad");
      return;
    }
    const ok = await ui.confirm({
      title: "بازیابی از فایل پشتیبان",
      message: (
        <>
          <p>
            فایل «{f.name}» شامل {countsOf(next)} است.
          </p>
          {!isEmpty && (
            <p className="mt-2 font-medium text-bad">
              داده‌های فعلی ({countsOf(data)}) با محتوای این فایل جایگزین می‌شود.
            </p>
          )}
        </>
      ),
      confirmLabel: "بازیابی",
      danger: !isEmpty,
    });
    if (!ok) return;
    replaceAll(next);
    ui.toast("داده‌ها بازیابی شد");
    onClose();
  };

  const wipe = async () => {
    const ok = await ui.confirm({
      title: "حذف همهٔ داده‌ها",
      message: (
        <>
          <p>همهٔ داده‌های این برنامه ({countsOf(data)}) از این مرورگر پاک می‌شود و قابل برگشت نیست.</p>
          <p className="mt-2">اگر پشتیبان ندارید، ابتدا فایل پشتیبان بگیرید.</p>
        </>
      ),
      confirmLabel: "همه را حذف کن",
      danger: true,
    });
    if (!ok) return;
    replaceAll({ ...emptyData(), settings: { ...data.settings, lastBackup: "" } });
    ui.toast("همهٔ داده‌ها حذف شد");
  };

  return (
    <Modal title="پشتیبان و تنظیمات" onClose={onClose}>
      <div className="space-y-5">
        <p className="rounded-xl bg-paper px-3 py-2.5 text-xs leading-6 text-muted">
          داده‌ها فقط در حافظهٔ همین مرورگر نگهداری می‌شود ({countsOf(data)}). برای جلوگیری از ازدست‌رفتن اطلاعات یا انتقال
          به دستگاه دیگر، هر چند وقت یک‌بار فایل پشتیبان بگیرید.
        </p>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line p-3">
            <h3 className="text-sm font-bold">پشتیبان‌گیری</h3>
            <p className="mb-3 mt-1 text-xs text-muted">
              {data.settings.lastBackup ? (
                <>
                  آخرین پشتیبان: <span className="num">{fa(data.settings.lastBackup)}</span>
                </>
              ) : (
                "هنوز پشتیبانی گرفته نشده است."
              )}
            </p>
            <Button variant="primary" className="w-full" onClick={backup} disabled={isEmpty} data-autofocus>
              <DatabaseBackup className="size-4" aria-hidden="true" />
              دریافت فایل پشتیبان
            </Button>
          </div>
          <div className="rounded-xl border border-line p-3">
            <h3 className="text-sm font-bold">بازیابی</h3>
            <p className="mb-3 mt-1 text-xs text-muted">فایل پشتیبانی را که قبلاً گرفته‌اید انتخاب کنید.</p>
            <Button className="w-full" onClick={() => file.current?.click()}>
              <Upload className="size-4" aria-hidden="true" />
              انتخاب فایل پشتیبان
            </Button>
            <input ref={file} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={restore} />
          </div>
        </section>

        <Field group label="واحد پول مبالغ خرید">
          <Segmented<Currency>
            label="واحد پول"
            value={data.settings.currency}
            onChange={(v) => patchSettings({ currency: v })}
            options={[
              { value: "ریال", label: "ریال" },
              { value: "تومان", label: "تومان" },
            ]}
          />
        </Field>

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <p className="flex-1 text-xs text-muted">پاک‌کردن کامل داده‌ها برای شروع دوباره</p>
          <Button variant="ghost" className="text-bad hover:bg-bad-soft hover:text-bad" onClick={wipe} disabled={isEmpty}>
            <Trash2 className="size-4" aria-hidden="true" />
            حذف همهٔ داده‌ها
          </Button>
        </div>
      </div>
    </Modal>
  );
}
