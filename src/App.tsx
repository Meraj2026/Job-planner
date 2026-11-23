import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, ClipboardList, Clock, DatabaseBackup, MonitorDown, Printer, ShoppingBag } from "lucide-react";
import { cn } from "@/utils/cn";
import { fa, longDate, today } from "@/lib/jalali";
import { appIcon, canPromptInstall, isStandalone, promptInstall, subscribeInstall } from "@/lib/pwa";
import { useStore } from "@/lib/store";
import { DataDialog } from "@/components/DataDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { Button, Modal, useUI } from "@/components/ui";
import { AttendanceTab } from "@/tabs/AttendanceTab";
import { CalendarTab } from "@/tabs/CalendarTab";
import { ProcurementTab } from "@/tabs/ProcurementTab";
import { TasksTab } from "@/tabs/TasksTab";

type TabId = "calendar" | "attendance" | "procurement" | "tasks";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "calendar", label: "تقویم", icon: <CalendarDays /> },
  { id: "attendance", label: "ورود و خروج", icon: <Clock /> },
  { id: "procurement", label: "کارپردازی", icon: <ShoppingBag /> },
  { id: "tasks", label: "امور محوله", icon: <ClipboardList /> },
];

const TAB_KEY = "mizkar:tab";

export default function App() {
  const { data, saveError } = useStore();
  const ui = useUI();
  const now = today();
  const [tab, setTab] = useState<TabId>(() => {
    const saved = localStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === saved) ? (saved as TabId) : "calendar";
  });
  const [selected, setSelected] = useState(now);
  const [panel, setPanel] = useState<"report" | "data" | "install" | null>(null);
  const [installable, setInstallable] = useState(canPromptInstall);
  const [standalone] = useState(isStandalone);

  useEffect(() => subscribeInstall(() => setInstallable(canPromptInstall())), []);

  // اگر برنامه از شب تا صبح باز بماند، «امروز» خودکار به‌روز شود
  const [, setDayTick] = useState(0);
  useEffect(() => {
    let last = today();
    const check = () => {
      const t = today();
      if (t !== last) {
        last = t;
        setDayTick((n) => n + 1);
      }
    };
    const id = window.setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  // کارهایی که امروز باید به آن‌ها رسیدگی شود (موعد امروز یا عقب‌افتاده)
  const attention = data.tasks.filter((t) => t.status === "pending" && t.date <= now).length;

  const install = async () => {
    if (!installable) {
      setPanel("install");
      return;
    }
    if (await promptInstall()) ui.toast("برنامه نصب شد");
  };

  const tabButton = (t: (typeof TABS)[number], mobile: boolean) => {
    const active = tab === t.id;
    const badge = t.id === "tasks" && attention > 0 && (
      <span
        className={cn(
          "num rounded-full bg-bad px-1.5 text-[11px] font-bold leading-[18px] text-white",
          mobile && "absolute -top-1 start-1/2 ms-1.5"
        )}
        aria-label={`${fa(attention)} کار نیازمند رسیدگی`}
      >
        {fa(attention)}
      </span>
    );
    return (
      <button
        key={t.id}
        type="button"
        role="tab"
        id={`tab-${t.id}${mobile ? "-m" : ""}`}
        aria-selected={active}
        aria-controls={`panel-${t.id}`}
        onClick={() => setTab(t.id)}
        className={cn(
          "relative transition-colors [&_svg]:shrink-0",
          mobile
            ? "flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[11px] [&_svg]:size-5"
            : "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm [&_svg]:size-[18px]",
          active
            ? cn("font-bold text-brand", !mobile && "bg-brand-soft")
            : cn("text-muted hover:text-ink", !mobile && "hover:bg-ink/5")
        )}
      >
        {mobile && active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand" aria-hidden="true" />}
        <span className="relative">
          {t.icon}
          {mobile && badge}
        </span>
        {t.label}
        {!mobile && badge}
      </button>
    );
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 lg:px-5">
        <img src={appIcon} alt="" className="size-9 rounded-[10px]" />
        <div className="min-w-0">
          <h1 className="text-base font-extrabold leading-5">میزکار</h1>
          <p className="truncate text-[11px] leading-4 text-muted">{longDate(now)}</p>
        </div>

        <div role="tablist" aria-label="بخش‌های برنامه" className="mx-auto hidden items-center gap-1 md:flex">
          {TABS.map((t) => tabButton(t, false))}
        </div>
        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-1">
          <Button variant="ghost" className="px-2.5" aria-label="گزارش‌گیری" title="گزارش‌گیری" onClick={() => setPanel("report")}>
            <Printer className="size-[18px]" aria-hidden="true" />
            <span className="hidden xl:inline">گزارش</span>
          </Button>
          <Button
            variant="ghost"
            className="px-2.5"
            aria-label="پشتیبان و تنظیمات"
            title="پشتیبان و تنظیمات"
            onClick={() => setPanel("data")}
          >
            <DatabaseBackup className="size-[18px]" aria-hidden="true" />
            <span className="hidden xl:inline">پشتیبان</span>
          </Button>
          {!standalone && (
            <Button variant="soft" className="px-2.5" aria-label="نصب برنامه" title="نصب برنامه" onClick={install}>
              <MonitorDown className="size-[18px]" aria-hidden="true" />
              <span className="hidden sm:inline">نصب</span>
            </Button>
          )}
        </div>
      </header>

      {saveError && (
        <p role="alert" className="shrink-0 bg-bad px-4 py-2 text-center text-sm font-medium text-white">
          ذخیره در حافظهٔ مرورگر ممکن نشد. برای ازدست‌نرفتن اطلاعات، همین حالا از بخش «پشتیبان» فایل پشتیبان بگیرید.
        </p>
      )}

      <main className="mx-auto min-h-0 w-full max-w-[100rem] flex-1 p-2 sm:p-3 lg:p-4">
        {TABS.map((t) => (
          <div
            key={t.id}
            id={`panel-${t.id}`}
            role="tabpanel"
            aria-label={t.label}
            className={cn("h-full", tab !== t.id && "hidden")}
          >
            {t.id === "calendar" && <CalendarTab selected={selected} onSelect={setSelected} />}
            {t.id === "attendance" && <AttendanceTab />}
            {t.id === "procurement" && <ProcurementTab />}
            {t.id === "tasks" && <TasksTab />}
          </div>
        ))}
      </main>

      <div
        role="tablist"
        aria-label="بخش‌های برنامه"
        className="flex h-14 shrink-0 box-content border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.map((t) => tabButton(t, true))}
      </div>

      {panel === "report" && <ReportDialog onClose={() => setPanel(null)} />}
      {panel === "data" && <DataDialog onClose={() => setPanel(null)} />}
      {panel === "install" && (
        <Modal
          title="نصب میزکار روی دستگاه"
          size="md"
          onClose={() => setPanel(null)}
          footer={
            <Button variant="primary" onClick={() => setPanel(null)} data-autofocus>
              متوجه شدم
            </Button>
          }
        >
          <div className="space-y-3 text-sm leading-7">
            <p>
              با نصب، میزکار مثل یک برنامهٔ جدا با آیکون خودش باز می‌شود و بدون اینترنت هم کار می‌کند. مرورگر شما پنجرهٔ
              نصب خودکار را نشان نداده است؛ از یکی از این راه‌ها نصب کنید:
            </p>
            <ul className="space-y-2">
              {[
                ["کروم یا اِج در رایانه", "روی نشانهٔ نصب در انتهای نوار نشانی بزنید، یا از منوی مرورگر «نصب میزکار / Install» را انتخاب کنید."],
                ["کروم در اندروید", "منوی ⋮ را باز کنید و «افزودن به صفحهٔ اصلی / Install app» را بزنید."],
                ["سافاری در آیفون و آیپد", "دکمهٔ Share را بزنید و «Add to Home Screen» را انتخاب کنید."],
              ].map(([where, how]) => (
                <li key={where} className="rounded-xl border border-line px-3 py-2">
                  <p className="font-bold">{where}</p>
                  <p className="text-xs leading-6 text-muted">{how}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              اگر برنامه را درون پیش‌نمایش یا قاب یک صفحهٔ دیگر می‌بینید، ابتدا آن را در یک زبانهٔ مستقل باز کنید.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
