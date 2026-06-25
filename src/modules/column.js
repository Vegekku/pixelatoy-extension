/**
 * @module modules/column
 * @description Core module: adds the custom "In warehouse" column to the preorder table,
 * handles editable date cells, auto-fetches missing product data, and manages
 * row colouring based on urgency thresholds.
 */

import { STORAGE_KEY, THRESHOLDS, parseDateTime, addThreeMonths, toISODateTime, MONTHS, getDataRows, formatCountdown } from "../helpers.js";
import { applyColumnSorting } from "./sort.js";
import { createOverlay, resolveProductUrl, fetchDateFromProduct } from "./fetch.js";
import { t, LANG, translateAvailableFrom, translateComingSoon } from "../i18n.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const DATA_INSERT = "data-pixelatoy-insert";
const PLACEHOLDER = () => t("placeholder");
const TOOLTIP_FORMATS = () => t("tooltip_formats");
const TOOLTIP_ERROR = () => t("tooltip_error");

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Parses natural-language date strings like "15 marzo 2024" or "March 15, 2024".
 * @param {string} dateStr
 * @returns {Date|null}
 */
function parseNaturalDate(dateStr) {
  const matchDD = dateStr.match(/^(\d{1,2})\s+([a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+)\s+(\d{4})$/i);
  if (matchDD) {
    const [, dd, monthName, yyyy] = matchDD;
    const mm = MONTHS[monthName.toLowerCase()];
    if (!mm) return null;
    return new Date(Number(yyyy), mm - 1, Number(dd));
  }

  const matchEN = dateStr.match(/^([a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+)\s+(\d{1,2})\s*,?\s*(\d{4})$/i);
  if (matchEN) {
    const [, monthName, dd, yyyy] = matchEN;
    const mm = MONTHS[monthName.toLowerCase()];
    if (!mm) return null;
    return new Date(Number(yyyy), mm - 1, Number(dd));
  }

  return null;
}

/**
 * Normalises user input into `YYYY-MM-DD HH:MM` format.
 * Accepts: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, natural dates (ES/EN), with optional time.
 * @param {string} value - Raw user input.
 * @returns {string} Normalised date string or original value if unrecognised.
 */
export function normalizeDateTime(value) {
  const withTime = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (withTime) {
    const [, dd, mm, yyyy, hh, min] = withTime;
    if (dd > 31 || mm > 12 || hh > 23 || min > 59) return value;
    return toISODateTime(yyyy, mm, dd, hh, min);
  }

  const dateOnly = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dateOnly) {
    const [, dd, mm, yyyy] = dateOnly;
    if (dd > 31 || mm > 12) return value;
    return toISODateTime(yyyy, mm, dd);
  }

  const isoOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoOnly) {
    const [, yyyy, mm, dd] = isoOnly;
    if (dd > 31 || mm > 12) return value;
    return toISODateTime(yyyy, mm, dd);
  }

  const naturalMatch =
    value.match(/^\d{1,2}\s+[a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+\s+\d{4}(?:\s+\d{1,2}:\d{2})?$/i) ||
    value.match(/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+\s+\d{1,2}\s*,?\s*\d{4}(?:\s+\d{1,2}:\d{2})?$/i);
  if (naturalMatch) {
    const timeMatch = value.match(/(\d{1,2}):(\d{2})$/);
    const datePart = timeMatch ? value.replace(timeMatch[0], "").trim() : value;
    const parsed = parseNaturalDate(datePart);
    if (!parsed) return value;
    return toISODateTime(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
      timeMatch ? timeMatch[1] : "00",
      timeMatch ? timeMatch[2] : "00"
    );
  }

  return value;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function cleanText(value) {
  return value.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

/** All urgency CSS classes used on rows. */
const URGENCY_CLASSES = THRESHOLDS.map(t => t.className);

/**
 * Applies urgency CSS class to a row based on its limit date.
 * @param {HTMLTableRowElement} row
 * @param {Date|null} date - The limit date.
 */
function colorRowByDate(row, date) {
  row.classList.remove(...URGENCY_CLASSES);
  if (!date) return;
  const diffDays = (date - new Date()) / (1000 * 60 * 60 * 24);
  const { className } = THRESHOLDS.find(t => diffDays < t.days);
  row.classList.add(className);
}

/**
 * Updates the custom cell content and row colour.
 * Handles 4 states: has limit date, coming soon, available from, or empty.
 * @param {HTMLTableCellElement} cell
 * @param {HTMLTableRowElement} row
 * @param {string|null} limitDate
 * @param {string|null} [availableFrom]
 * @param {string|null} [availableFromDate]
 * @param {string|null} [comingSoon]
 */
export function updateCell(cell, row, limitDate, availableFrom, availableFromDate, comingSoon) {
  if (limitDate) {
    cell.setAttribute("data-limit-date", limitDate);
    cell.removeAttribute("data-available-from");
    cell.textContent = formatCountdown(limitDate);
    cell.style.cssText = "";
    colorRowByDate(row, parseDateTime(limitDate));
  } else if (comingSoon) {
    cell.setAttribute("data-limit-date", "");
    cell.removeAttribute("data-available-from");
    cell.textContent = translateComingSoon(comingSoon);
    cell.style.cssText = "color:#888;font-style:italic;font-size:0.9em;";
    row.classList.remove(...URGENCY_CLASSES);
  } else if (availableFrom) {
    cell.setAttribute("data-limit-date", availableFromDate ?? "");
    cell.setAttribute("data-available-from", "1");
    cell.textContent = availableFrom;
    cell.style.cssText = "color:#888;font-style:italic;font-size:0.9em;";
    row.classList.remove(...URGENCY_CLASSES);
  } else {
    cell.setAttribute("data-limit-date", "");
    cell.textContent = "";
    cell.style.cssText = "";
    row.classList.remove(...URGENCY_CLASSES);
  }
}

/**
 * Extracts the product name from a row (used as storage key).
 * @param {HTMLTableRowElement} row
 * @returns {string}
 */
export function getRowKey(row) {
  const cell = row.children[COLUMN_INDEX_KEY];
  return cell?.querySelector("a[data-pixelatoy-link]")?.textContent.trim() || cell?.textContent.trim();
}

function addBrokenLinkWarning(cell) {
  if (!cell || cell.querySelector("span[title]")) return;
  const warn = document.createElement("span");
  warn.textContent = " \u26D3\uFE0F\u200D\uD83D\uDCA5";
  warn.title = t("broken_link_tooltip");
  warn.style.cursor = "help";
  cell.appendChild(warn);
}

/**
 * Wraps the product name cell text in a link to the product page.
 * @param {HTMLTableCellElement} cell
 * @param {string} url
 * @param {boolean} [brokenLink=false]
 */
export function linkifyProductName(cell, url, brokenLink) {
  if (!cell || cell.querySelector("a[data-pixelatoy-link]")) return;
  const text = cell.textContent.trim();
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.setAttribute("data-pixelatoy-link", "");
  a.textContent = text;
  cell.textContent = "";
  cell.appendChild(a);
  if (brokenLink) addBrokenLinkWarning(cell);
}

// ─── Storage ──────────────────────────────────────────────────────────────────

/**
 * Returns the stored entry date or empty string.
 * @param {Object|null} entry
 * @returns {string}
 */
export function getStoredDate(entry) {
  if (!entry) return "";
  return entry.date || "";
}

function getRowImg(row) {
  const img = row.querySelector("td img");
  return img ? img.src : "";
}

/**
 * Persists product fields to chrome.storage.local.
 * Pass `fields = null` to delete the entry.
 * @param {string} key - Product name.
 * @param {Object|null} fields - Fields to merge, or null to delete.
 * @param {HTMLTableRowElement} row
 */
export function saveToStorage(key, fields, row) {
  try {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      const data = res[STORAGE_KEY] || {};
      if (fields === null) {
        delete data[key];
      } else {
        data[key] = { ...data[key], ...fields, img: (fields.img || (data[key] && data[key].img) || getRowImg(row)) };
      }
      chrome.storage.local.set({ [STORAGE_KEY]: data });
    });
  } catch (e) {
    console.warn("Pixelatoy: contexto de extensión invalidado, recarga la página.");
  }
}

// ─── Editable cell ────────────────────────────────────────────────────────────

function createEditableCell(key, row) {
  const cell = document.createElement("td");
  cell.setAttribute(DATA_INSERT, "1");

  cell.addEventListener("click", () => {
    if (cell.getAttribute("data-editing") === "1") return;
    if (cell.getAttribute("data-fetching") === "1") return;
    cell.setAttribute("data-editing", "1");
    cell.contentEditable = "true";
    try {
      chrome.storage.local.get(STORAGE_KEY, (res) => {
        const stored = getStoredDate((res[STORAGE_KEY] || {})[key]);
        cell.textContent = stored;
        if (!stored) cell.setAttribute("data-placeholder", PLACEHOLDER());
        cell.title = TOOLTIP_FORMATS();
        cell.focus();
      });
    } catch (e) {
      cell.textContent = "";
      cell.setAttribute("data-placeholder", PLACEHOLDER());
      cell.focus();
    }
  });

  cell.addEventListener("input", () => {
    if (cell.textContent.trim()) cell.removeAttribute("data-placeholder");
    else cell.setAttribute("data-placeholder", PLACEHOLDER());
  });

  cell.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    document.execCommand("insertText", false, text);
  });

  cell.addEventListener("blur", () => {
    cell.removeAttribute("data-editing");
    cell.removeAttribute("data-placeholder");
    cell.contentEditable = "false";

    const value = normalizeDateTime(cleanText(cell.textContent));

    if (value && !parseDateTime(value)) {
      cell.style.outlineColor = "#d9534f";
      cell.title = TOOLTIP_ERROR();
      cell.contentEditable = "true";
      cell.setAttribute("data-editing", "1");
      cell.focus();
      return;
    }

    cell.style.outlineColor = "";
    cell.title = "";

    if (value) {
      saveToStorage(key, { date: value }, row);
    } else {
      saveToStorage(key, null, row);
    }
    updateCell(cell, row, value ? addThreeMonths(value) : null);
  });

  return cell;
}

