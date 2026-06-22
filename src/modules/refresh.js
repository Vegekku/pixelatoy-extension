import { STORAGE_KEY, addThreeMonths, getDataRows } from "../helpers.js";
import { createOverlay, resolveProductUrl, fetchDateFromProduct } from "./fetch.js";
import { t, translateAvailableFrom, translateComingSoon } from "../i18n.js";

function createOverlayButton(text, title, bg, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.title = title;
  btn.className = "pixelatoy-btn";
  btn.style.background = bg;
  btn.addEventListener("click", onClick);
  return btn;
}

function createInfoOverlay(row, changes, onAccept, onReject) {
  const rect = row.getBoundingClientRect();
  const overlay = document.createElement("div");
  overlay.className = "pixelatoy-overlay pixelatoy-info-overlay";
  overlay.style.cssText = `top:${rect.top + window.scrollY}px;left:${rect.left + window.scrollX}px;width:${rect.width}px;height:${rect.height}px;`;

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
  document.body.appendChild(overlay);
  return overlay;
}

async function refreshRowData(row, key, stored, { normalizeDateTime, getStoredDate }) {
  let productUrl = stored?.productUrl || null;

  if (!productUrl) {
    productUrl = await resolveProductUrl(row, key);
  }
  if (!productUrl) return null;

  const { date, brokenLink, availableFrom, availableFromDate, comingSoon } = await fetchDateFromProduct(productUrl, normalizeDateTime);

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
    changes.push({ label: "Fecha", oldVal: storedDate || stored?.availableFrom || stored?.comingSoon || null, newVal: date });
    newFields.date = date;
    newFields.brokenLink = false;
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
    newFields.comingSoon = null;
  } else if (!date && comingSoon && comingSoon !== stored?.comingSoon) {
    changes.push({ label: "Disponibilidad", oldVal: stored?.comingSoon || stored?.availableFrom || null, newVal: comingSoon });
    newFields.comingSoon = comingSoon;
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
  } else if (!date && !comingSoon && availableFrom && availableFrom !== stored?.availableFrom) {
    changes.push({ label: "Disponibilidad", oldVal: stored?.availableFrom || null, newVal: availableFrom });
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
  }

  if (changes.length === 0) return null;
  return { changes, newFields, productUrl };
}

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
  results.forEach((result, i) => {
    overlays[i].remove();
    if (result.status !== "fulfilled" || !result.value) return;

    const { changes, newFields, productUrl } = result.value;
    const { row, key, cell } = tasks[i];
    const nameCell = row.children[COLUMN_INDEX_KEY];

    pendingOverlays.push(new Promise(resolve => {
      createInfoOverlay(row, changes,
        () => {
          saveToStorage(key, newFields, row);
          if (newFields.productUrl) linkifyProductName(nameCell, newFields.productUrl, newFields.brokenLink);
          if (newFields.brokenLink === false) nameCell?.querySelector("span[title]")?.remove();
          if (newFields.date) updateCell(cell, row, addThreeMonths(newFields.date));
          else if (newFields.comingSoon) updateCell(cell, row, null, null, null, newFields.comingSoon);
          else if (newFields.availableFrom) updateCell(cell, row, null, translateAvailableFrom(newFields.availableFrom), newFields.availableFromDate);
          resolve();
        },
        () => { resolve(); }
      );
    }));
  });

  return Promise.all(pendingOverlays);
}
