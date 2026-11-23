import { useState } from "react";
import { ClipboardList, Plus, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import { fa, today } from "@/lib/jalali";
import { useStore } from "@/lib/store";
import type { Task, TaskKind } from "@/lib/types";
import { TASK_KINDS, tasksOn } from "@/lib/utils";
import { useDialogs } from "@/components/forms";
import { TaskItem } from "@/components/TaskItem";
import { Button, Empty, Segmented, inputCls } from "@/components/ui";

type Filter = "pending" | "today" | "done" | "cancelled" | "all";

interface Group {
  title: string;
  tone?: "bad";
  items: Task[];
  viewDate?: string;
}

const asc = (a: Task, b: Task) => a.date.localeCompare(b.date);
const desc = (a: Task, b: Task) => b.date.localeCompare(a.date);

export function TasksTab() {
  const { data } = useStore();
  const dialogs = useDialogs();
  const now = today();
  const [filter, setFilter] = useState<Filter>("pending");
  const [kind, setKind] = useState<"all" | TaskKind>("all");
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const base = data.tasks.filter((t) => {
    if (kind !== "all" && t.kind !== kind) return false;
    if (!query) return true;
    return [t.title, t.assigner, t.target, t.letterNo, t.note].join(" ").toLowerCase().includes(query);
  });

  const pendingAll = data.tasks.filter((t) => t.status === "pending");
  const todayAll = tasksOn(data.tasks, now, now);
  const todayCount =
    todayAll.overdue.length +
    todayAll.due.filter((t) => t.status === "pending").length +
    todayAll.reminders.filter((t) => t.status === "pending").length;

  let groups: Group[];
  if (filter === "pending") {
    const p = base.filter((t) => t.status === "pending").sort(asc);
    groups = [
      { title: "عقب‌افتاده", tone: "bad", items: p.filter((t) => t.date < now) },
      { title: "امروز", items: p.filter((t) => t.date === now) },
      { title: "روزهای آینده", items: p.filter((t) => t.date > now) },
    ];
  } else if (filter === "today") {
    const t = tasksOn(base, now, now);
    groups = [
      { title: "عقب‌افتاده", tone: "bad", items: t.overdue },
      { title: "موعد امروز", items: t.due },
      { title: "یادآوری کارهای مهمِ پیشِ رو", items: t.reminders, viewDate: now },
    ];
  } else if (filter === "all") {
    groups = [{ title: "", items: [...base].sort(desc) }];
  } else {
    groups = [{ title: "", items: base.filter((t) => t.status === filter).sort(desc) }];
  }
  groups = groups.filter((g) => g.items.length);
  const count = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          label="وضعیت کارها"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: "در انتظار", count: pendingAll.length },
            { value: "today", label: "امروز", count: todayCount },
            { value: "done", label: "انجام‌شده" },
            { value: "cancelled", label: "منتفی" },
            { value: "all", label: "همه" },
          ]}
        />
        <div className="order-last flex min-w-0 flex-1 basis-60 gap-2 md:order-none md:flex-none md:basis-auto">
          <label className="relative min-w-0 flex-1 md:w-56 md:flex-none">
            <span className="sr-only">جستجو در کارها</span>
            <Search className="pointer-events-none absolute start-3 top-3 size-4 text-muted" aria-hidden="true" />
            <input
              type="search"
              className={cn(inputCls, "ps-9")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در کارها"
            />
          </label>
          <select
            aria-label="نوع کار"
            className={cn(inputCls, "w-auto shrink-0 px-2")}
            value={kind}
            onChange={(e) => setKind(e.target.value as "all" | TaskKind)}
          >
            <option value="all">همهٔ انواع</option>
            {(Object.keys(TASK_KINDS) as TaskKind[]).map((k) => (
              <option key={k} value={k}>
                {TASK_KINDS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 max-md:hidden" />
        <Button
          className="order-last max-sm:w-10 max-sm:px-0 md:order-none"
          variant="primary"
          title="افزودن کار"
          onClick={() => dialogs.open({ type: "task" })}
        >
          <Plus className="size-4 max-sm:size-5" aria-hidden="true" />
          <span className="max-sm:sr-only">افزودن کار</span>
        </Button>
      </div>

      <section aria-label="فهرست کارها" className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface">
        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
          {count === 0 ? (
            <Empty
              icon={<ClipboardList />}
              title={
                data.tasks.length === 0
                  ? "هنوز کاری ثبت نشده است"
                  : filter === "pending"
                    ? "کار در انتظاری وجود ندارد"
                    : "کاری با این شرایط پیدا نشد"
              }
              hint={
                data.tasks.length === 0
                  ? "نامه‌هایی که باید برسانید یا کارهایی که به شما سپرده شده را اینجا ثبت کنید تا چیزی از قلم نیفتد."
                  : "وضعیت، نوع کار یا عبارت جستجو را تغییر دهید."
              }
              action={
                data.tasks.length === 0 && (
                  <Button variant="primary" onClick={() => dialogs.open({ type: "task" })}>
                    <Plus className="size-4" aria-hidden="true" />
                    افزودن اولین کار
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.title || "list"}>
                  {g.title && (
                    <h2 className={cn("mb-2 px-1 text-xs font-bold", g.tone === "bad" ? "text-bad" : "text-muted")}>
                      {g.title} <span className="font-normal">({fa(g.items.length)})</span>
                    </h2>
                  )}
                  <ul className="grid items-start gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                    {g.items.map((t) => (
                      <TaskItem key={t.id} task={t} viewDate={g.viewDate} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
