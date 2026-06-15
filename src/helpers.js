export const STORAGE_KEY = "pixelatoyTexts";
export const PREORDER_URL = "https://www.pixelatoy.com/es/module/preorder/preorderorderdetails";

export const THRESHOLDS = [
  { days: 7,        label: "Menos de 7 días",   bg: "#000",    color: "#fff" },
  { days: 30,       label: "Menos de 30 días",  bg: "#d9534f", color: "#fff" },
  { days: 60,       label: "Menos de 60 días",  bg: "#f0ad4e", color: "#000" },
  { days: Infinity, label: "60 días o más",      bg: "#5cb85c", color: "#000" },
];

export const MONTHS = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

export function toISODateTime(yyyy, mm, dd, hh = "00", min = "00") {
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseDateTime(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
}

export function addThreeMonths(dateStr) {
  const date = parseDateTime(dateStr);
  if (!date) return null;
  date.setMonth(date.getMonth() + 3);
  return toISODateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes());
}
