/**
 * @module modules/column
 * @description Core module: adds the custom "In warehouse" column to the preorder table,
 * handles editable date cells, auto-fetches missing product data, and manages
 * row colouring based on urgency thresholds.
 */

import { STORAGE_KEY, DATA_INSERT, DEFAULT_CONFIG, THRESHOLDS, parseDateTime, addThreeMonths, getDataRows, formatCountdown, normalizeDateTime } from "../shared/helpers.js";
import { applyColumnSorting } from "./sort.js";
import { createOverlay, resolveProductUrl, fetchDateFromProduct } from "./fetch.js";
import { t, LANG, thresholdLabel, translateAvailableFrom, translateComingSoon } from "../shared/i18n.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const PLACEHOLDER = () => t("placeholder");
const TOOLTIP_FORMATS = () => t("tooltip_formats");
const TOOLTIP_ERROR = () => t("tooltip_error");

// ─── UI helpers ───────────────────────────────────────────────────────────────

function cleanText(value) {
  return value.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

/** All urgency CSS classes used on rows. */
const URGENCY_CLASSES = THRESHOLDS.map(t => t.className);

/**
 * Builds a thresholds array merged with config colors/days.
 * @param {typeof DEFAULT_CONFIG} [config]
 * @returns {typeof THRESHOLDS}
 */
export function buildThresholds(config) {
  if (!config) return THRESHOLDS;
  const built = THRESHOLDS.map((th, i) => ({
    ...th,
    days: i < 3 ? (config.thresholds[i] ?? th.days) : th.days,
    bg: config.colors[i]?.bg ?? th.bg,
    color: config.colors[i]?.color ?? th.color,
  }));
  // Regenerate labels based on configured days
  built.forEach((th, i) => {
    th.label = thresholdLabel(th.days, i > 0 ? built[i - 1].days : null);
  });
  return built;
}

/** Active thresholds (set by applyCustomColumn, used by refreshCountdowns). */
let activeThresholds = THRESHOLDS;

/**
 * Applies urgency CSS class to a row based on its limit date.
 * @param {HTMLTableRowElement} row
 * @param {Date|null} date - The limit date.
 * @param {typeof THRESHOLDS} [thresholds]
 */
function colorRowByDate(row, date, thresholds = activeThresholds) {
  row.classList.remove(...URGENCY_CLASSES);
  if (!date) return;
  const diffDays = (date - new Date()) / (1000 * 60 * 60 * 24);
  const { className, bg, color } = thresholds.find(t => diffDays < t.days);
  row.classList.add(className);
  row.style.setProperty("--urgency-bg", bg);
  row.style.setProperty("--urgency-color", color);
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
 * @param {typeof THRESHOLDS} [thresholds]
 */
export function updateCell(cell, row, limitDate, availableFrom, availableFromDate, comingSoon, thresholds = THRESHOLDS) {
  if (limitDate) {
    cell.setAttribute("data-limit-date", limitDate);
    cell.removeAttribute("data-available-from");
    cell.textContent = formatCountdown(limitDate);
    cell.style.cssText = "";
    colorRowByDate(row, parseDateTime(limitDate), thresholds);
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
  if (!cell || cell.querySelector(".fa-chain-broken")) return;
  const icon = document.createElement("i");
  icon.className = "fa fa-chain-broken";
  icon.title = t("broken_link_tooltip");
  icon.style.cssText = "margin-left:4px;font-size:0.85em;color:#a94442;cursor:help;";
  cell.appendChild(icon);
}

export function addResolvedLinkIcon(cell) {
  if (!cell || cell.querySelector("i.fa-random")) return;
  const icon = document.createElement("i");
  icon.className = "fa fa-random";
  icon.title = t("resolved_link_tooltip");
  icon.style.cssText = "margin-left:4px;font-size:0.85em;color:#888;cursor:help;";
  cell.appendChild(icon);
}

/**
 * Wraps the product name cell text in a link to the product page.
 * @param {HTMLTableCellElement} cell
 * @param {string} url
 * @param {boolean} [brokenLink=false]
 */
export function linkifyProductName(cell, url, brokenLink) {
  if (!cell) return;
  const existing = cell.querySelector("[data-pixelatoy-link]");
  if (existing) {
    if (brokenLink) return;
    if (existing.tagName === "A" && existing.href === url) return;
    existing.remove();
    cell.querySelector(".fa-chain-broken")?.remove();
    cell.querySelector(".fa-random")?.remove();
  }
  const text = existing?.textContent.trim() || cell.textContent.trim();
  cell.textContent = "";
  if (!brokenLink) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.setAttribute("data-pixelatoy-link", "");
    a.textContent = text;
    cell.appendChild(a);
  } else {
    const span = document.createElement("span");
    span.setAttribute("data-pixelatoy-link", "");
    span.textContent = text;
    cell.appendChild(span);
    addBrokenLinkWarning(cell);
  }
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

/**
 * Returns the actions cell of a row by looking for a form or "not_available" text,
 * regardless of column position (safe to call after the custom column is inserted).
 * @param {HTMLTableRowElement} row
 * @returns {HTMLTableCellElement|null}
 */
function getActionsCell(row) {
  return Array.from(row.querySelectorAll("td")).find(
    td => td.querySelector("form") || td.textContent.trim() === t("not_available")
  ) ?? null;
}

async function autoFetchRowData(row, key, cell, stored) {
  const hasDate = !!getStoredDate(stored);
  const hasUrl = !!(stored && stored.productUrl);
  if (hasDate && hasUrl && !stored?.brokenLink) return;

  const actionsCell = getActionsCell(row);
  const rowHasAction = actionsCell?.querySelector("form") || actionsCell?.textContent.trim() === t("not_available");
  const needsDate = !hasDate && !stored?.brokenLink && rowHasAction;
  const needsResolve = stored?.brokenLink && hasUrl;

  if (hasUrl && !needsDate && !needsResolve && (stored?.availableFrom || stored?.comingSoon)) return;

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

    if ((needsDate || needsResolve) && productUrl) {
      const { date, brokenLink, resolvedUrl, availableFrom, availableFromDate, comingSoon } = await fetchDateFromProduct(productUrl);
      if (brokenLink) {
        saveToStorage(key, { brokenLink: true, resolvedUrl: resolvedUrl ?? null }, row);
        addBrokenLinkWarning(row.children[COLUMN_INDEX_KEY]);
      } else {
        const nameCell = row.children[COLUMN_INDEX_KEY];
        if (resolvedUrl) {
          linkifyProductName(nameCell, resolvedUrl.replace(/\/(es|en)\//, `/${LANG}/`));
          addResolvedLinkIcon(nameCell);
        }
        if (date) {
          saveToStorage(key, { date, brokenLink: false, resolvedUrl: resolvedUrl ?? null, availableFrom, availableFromDate, comingSoon: null }, row);
          updateCell(cell, row, addThreeMonths(date));
        } else if (comingSoon) {
          saveToStorage(key, { comingSoon, availableFrom, availableFromDate, brokenLink: false, resolvedUrl: resolvedUrl ?? null }, row);
          updateCell(cell, row, null, null, null, comingSoon);
        } else if (availableFrom) {
          saveToStorage(key, { availableFrom, availableFromDate, brokenLink: false, resolvedUrl: resolvedUrl ?? null }, row);
          updateCell(cell, row, null, translateAvailableFrom(availableFrom, availableFromDate), availableFromDate);
        } else {
          saveToStorage(key, { brokenLink: false, resolvedUrl: resolvedUrl ?? null }, row);
        }
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
    const rowHasForm = getActionsCell(row)?.querySelector("form");
    if (stored.productUrl && hasNonDateData && !rowHasForm && !stored.brokenLink) return;
    const cell = row.querySelector(`[${DATA_INSERT}]`);
    if (!cell) return;
    autoFetchRowData(row, key, cell, stored);
  });
}

// ─── Main column setup ────────────────────────────────────────────────────────

/**
 * Adds the custom column to the preorder table, restores stored data,
 * applies sorting, builds tabs, and triggers auto-fetch for missing data.
 * @param {typeof DEFAULT_CONFIG} [config]
 */
export function applyCustomColumn(config) {
  const table = document.getElementById("preorder_list");
  if (!table) return Promise.resolve();
  activeThresholds = buildThresholds(config);

  return new Promise(resolve => {
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
        updateCell(cell, row, limitDate, translateAvailableFrom(availableFrom, availableFromDate), availableFromDate, comingSoon, activeThresholds);

        const entry = storedTexts[key];
        if (entry?.productUrl || entry?.resolvedUrl) {
          const effectiveUrl = (entry.brokenLink ? null : (entry.resolvedUrl || entry.productUrl)) ?? entry.productUrl;
          if (!entry.brokenLink) {
            linkifyProductName(cells[COLUMN_INDEX_KEY], effectiveUrl.replace(/\/(es|en)\//, `/${LANG}/`), false);
            if (entry.resolvedUrl) addResolvedLinkIcon(cells[COLUMN_INDEX_KEY]);
          } else {
            addBrokenLinkWarning(cells[COLUMN_INDEX_KEY]);
          }
        }

        row.insertBefore(cell, cells[INSERT_COLUMN_INDEX] || null);
      });

      applyColumnSorting();
      autoFetchMissingData(storedTexts);
      resolve();
    });
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