// ─── Auto-fetch ───────────────────────────────────────────────────────────────

async function autoFetchRowData(row, key, cell, stored) {
  const hasDate = !!getStoredDate(stored);
  const hasUrl = !!(stored && stored.productUrl);
  if (hasDate && hasUrl) return;

  const needsDate = !hasDate && !stored?.brokenLink && (
    row.children[row.children.length - 2]?.querySelector("form") ||
    row.children[row.children.length - 2]?.textContent.trim() === t("not_available")
  );
  if (hasUrl && !needsDate && (stored?.availableFrom || stored?.comingSoon)) return;

  cell.setAttribute("data-fetching", "1");
  const overlayDiv = createOverlay(row);

  try {
    let productUrl = hasUrl ? stored.productUrl : null;

    if (!productUrl) {
      productUrl = await resolveProductUrl(row, key);
      if (productUrl) {
        saveToStorage(key, { productUrl }, row);
        linkifyProductName(row.children[COLUMN_INDEX_KEY], productUrl.replace(/\/(es|en)\//, `/${LANG}/`));
      }
    }

    if (needsDate && productUrl) {
      const { date, brokenLink, availableFrom, availableFromDate, comingSoon } = await fetchDateFromProduct(productUrl, normalizeDateTime);
      if (brokenLink) {
        saveToStorage(key, { brokenLink: true }, row);
        addBrokenLinkWarning(row.children[COLUMN_INDEX_KEY]);
      } else if (date) {
        saveToStorage(key, { date, brokenLink: false, availableFrom, availableFromDate, comingSoon: null }, row);
        updateCell(cell, row, addThreeMonths(date));
      } else if (comingSoon) {
        saveToStorage(key, { comingSoon, availableFrom, availableFromDate }, row);
        updateCell(cell, row, null, null, null, comingSoon);
      } else if (availableFrom) {
        saveToStorage(key, { availableFrom, availableFromDate }, row);
        updateCell(cell, row, null, translateAvailableFrom(availableFrom), availableFromDate);
      }
    }
  } catch (e) {
    // silent failure
  } finally {
    cell.removeAttribute("data-fetching");
    overlayDiv.remove();
  }
}

function autoFetchMissingData(storedTexts) {
  const table = document.getElementById("preorder_list");
  if (!table) return;
  getDataRows(table).forEach((row) => {
    const key = getRowKey(row);
    if (!key) return;
    const stored = storedTexts[key] || {};
    if (stored.productUrl && getStoredDate(stored)) return;
    const hasNonDateData = stored.availableFrom || stored.comingSoon;
    const rowHasForm = row.children[row.children.length - 2]?.querySelector("form");
    if (stored.productUrl && hasNonDateData && !rowHasForm) return;
    const cell = row.querySelector(`[${DATA_INSERT}]`);
    if (!cell) return;
    autoFetchRowData(row, key, cell, stored);
  });
}

// ─── Main column setup ────────────────────────────────────────────────────────

/**
 * Adds the custom column to the preorder table, restores stored data,
 * applies sorting, and triggers auto-fetch for missing data.
 */
export function applyCustomColumn() {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedTexts = result[STORAGE_KEY] || {};

    table.querySelectorAll("tr").forEach((row) => {
      const cells = row.children;
      if (cells.length <= COLUMN_INDEX_KEY) return;
      if (cells[INSERT_COLUMN_INDEX]?.hasAttribute(DATA_INSERT)) return;

      const isHeader = row.querySelectorAll("th").length > 0;
      const key = isHeader ? null : cells[COLUMN_INDEX_KEY].textContent.trim();

      if (isHeader) {
        const th = document.createElement("th");
        th.setAttribute(DATA_INSERT, "1");
        th.textContent = t("col_header");
        row.insertBefore(th, cells[INSERT_COLUMN_INDEX] || null);
        return;
      }

      const isNotAvailable = row.children[row.children.length - 2]?.textContent.trim() === t("not_available");
      const cell = isNotAvailable ? document.createElement("td") : createEditableCell(key, row);
      cell.setAttribute(DATA_INSERT, "1");
      const storedDate = getStoredDate(storedTexts[key]);
      const limitDate = addThreeMonths(storedDate);
      const { availableFrom, availableFromDate, comingSoon } = storedTexts[key] || {};
      updateCell(cell, row, limitDate, translateAvailableFrom(availableFrom), availableFromDate, comingSoon);

      if (storedTexts[key]?.productUrl) {
        linkifyProductName(cells[COLUMN_INDEX_KEY], storedTexts[key].productUrl.replace(/\/(es|en)\//, `/${LANG}/`), storedTexts[key].brokenLink);
      }

      row.insertBefore(cell, cells[INSERT_COLUMN_INDEX] || null);
    });

    applyColumnSorting();
    autoFetchMissingData(storedTexts);
  });
}

// ─── Countdown refresh ────────────────────────────────────────────────────────

/** Refreshes all countdown displays in the table (called every 60s). */
export function refreshCountdowns() {
  const table = document.getElementById("preorder_list");
  if (!table) return;
  table.querySelectorAll(`[${DATA_INSERT}]`).forEach((cell) => {
    if (cell.tagName === "TH" || cell.getAttribute("data-editing") === "1") return;
    const limitDate = cell.getAttribute("data-limit-date");
    if (!limitDate) return;
    if (cell.getAttribute("data-available-from") === "1") return;
    cell.textContent = formatCountdown(limitDate);
    colorRowByDate(cell.closest("tr"), parseDateTime(limitDate));
  });
}

export { COLUMN_INDEX_KEY, DATA_INSERT };
