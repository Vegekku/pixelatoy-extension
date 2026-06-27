/**
 * @module helpers
 * @description Shared constants and pure utility functions used across the extension.
 */

import { t, LANG } from "./i18n.js";

/** Chrome storage key for all product data. */
export const STORAGE_KEY = "pixelatoyTexts";

/** Chrome storage key for extension configuration. */
export const CONFIG_KEY = "pixelatoyConfig";

/** Attribute added to cells and headers inserted by the extension. */
export const DATA_INSERT = "data-pixelatoy-insert";

/** URL of the preorder details page in the current language. */
export const PREORDER_URL = `https://www.pixelatoy.com/${LANG}/module/preorder/preorderorderdetails`;

/** Default configuration values. */
export const DEFAULT_CONFIG = {
  notifications: true,
  popup: true,
  tabs: true,
  thresholds: [7, 30, 60],
  colors: [
    { bg: "#000000", color: "#ffffff" },
    { bg: "#a94442", color: "#ffffff" },
    { bg: "#f0ad4e", color: "#000000" },
    { bg: "#5cb85c", color: "#000000" },
  ],
  defaultTab: "warehouse",
  instructionsOpen: false,
  lang: "en",
  schemaVersion: "0.0.0",
};

/**
 * Reads the extension config from storage, merged with defaults.
 * @returns {Promise<typeof DEFAULT_CONFIG>}
 */
export function getConfig() {
  return new Promise(resolve => {
    chrome.storage.local.get(CONFIG_KEY, res => {
      resolve({ ...DEFAULT_CONFIG, ...(res[CONFIG_KEY] || {}) });
    });
  });
}

/** Urgency thresholds with associated colours, CSS classes, and i18n keys. */
export const THRESHOLDS = [
  { days: 7,        labelKey: "threshold_7",   label: t("threshold_7"),   bg: "#000",    color: "#fff", className: "pixelatoy-urgency-critical" },
  { days: 30,       labelKey: "threshold_30",  label: t("threshold_30"),  bg: "#a94442", color: "#fff", className: "pixelatoy-urgency-high" },
  { days: 60,       labelKey: "threshold_60",  label: t("threshold_60"),  bg: "#f0ad4e", color: "#000", className: "pixelatoy-urgency-medium" },
  { days: Infinity, labelKey: "threshold_inf", label: t("threshold_inf"), bg: "#5cb85c", color: "#000", className: "pixelatoy-urgency-low" },
];

/** Map of month names (ES + EN) to 1-based month numbers. */
export const MONTHS = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

/**
 * Formats date components into `YYYY-MM-DD HH:MM`.
 * @param {string|number} yyyy
 * @param {string|number} mm
 * @param {string|number} dd
 * @param {string|number} [hh="00"]
 * @param {string|number} [min="00"]
 * @returns {string}
 */
export function toISODateTime(yyyy, mm, dd, hh = "00", min = "00") {
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Parses a `YYYY-MM-DD HH:MM` string into a Date object.
 * @param {string|null|undefined} value
 * @returns {Date|null}
 */
export function parseDateTime(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
}

/**
 * Returns the limit date (entry + 3 months) as `YYYY-MM-DD HH:MM`.
 * @param {string|null} dateStr - Entry date in `YYYY-MM-DD HH:MM` format.
 * @returns {string|null}
 */
export function addThreeMonths(dateStr) {
  const date = parseDateTime(dateStr);
  if (!date) return null;
  date.setMonth(date.getMonth() + 3);
  return toISODateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes());
}

/**
 * Groups stored products by urgency threshold.
 * @param {Object} data - Storage object keyed by product name.
 * @param {typeof THRESHOLDS} [thresholds]
 * @returns {Array<Array<{name: string, img: string, limit: Date}>>}
 */
export function groupByThreshold(data, thresholds = THRESHOLDS) {
  const now = new Date();
  const groups = thresholds.map(() => []);
  for (const [name, entry] of Object.entries(data)) {
    const limit = parseDateTime(addThreeMonths(entry.date));
    if (!limit) continue;
    const diffDays = (limit - now) / (1000 * 60 * 60 * 24);
    for (let i = 0; i < thresholds.length; i++) {
      if (diffDays < thresholds[i].days) {
        groups[i].push({ name, img: entry.img || "", limit });
        break;
      }
    }
  }
  return groups;
}

/**
 * Returns a human-readable countdown string (`Xm Xd Xh Xmin`) or "Expired".
 * @param {string|null} dateStr - Limit date in `YYYY-MM-DD HH:MM` format.
 * @returns {string}
 */
export function formatCountdown(dateStr) {
  const date = parseDateTime(dateStr);
  if (!date) return "";
  const diffMs = date - new Date();
  if (diffMs <= 0) return t("expired");
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const months = Math.floor(totalMinutes / (60 * 24 * 30));
  const days = Math.floor((totalMinutes % (60 * 24 * 30)) / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${months}m ${days}d ${hours}h ${minutes}min`;
}

/**
 * Returns all data rows (non-header) from a table element.
 * @param {HTMLTableElement} table
 * @returns {HTMLTableRowElement[]}
 */
export function getDataRows(table) {
  return Array.from(table.querySelectorAll("tr")).filter(r => r.querySelectorAll("th").length === 0);
}
