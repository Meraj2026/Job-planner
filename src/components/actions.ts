import { useSyncExternalStore } from "react";
import { fa, longDate } from "@/lib/jalali";
import { useStore } from "@/lib/store";
import type { Delivery, Purchase } from "@/lib/types";
import { faNum } from "@/lib/utils";
import { useUI } from "./ui";

/** حذف با تأیید — مشترک بین تب‌ها */
export function useRemovers() {
  const { data, removeAttendance, removePurchase, removeDelivery } = useStore();
  const ui = useUI();
  return {
    attendance: async (date: string) => {
      const ok = await ui.confirm({
        title: "حذف ورود و خروج",
        message: `ثبت ورود و خروج ${longDate(date)} حذف شود؟`,
        confirmLabel: "حذف",
        danger: true,
      });
      if (ok) {
        removeAttendance(date);
        ui.toast("ورود و خروج حذف شد");
      }
      return ok;
    },
    purchase: async (p: Purchase) => {
      const n = data.deliveries.filter((d) => d.purchaseId === p.id).length;
      const ok = await ui.confirm({
        title: "حذف خرید",
        message: n
          ? `«${p.title}» به همراه ${fa(n)} تحویلِ ثبت‌شده برای آن حذف شود؟`
          : `«${p.title}» حذف شود؟`,
        confirmLabel: "حذف",
        danger: true,
      });
      if (ok) {
        removePurchase(p.id);
        ui.toast("خرید حذف شد");
      }
      return ok;
    },
    delivery: async (d: Delivery, unit: string) => {
      const ok = await ui.confirm({
        title: "حذف تحویل",
        message: `تحویل ${faNum(d.qty)} ${unit} به ${d.recipient} حذف شود؟`,
        confirmLabel: "حذف",
        danger: true,
      });
      if (ok) {
        removeDelivery(d.id);
        ui.toast("تحویل حذف شد");
      }
      return ok;
    },
  };
}

export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches
  );
}
