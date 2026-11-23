import { BellRing, Check, CornerUpLeft, Flag, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { diffDays, fa, longDate, today } from "@/lib/jalali";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { TASK_KINDS } from "@/lib/utils";
import { useDialogs } from "./forms";
import { Badge, Button, IconButton, useUI } from "./ui";

interface Props {
  task: Task;
  /** روزی که فهرست برای آن نمایش داده می‌شود (برای نمایش «چند روز مانده») */
  viewDate?: string;
}

export function TaskItem({ task, viewDate }: Props) {
  const { setTaskStatus, postponeTask, removeTask } = useStore();
  const ui = useUI();
  const dialogs = useDialogs();
  const now = today();
  const ref = viewDate ?? now;
  const pending = task.status === "pending";
  const overdueDays = pending && task.date < now ? diffDays(task.date, now) : 0;
  const daysLeft = task.date > ref ? diffDays(ref, task.date) : 0;

  const remove = async () => {
    const ok = await ui.confirm({
      title: "حذف کار",
      message: `«${task.title}» حذف شود؟`,
      confirmLabel: "حذف",
      danger: true,
    });
    if (ok) {
      removeTask(task.id);
      ui.toast("کار حذف شد");
    }
  };

  const postpone = () => {
    const next = postponeTask(task.id);
    if (next) ui.toast(`به ${longDate(next)} موکول شد`);
  };

  const details = [
    task.assigner && `از طرف ${task.assigner}`,
    task.target && `مقصد: ${task.target}`,
    task.letterNo && `نامهٔ ${fa(task.letterNo)}`,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "rounded-xl border border-line bg-surface p-3",
        task.important && pending && "border-s-4 border-s-bad",
        !pending && "bg-paper/60"
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold leading-6", task.status === "cancelled" && "text-muted line-through")}>
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {task.status === "done" && (
              <Badge tone="ok">
                <Check aria-hidden="true" />
                انجام شد
              </Badge>
            )}
            {task.status === "cancelled" && <Badge>منتفی شد</Badge>}
            {overdueDays > 0 && <Badge tone="bad">{fa(overdueDays)} روز عقب‌افتاده</Badge>}
            {pending && daysLeft > 0 && viewDate && (
              <Badge tone="warn">
                <BellRing aria-hidden="true" />
                یادآوری؛ {fa(daysLeft)} روز مانده
              </Badge>
            )}
            {task.important && (
              <Badge tone="bad">
                <Flag aria-hidden="true" />
                مهم
              </Badge>
            )}
            <Badge tone="brand">{TASK_KINDS[task.kind]}</Badge>
            <span className="num">{fa(task.date)}</span>
            {task.postponed > 0 && <span>· {fa(task.postponed)} بار موکول شده</span>}
          </div>
          {details.length > 0 && <p className="mt-1 text-xs text-muted">{details.join(" · ")}</p>}
          {task.note && <p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted">{task.note}</p>}
        </div>
        <IconButton label={`ویرایش ${task.title}`} onClick={() => dialogs.open({ type: "task", id: task.id })}>
          <Pencil />
        </IconButton>
        <IconButton label={`حذف ${task.title}`} tone="danger" onClick={remove}>
          <Trash2 />
        </IconButton>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pending ? (
          <>
            <Button
              size="sm"
              variant="ok"
              onClick={() => {
                setTaskStatus(task.id, "done");
                ui.toast("انجام شد ✓");
              }}
            >
              <Check className="size-4" aria-hidden="true" />
              انجام شد
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTaskStatus(task.id, "cancelled");
                ui.toast("منتفی شد");
              }}
            >
              <X className="size-4" aria-hidden="true" />
              منتفی شد
            </Button>
            <Button size="sm" onClick={postpone}>
              <CornerUpLeft className="size-4" aria-hidden="true" />
              موکول به فردا
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setTaskStatus(task.id, "pending")}>
            <RotateCcw className="size-4" aria-hidden="true" />
            برگرداندن به «در انتظار»
          </Button>
        )}
      </div>
    </li>
  );
}
