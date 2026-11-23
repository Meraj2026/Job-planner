/** ابزارهای تقویم هجری شمسی */

export const MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const i = Math.trunc;

export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 + 365 * gy + i((gy2 + 3) / 4) - i((gy2 + 99) / 100) + i((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * i(days / 12053);
  days %= 12053;
  jy += 4 * i(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += i((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + i(days / 31) : 7 + i((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function toGregorian(jy0: number, jm: number, jd: number): [number, number, number] {
  const jy = jy0 + 1595;
  let days =
    -355668 + 365 * jy + i(jy / 33) * 8 + i(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * i(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * i(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * i(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += i((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  for (; gm <= 12 && gd > sal[gm]; gm++) gd -= sal[gm];
  return [gy, gm, gd];
}

const pad = (n: number) => String(n).padStart(2, "0");
const DAY = 86400000;

export interface YM {
  y: number;
  m: number;
}

export const fmt = (y: number, m: number, d: number) => `${y}/${pad(m)}/${pad(d)}`;

export function parse(s: string) {
  const [y, m, d] = s.split("/").map(Number);
  return { y, m, d };
}

export const isDateStr = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}\/\d{2}\/\d{2}$/.test(s);

function toUTC(s: string) {
  const { y, m, d } = parse(s);
  const [gy, gm, gd] = toGregorian(y, m, d);
  return Date.UTC(gy, gm - 1, gd);
}

function fromUTC(ms: number) {
  const dt = new Date(ms);
  const [y, m, d] = toJalali(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  return fmt(y, m, d);
}

export function today() {
  const n = new Date();
  const [y, m, d] = toJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  return fmt(y, m, d);
}

export const addDays = (s: string, n: number) => fromUTC(toUTC(s) + n * DAY);
export const diffDays = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / DAY);

/** روز هفته: ۰ = شنبه … ۶ = جمعه */
export const weekday = (s: string) => (new Date(toUTC(s)).getUTCDay() + 1) % 7;

export function isLeap(y: number) {
  const [gy, gm, gd] = toGregorian(y, 12, 30);
  return toJalali(gy, gm, gd)[1] === 12;
}

export function monthLength(y: number, m: number) {
  if (m <= 6) return 31;
  if (m <= 11) return 30;
  return isLeap(y) ? 30 : 29;
}

export const ymOf = (s: string): YM => {
  const p = parse(s);
  return { y: p.y, m: p.m };
};
export const monthStart = (v: YM) => fmt(v.y, v.m, 1);
export const monthEnd = (v: YM) => fmt(v.y, v.m, monthLength(v.y, v.m));
export const shiftMonth = (v: YM, n: number): YM => {
  const t = v.y * 12 + (v.m - 1) + n;
  return { y: Math.floor(t / 12), m: (t % 12) + 1 };
};

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل رقم‌های لاتین به فارسی */
export const fa = (v: string | number) => String(v).replace(/\d/g, (d) => FA[+d]);

/** تبدیل رقم‌های فارسی/عربی به لاتین */
export const en = (v: string) =>
  v.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));

export function longDate(s: string) {
  const { y, m, d } = parse(s);
  return `${WEEKDAYS[weekday(s)]} ${fa(d)} ${MONTHS[m - 1]} ${fa(y)}`;
}

export function gregorianLabel(s: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(toUTC(s)));
  } catch {
    return "";
  }
}
