import { STORAGE_KEY, THRESHOLDS, parseDateTime, addThreeMonths, toISODateTime, MONTHS, getDataRows, formatCountdown } from "../helpers.js";
import { applyColumnSorting } from "./sort.js";
import { createOverlay, resolveProductUrl, fetchDateFromProduct } from "./fetch.js";
import { t, LANG, translateAvailableFrom, translateComingSoon } from "../i18n.js";

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const DATA_INSERT = "data-pixelatoy-insert";
const PLACEHOLDER = () => t("placeholder");
const TOOLTIP_FORMATS = () => t("tooltip_formats");
const TOOLTIP_ERROR = () => t("tooltip_error");

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

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

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function cleanText(value) {
  return value.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function colorRowByDate(row, date) {
  row.style.background = "";
  row.style.color = "";
  if (!date) return;
  const diffDays = (date - new Date()) / (1000 * 60 * 60 * 24);
  const { bg, color } = THRESHOLDS.find(t => diffDays < t.days);
  row.style.background = bg;
  row.style.color = color;
}

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
    row.style.background = "";
    row.style.color = "";
  } else if (availableFrom) {
    cell.setAttribute("data-limit-date", availableFromDate ?? "");
    cell.setAttribute("data-available-from", "1");
    cell.textContent = availableFrom;
    cell.style.cssText = "color:#888;font-style:italic;font-size:0.9em;";
    row.style.background = "";
    row.style.color = "";
  } else {
    cell.setAttribute("data-limit-date", "");
    cell.textContent = "";
    cell.style.cssText = "";
    row.style.background = "";
    row.style.color = "";
  }
}

export function getRowKey(row) {
  const cell = row.children[COLUMN_INDEX_KEY];
  return cell?.querySelector("a.pixelatoy-link")?.textContent.trim() || cell?.textContent.trim();
}

function addBrokenLinkWarning(cell) {
  if (!cell || cell.querySelector("span[title]")) return;
  const warn = document.createElement("span");
  warn.textContent = " ⛓️‍💥";
  warn.title = t("broken_link_tooltip");
  warn.style.cursor = "help";
  cell.appendChild(warn);
}

export function linkifyProductName(cell, url, brokenLink) {
  if (!cell || cell.querySelector("a.pixelatoy-link")) return;
  const text = cell.textContent.trim();
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.className = "pixelatoy-link";
  a.textContent = text;
  cell.textContent = "";
  cell.appendChild(a);
  if (brokenLink) addBrokenLinkWarning(cell);
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getStoredDate(entry) {
  if (!entry) return "";
  return entry.date || "";
}

function getRowImg(row) {
  const img = row.querySelector("td img");
  return img ? img.src : "";
}

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

// ─── Celda editable ───────────────────────────────────────────────────────────

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

// ─── Auto-fetch fecha desde detalle del producto ─────────────────────────────

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
    // fallo silencioso
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

// ─── Columna principal ────────────────────────────────────────────────────────

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
