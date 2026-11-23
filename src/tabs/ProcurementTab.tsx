import { useMemo, useState } from "react";
import { HandHelping, Pencil, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { fa } from "@/lib/jalali";
import { useStore } from "@/lib/store";
import type { Delivery, Purchase } from "@/lib/types";
import { faNum, uniq } from "@/lib/utils";
import { useMedia, useRemovers } from "@/components/actions";
import { useDialogs } from "@/components/forms";
import { Badge, Button, Empty, IconButton, Modal, Segmented, inputCls } from "@/components/ui";

type Filter = "all" | "open" | "done";

interface Item {
  p: Purchase;
  ds: Delivery[];
  delivered: number;
  remaining: number;
}

function Status({ item }: { item: Item }) {
  if (item.remaining <= 0) return <Badge tone="ok">تحویل کامل</Badge>;
  if (item.delivered > 0)
    return (
      <Badge tone="warn">
        {faNum(item.remaining)} {item.p.unit} مانده
      </Badge>
    );
  return <Badge>تحویل نشده</Badge>;
}

function Progress({ item }: { item: Item }) {
  const pct = item.p.qty > 0 ? Math.min(100, (item.delivered / item.p.qty) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden="true">
      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-ok" : "bg-amber-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Detail({ item, onRemoved }: { item: Item; onRemoved: () => void }) {
  const { data } = useStore();
  const dialogs = useDialogs();
  const remove = useRemovers();
  const { p, ds } = item;
  const facts: [string, string][] = [
    ["تاریخ خرید", fa(p.date)],
    ["مقدار", `${faNum(p.qty)} ${p.unit}`],
    ["مبلغ کل", p.amount ? `${faNum(p.amount)} ${data.settings.currency}` : "—"],
    ["فروشنده", p.seller || "—"],
    ["شمارهٔ فاکتور", p.invoice ? fa(p.invoice) : "—"],
  ];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-7">{p.title}</h3>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            <Badge tone="brand">{p.kind === "goods" ? "کالا" : "خدمت"}</Badge>
            <Status item={item} />
          </div>
        </div>
        <IconButton label="ویرایش خرید" onClick={() => dialogs.open({ type: "purchase", id: p.id })}>
          <Pencil />
        </IconButton>
        <IconButton
          label="حذف خرید"
          tone="danger"
          onClick={async () => {
            if (await remove.purchase(p)) onRemoved();
          }}
        >
          <Trash2 />
        </IconButton>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-paper p-3 text-sm sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="truncate font-medium" title={v}>
              {v}
            </dd>
          </div>
        ))}
        {p.note && (
          <div className="col-span-full">
            <dt className="text-xs text-muted">توضیح</dt>
            <dd className="whitespace-pre-line">{p.note}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <h4 className="flex-1 text-sm font-bold">
          تحویل به همکاران
          <span className="ms-2 text-xs font-normal text-muted">
            {faNum(item.delivered)} از {faNum(p.qty)} {p.unit}
          </span>
        </h4>
        {item.remaining > 0 && (
          <Button size="sm" variant="primary" onClick={() => dialogs.open({ type: "delivery", purchaseId: p.id })}>
            <HandHelping className="size-4" aria-hidden="true" />
            ثبت تحویل
          </Button>
        )}
      </div>
      <div className="mt-2">
        <Progress item={item} />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {ds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-muted">
            هنوز چیزی از این خرید تحویل نشده است.
          </p>
        ) : (
          <ul className="space-y-2">
            {ds.map((d) => (
              <li key={d.id} className="flex items-center gap-1 rounded-xl border border-line p-2 ps-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.recipient}</p>
                  <p className="truncate text-xs text-muted">
                    {faNum(d.qty)} {p.unit} · <span className="num">{fa(d.date)}</span>
                    {d.note && ` · ${d.note}`}
                  </p>
                </div>
                <IconButton label={`ویرایش تحویل به ${d.recipient}`} onClick={() => dialogs.open({ type: "delivery", id: d.id })}>
                  <Pencil />
                </IconButton>
                <IconButton label={`حذف تحویل به ${d.recipient}`} tone="danger" onClick={() => remove.delivery(d, p.unit)}>
                  <Trash2 />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function ProcurementTab() {
  const { data } = useStore();
  const dialogs = useDialogs();
  const desktop = useMedia("(min-width: 1024px)");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);

  const items = useMemo<Item[]>(
    () =>
      data.purchases
        .map((p) => {
          const ds = data.deliveries.filter((d) => d.purchaseId === p.id).sort((a, b) => b.date.localeCompare(a.date));
          const delivered = ds.reduce((s, d) => s + d.qty, 0);
          return { p, ds, delivered, remaining: Math.round((p.qty - delivered) * 100) / 100 };
        })
        .sort((a, b) => b.p.date.localeCompare(a.p.date)),
    [data.purchases, data.deliveries]
  );

  const query = q.trim().toLowerCase();
  const filtered = items.filter((it) => {
    if (filter === "open" && it.remaining <= 0) return false;
    if (filter === "done" && it.remaining > 0) return false;
    if (!query) return true;
    return [it.p.title, it.p.seller, it.p.invoice, it.p.note, ...it.ds.map((d) => d.recipient)]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const total = filtered.reduce((s, it) => s + it.p.amount, 0);
  const selected = items.find((it) => it.p.id === selId) ?? null;
  const shown = selected ?? (desktop ? (filtered[0] ?? null) : null);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          label="وضعیت تحویل"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "همه" },
            { value: "open", label: "مانده", count: items.filter((i) => i.remaining > 0).length },
            { value: "done", label: "تحویل‌شده" },
          ]}
        />
        <label className="relative order-last min-w-0 flex-1 basis-40 sm:order-none sm:w-72 sm:flex-none sm:basis-auto">
          <span className="sr-only">جستجو در خریدها و تحویل‌گیرندگان</span>
          <Search className="pointer-events-none absolute start-3 top-3 size-4 text-muted" aria-hidden="true" />
          <input
            type="search"
            className={cn(inputCls, "ps-9")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی کالا یا تحویل‌گیرنده"
          />
        </label>
        <div className="flex-1 max-sm:hidden" />
        <Button className="max-sm:ms-auto" onClick={() => dialogs.open({ type: "delivery" })}>
          <HandHelping className="size-4" aria-hidden="true" />
          ثبت تحویل
        </Button>
        <Button className="order-last sm:order-none" variant="primary" onClick={() => dialogs.open({ type: "purchase" })}>
          <Plus className="size-4" aria-hidden="true" />
          ثبت خرید
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <section
          aria-label="فهرست خریدها"
          className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-line bg-surface lg:flex-[5]"
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-xs text-muted sm:px-4">
            <h2 className="flex-1 text-sm font-bold text-ink">خریدها</h2>
            <span>{fa(filtered.length)} مورد</span>
            {total > 0 && (
              <span>
                · جمع {faNum(total)} {data.settings.currency}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
            {filtered.length === 0 ? (
              <Empty
                icon={<ShoppingBag />}
                title={items.length ? "موردی با این شرایط پیدا نشد" : "هنوز خریدی ثبت نشده است"}
                hint={
                  items.length
                    ? "عبارت جستجو یا وضعیت تحویل را تغییر دهید."
                    : "کالا یا خدمتی را که برای شرکت خریده‌اید ثبت کنید تا هنگام تحویل به همکاران، گیرندهٔ آن مشخص بماند."
                }
                action={
                  !items.length && (
                    <Button variant="primary" onClick={() => dialogs.open({ type: "purchase" })}>
                      <Plus className="size-4" aria-hidden="true" />
                      ثبت اولین خرید
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="space-y-2">
                {filtered.map((it) => {
                  const names = uniq(it.ds.map((d) => d.recipient));
                  const active = shown?.p.id === it.p.id && desktop;
                  return (
                    <li key={it.p.id}>
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => setSelId(it.p.id)}
                        className={cn(
                          "block w-full rounded-xl border p-3 text-start transition-colors",
                          active ? "border-brand bg-brand-soft/50" : "border-line hover:bg-paper"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{it.p.title}</p>
                          <Status item={it} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          <span className="num">{fa(it.p.date)}</span> · {faNum(it.p.qty)} {it.p.unit}
                          {it.p.amount > 0 && ` · ${faNum(it.p.amount)} ${data.settings.currency}`}
                        </p>
                        <div className="mt-2">
                          <Progress item={it} />
                        </div>
                        {names.length > 0 && (
                          <p className="mt-1.5 truncate text-xs text-muted">
                            تحویل به: <span className="text-ink">{names.join("، ")}</span>
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {desktop && (
          <section
            aria-label="جزئیات خرید و تحویل"
            className="flex min-h-0 min-w-0 flex-[4] flex-col rounded-2xl border border-line bg-surface p-4"
          >
            {shown ? (
              <Detail key={shown.p.id} item={shown} onRemoved={() => setSelId(null)} />
            ) : (
              <Empty icon={<HandHelping />} title="جزئیات خرید" hint="با انتخاب هر خرید، مشخصات و تحویل‌گیرندگان آن اینجا دیده می‌شود." />
            )}
          </section>
        )}
      </div>

      {!desktop && selected && (
        <Modal title="جزئیات خرید و تحویل" size="lg" onClose={() => setSelId(null)}>
          <Detail item={selected} onRemoved={() => setSelId(null)} />
        </Modal>
      )}
    </div>
  );
}
