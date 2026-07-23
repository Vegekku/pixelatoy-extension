/**
 * @module modules/refresh
 * @description Manual refresh of all product data. Shows info overlays for rows with changes,
 * allowing the user to accept or reject each change individually.
 */

import { STORAGE_KEY, addThreeMonths, getDataRows, getConfig } from "../helpers.js";
import { createOverlay, createRowOverlay, resolveProductUrl, fetchDateFromProduct } from "./fetch.js";
import { t, translateAvailableFrom, translateComingSoon } from "../i18n.js";
import { isWarehouseRow, updateTabBadge } from "./tab.js";

/**
 * Shows a temporary toast message above the preorder table.
 * @param {string} message
 */
function showRefreshToast(message) {
  const tabs = document.getElementById("pixelatoy-tabs");
  const anchor = tabs || document.getElementById("preorder_list");
  if (!anchor) return;
  document.getElementById("pixelatoy-refresh-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "pixelatoy-refresh-toast";
  const text = document.createElement("span");
  text.textContent = message;
  const close = document.createElement("button");
  close.className = "pixelatoy-toast-close";
  close.textContent = "✕";
  close.addEventListener("click", () => dismissToast());
  toast.appendChild(text);
  toast.appendChild(close);
  anchor.insertAdjacentElement("beforebegin", toast);
}

/**
 * Fades out and removes the refresh toast if present.
 */
function dismissToast() {
  const toast = document.getElementById("pixelatoy-refresh-toast");
  if (!toast) return;
  toast.classList.add("pixelatoy-toast-hide");
  setTimeout(() => toast.remove(), 500);
}

/**
 * Creates a styled button for use inside an info overlay.
 * @param {string} text - Button label.
 * @param {string} title - Tooltip text.
 * @param {string} bg - Background colour.
 * @param {function} onClick - Click handler.
 * @returns {HTMLButtonElement}
 */
function createOverlayButton(text, title, bg, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.title = title;
  btn.className = "pixelatoy-btn";
  btn.style.background = bg;
  btn.addEventListener("click", onClick);
  return btn;
}

/**
 * Creates an informational overlay showing detected changes with accept/reject buttons.
 * @param {HTMLTableRowElement} row
 * @param {Array<{label: string, oldVal: string|null, newVal: string}>} changes
 * @param {function} onAccept
 * @param {function} onReject
 * @returns {HTMLDivElement}
 */
function createInfoOverlay(row, changes, onAccept, onReject) {
  const overlay = createRowOverlay(row, "pixelatoy-info-overlay");

  const content = document.createElement("div");
  content.style.cssText = "flex:1;padding:0 12px;font-size:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;";
  changes.forEach(({ label, oldVal, newVal }) => {
    const span = document.createElement("span");
    span.innerHTML = oldVal
      ? `<strong>${label}:</strong> ${oldVal} → ${newVal}`
      : `<strong>${label}:</strong> ${newVal}`;
    content.appendChild(span);
  });

  const buttons = document.createElement("div");
  buttons.style.cssText = "display:flex;gap:6px;padding:0 12px;align-items:center;";
  buttons.appendChild(createOverlayButton("✓", t("overlay_accept"), "#5cb85c", () => { onAccept(); overlay.remove(); }));
  buttons.appendChild(createOverlayButton("✗", t("overlay_reject"), "#d9534f", () => { onReject(); overlay.remove(); }));

  overlay.appendChild(content);
  overlay.appendChild(buttons);
  return overlay;
}

/**
 * Fetches fresh data for a single row and compares with stored values.
 * @returns {Promise<{changes: Array, newFields: Object, productUrl: string}|null>}
 */
async function refreshRowData(row, key, stored, { normalizeDateTime, getStoredDate }) {
  let productUrl = stored?.productUrl || null;

  if (!productUrl) {
    productUrl = await resolveProductUrl(row, key);
  }
  if (!productUrl) return null;

  const { date, brokenLink, availableFrom, availableFromDate, comingSoon } = await fetchDateFromProduct(productUrl);

  const changes = [];
  const newFields = {};

  if (!stored?.productUrl && productUrl) {
    changes.push({ label: "URL", oldVal: null, newVal: "encontrada" });
    newFields.productUrl = productUrl;
  } else if (stored?.brokenLink && !brokenLink) {
    changes.push({ label: "Enlace", oldVal: "roto", newVal: "corregido" });
    newFields.brokenLink = false;
  }

  const storedDate = getStoredDate(stored);
  if (date && date !== storedDate) {
    const oldDisplay = storedDate || translateAvailableFrom(stored?.availableFrom, stored?.availableFromDate) || translateComingSoon(stored?.comingSoon) || null;
    changes.push({ label: "Fecha", oldVal: oldDisplay, newVal: date });
    newFields.date = date;
    newFields.brokenLink = false;
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
    newFields.comingSoon = null;
  } else if (!date && comingSoon && comingSoon !== stored?.comingSoon) {
    const oldDisplay = translateComingSoon(stored?.comingSoon) || translateAvailableFrom(stored?.availableFrom, stored?.availableFromDate) || null;
    changes.push({ label: "Disponibilidad", oldVal: oldDisplay, newVal: translateComingSoon(comingSoon) });
    newFields.comingSoon = comingSoon;
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
  } else if (!date && !comingSoon && availableFrom && availableFrom !== stored?.availableFrom) {
    changes.push({ label: "Disponibilidad", oldVal: translateAvailableFrom(stored?.availableFrom, stored?.availableFromDate) || null, newVal: translateAvailableFrom(availableFrom, availableFromDate) });
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
  }

  if (changes.length === 0) return null;
  return { changes, newFields, productUrl };
}

/**
 * Refreshes all rows in the table: fetches fresh data, shows overlays for changes.
 * @param {Object} deps - Injected dependencies from column.js.
 * @returns {Promise<void>}
 */
export async function refreshAllData({ getRowKey, saveToStorage, linkifyProductName, updateCell, normalizeDateTime, getStoredDate, COLUMN_INDEX_KEY, DATA_INSERT }) {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const storageData = await new Promise(resolve =>
    chrome.storage.local.get(STORAGE_KEY, res => resolve(res[STORAGE_KEY] || {}))
  );

  const tasks = getDataRows(table).map(row => {
    const key = getRowKey(row);
    if (!key) return null;
    const cell = row.querySelector(`[${DATA_INSERT}]`);
    if (!cell) return null;
    const stored = storageData[key] || {};
    return { row, key, cell, stored };
  }).filter(Boolean);

  const overlays = tasks.map(({ row }) => createOverlay(row));

  const results = await Promise.allSettled(
    tasks.map(({ row, key, stored }) => refreshRowData(row, key, stored, { normalizeDateTime, getStoredDate }))
  );

  const pendingOverlays = [];
  const tabCounts = { warehouse: 0, unavailable: 0 };

  results.forEach((result, i) => {
    overlays[i].remove();
    if (result.status !== "fulfilled" || !result.value) return;

    const { changes, newFields, productUrl } = result.value;
    const { row, key, cell } = tasks[i];
    const nameCell = row.children[COLUMN_INDEX_KEY];
    const rowTab = isWarehouseRow(row) ? "warehouse" : "unavailable";
    tabCounts[rowTab]++;

    pendingOverlays.push(new Promise(resolve => {
      createInfoOverlay(row, changes,
        () => {
          saveToStorage(key, newFields, row);
          if (newFields.productUrl) linkifyProductName(nameCell, newFields.productUrl, newFields.brokenLink);
          if (newFields.brokenLink === false) nameCell?.querySelector("span[title]")?.remove();
          if (newFields.date) updateCell(cell, row, addThreeMonths(newFields.date));
          else if (newFields.comingSoon) updateCell(cell, row, null, null, null, newFields.comingSoon);
          else if (newFields.availableFrom) updateCell(cell, row, null, translateAvailableFrom(newFields.availableFrom, newFields.availableFromDate), newFields.availableFromDate);
          tabCounts[rowTab]--;
          updateTabBadge(rowTab, tabCounts[rowTab]);
          if (tabCounts.warehouse + tabCounts.unavailable === 0) dismissToast();
          resolve();
        },
        () => {
          tabCounts[rowTab]--;
          updateTabBadge(rowTab, tabCounts[rowTab]);
          if (tabCounts.warehouse + tabCounts.unavailable === 0) dismissToast();
          resolve();
        }
      );
    }));
  });

  const totalChanges = tabCounts.warehouse + tabCounts.unavailable;
  if (totalChanges > 0) {
    updateTabBadge("warehouse", tabCounts.warehouse);
    updateTabBadge("unavailable", tabCounts.unavailable);
    const config = await getConfig();
    if (config.refreshToast) showRefreshToast(t("refresh_toast"));
  }

  return Promise.all(pendingOverlays);
}
