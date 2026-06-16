import { STORAGE_KEY, THRESHOLDS, parseDateTime, addThreeMonths, toISODateTime, MONTHS, getDataRows, formatCountdown } from "./helpers.js";
import { applyColumnSorting } from "./modules/sort.js";
import { checkOrphanData } from "./modules/orphans.js";

if (typeof __BUILD_TIME__ !== "undefined") console.log(`[Pixelatoy] build: ${__BUILD_TIME__}`);

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const DATA_INSERT = "data-pixelatoy-insert";
const PLACEHOLDER = "YYYY-MM-DD\n(hora opcional)";
const TOOLTIP_FORMATS = "Formatos aceptados: 2024-03-15, 15/03/2024, 15 marzo 2024, February 23 2026";
const TOOLTIP_ERROR = "Formato no válido. Ej: 2024-03-15, 15/03/2024, 15 marzo 2024 o February 23 2026";

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function parseNaturalDate(dateStr) {
  const matchDD = dateStr.match(/^(\d{1,2})\s+([a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+)\s+(\d{4})$/i);
  if (matchDD) {
    const [, dd, monthName, yyyy] = matchDD;
    const mm = MONTHS[monthName.toLowerCase()];
    if (!mm) return null;
    return new Date(Number(yyyy), mm - 1, Number(dd));
  }

  const matchEN = dateStr.match(/^([a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (matchEN) {
    const [, monthName, dd, yyyy] = matchEN;
    const mm = MONTHS[monthName.toLowerCase()];
    if (!mm) return null;
    return new Date(Number(yyyy), mm - 1, Number(dd));
  }

  return null;
}

function normalizeDateTime(value) {
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
    value.match(/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2})?$/i);
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

function updateCell(cell, row, limitDate, availableFrom, availableFromDate) {
  if (limitDate) {
    cell.setAttribute("data-limit-date", limitDate);
    cell.removeAttribute("data-available-from");
    cell.textContent = formatCountdown(limitDate);
    cell.style.cssText = "";
    colorRowByDate(row, parseDateTime(limitDate));
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

function getRowKey(row) {
  const cell = row.children[COLUMN_INDEX_KEY];
  return cell?.querySelector("a.pixelatoy-link")?.textContent.trim() || cell?.textContent.trim();
}

function addBrokenLinkWarning(cell) {
  if (!cell || cell.querySelector("span[title]")) return;
  const warn = document.createElement("span");
  warn.textContent = " ⛓️‍💥";
  warn.title = "Este enlace puede no apuntar al producto correcto";
  warn.style.cursor = "help";
  cell.appendChild(warn);
}

function linkifyProductName(cell, url, brokenLink) {
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

function getStoredDate(entry) {
  if (!entry) return "";
  return entry.date || "";
}

function getRowImg(row) {
  const img = row.querySelector("td img");
  return img ? img.src : "";
}

function saveToStorage(key, fields, row) {
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
        if (!stored) cell.setAttribute("data-placeholder", PLACEHOLDER);
        cell.title = TOOLTIP_FORMATS;
        cell.focus();
      });
    } catch (e) {
      cell.textContent = "";
      cell.setAttribute("data-placeholder", PLACEHOLDER);
      cell.focus();
    }
  });

  cell.addEventListener("input", () => {
    if (cell.textContent.trim()) cell.removeAttribute("data-placeholder");
    else cell.setAttribute("data-placeholder", PLACEHOLDER);
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
      cell.title = TOOLTIP_ERROR;
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

function fetchHTML(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "fetch", url }, (res) => {
      resolve(res?.html ?? null);
    });
  });
}

function parseHTML(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

function createOverlay(row) {
  const rect = row.getBoundingClientRect();
  const overlayDiv = document.createElement("div");
  overlayDiv.className = "pixelatoy-overlay";
  overlayDiv.style.cssText = `top:${rect.top + window.scrollY}px;left:${rect.left + window.scrollX}px;width:${rect.width}px;height:${rect.height}px;`;
  const dotsEl = document.createElement("span");
  dotsEl.className = "pixelatoy-dots";
  dotsEl.innerHTML = "<span>&bull;</span><span>&bull;</span><span>&bull;</span>";
  overlayDiv.appendChild(dotsEl);
  document.body.appendChild(overlayDiv);
  const spans = dotsEl.querySelectorAll("span");
  let frameIndex = 0;
  spans[0].classList.add("active");
  const interval = setInterval(() => {
    spans[frameIndex % 3].classList.remove("active");
    frameIndex++;
    spans[frameIndex % 3].classList.add("active");
  }, 400);
  const originalRemove = overlayDiv.remove.bind(overlayDiv);
  overlayDiv.remove = () => { clearInterval(interval); originalRemove(); };
  return overlayDiv;
}

async function resolveProductUrl(row, key) {
  const rowCells = row.children;
  const lastCell = rowCells[rowCells.length - 1];
  const orderLink = lastCell.querySelector("a")?.href;
  if (!orderLink) return null;

  const orderHTML = await fetchHTML(orderLink);
  if (!orderHTML) return null;

  const orderDoc = parseHTML(orderHTML);
  const productLink = Array.from(orderDoc.querySelectorAll("a"))
    .find(a => a.textContent.trim() === key)?.href;
  return productLink || null;
}

function parseAvailableFrom(text) {
  const match = text.match(/([a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+)\s+(?:de\s+)?(\d{4})/i);
  if (!match) return null;
  const mm = MONTHS[match[1].toLowerCase()];
  if (!mm) return null;
  return toISODateTime(match[2], mm, "01");
}

function isValidProductPage(html) {
  const doc = parseHTML(html);
  return !!doc.querySelector('h1.page-title[itemprop="name"]');
}

async function fetchDateFromProduct(productUrl) {
  const empty = { date: null, brokenLink: false, availableFrom: null, availableFromDate: null };
  const productHTML = await fetchHTML(productUrl);
  if (!productHTML) return empty;

  if (!isValidProductPage(productHTML)) {
    return { ...empty, brokenLink: true };
  }

  const productDoc = parseHTML(productHTML);
  const dts = productDoc.querySelectorAll("dt.name");
  let date = null, availableFrom = null, availableFromDate = null;
  for (const dt of dts) {
    const label = dt.textContent.trim();
    const value = dt.nextElementSibling?.textContent.trim() || null;
    if (label === "Entrada en almacén" && value) {
      const normalized = normalizeDateTime(value);
      date = parseDateTime(normalized) ? normalized : null;
    } else if (label === "Disponibilidad" && value) {
      availableFrom = value;
      availableFromDate = parseAvailableFrom(value);
    }
  }
  return { date, brokenLink: false, availableFrom, availableFromDate };
}

async function autoFetchRowData(row, key, cell, stored) {
  const hasDate = !!getStoredDate(stored);
  const hasUrl = !!(stored && stored.productUrl);
  if (hasDate && hasUrl) return;

  const needsDate = !hasDate && !stored?.brokenLink && (
    row.children[row.children.length - 2]?.querySelector("form") ||
    row.children[row.children.length - 2]?.textContent.trim() === "No disponible"
  );
  if (hasUrl && !needsDate) return;

  cell.setAttribute("data-fetching", "1");
  const overlayDiv = createOverlay(row);

  try {
    let productUrl = hasUrl ? stored.productUrl : null;

    if (!productUrl) {
      productUrl = await resolveProductUrl(row, key);
      if (productUrl) {
        saveToStorage(key, { productUrl }, row);
        linkifyProductName(row.children[COLUMN_INDEX_KEY], productUrl);
      }
    }

    if (needsDate && productUrl) {
      const { date, brokenLink, availableFrom, availableFromDate } = await fetchDateFromProduct(productUrl);
      if (brokenLink) {
        saveToStorage(key, { brokenLink: true }, row);
        addBrokenLinkWarning(row.children[COLUMN_INDEX_KEY]);
      } else if (date) {
        saveToStorage(key, { date, brokenLink: false, availableFrom, availableFromDate }, row);
        updateCell(cell, row, addThreeMonths(date));
      } else if (availableFrom) {
        saveToStorage(key, { availableFrom, availableFromDate }, row);
        updateCell(cell, row, null, availableFrom, availableFromDate);
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
    if (stored.productUrl && (getStoredDate(stored) || stored.availableFrom)) return;
    const cell = row.querySelector(`[${DATA_INSERT}]`);
    if (!cell) return;
    autoFetchRowData(row, key, cell, stored);
  });
}

function applyCustomColumn() {
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
        th.textContent = "En almacén";
        row.insertBefore(th, cells[INSERT_COLUMN_INDEX] || null);
        return;
      }

      const isNotAvailable = row.children[row.children.length - 2]?.textContent.trim() === "No disponible";
      const cell = isNotAvailable ? document.createElement("td") : createEditableCell(key, row);
      cell.setAttribute(DATA_INSERT, "1");
      const storedDate = getStoredDate(storedTexts[key]);
      const limitDate = addThreeMonths(storedDate);
      const { availableFrom, availableFromDate } = storedTexts[key] || {};
      updateCell(cell, row, limitDate, availableFrom, availableFromDate);

      if (storedTexts[key]?.productUrl) {
        linkifyProductName(cells[COLUMN_INDEX_KEY], storedTexts[key].productUrl, storedTexts[key].brokenLink);
      }

      row.insertBefore(cell, cells[INSERT_COLUMN_INDEX] || null);
    });

    applyColumnSorting();
    autoFetchMissingData(storedTexts);
  });
}

function refreshCountdowns() {
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

// ─── Refresh ──────────────────────────────────────────────────────────────────

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
  buttons.appendChild(createOverlayButton("✓", "Aplicar cambios", "#5cb85c", () => { onAccept(); overlay.remove(); }));
  buttons.appendChild(createOverlayButton("✗", "Descartar cambios", "#d9534f", () => { onReject(); overlay.remove(); }));

  overlay.appendChild(content);
  overlay.appendChild(buttons);
  document.body.appendChild(overlay);
  return overlay;
}

async function refreshRowData(row, key, stored) {
  let productUrl = stored?.productUrl || null;

  if (!productUrl) {
    productUrl = await resolveProductUrl(row, key);
  }
  if (!productUrl) return null;

  const { date, brokenLink, availableFrom, availableFromDate } = await fetchDateFromProduct(productUrl);

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
    changes.push({ label: "Fecha", oldVal: storedDate || stored?.availableFrom || null, newVal: date });
    newFields.date = date;
    newFields.brokenLink = false;
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
  } else if (!date && availableFrom && availableFrom !== stored?.availableFrom) {
    changes.push({ label: "Disponibilidad", oldVal: stored?.availableFrom || null, newVal: availableFrom });
    newFields.availableFrom = availableFrom;
    newFields.availableFromDate = availableFromDate;
  }

  if (changes.length === 0) return null;
  return { changes, newFields, productUrl };
}

async function refreshAllData() {
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
    tasks.map(({ row, key, stored }) => refreshRowData(row, key, stored))
  );

  const pendingOverlays = [];
  results.forEach((result, i) => {
    overlays[i].remove();
    if (result.status !== "fulfilled" || !result.value) return;

    const { changes, newFields, productUrl } = result.value;
    const { row, key, cell, stored } = tasks[i];
    const nameCell = row.children[COLUMN_INDEX_KEY];

    pendingOverlays.push(new Promise(resolve => {
      createInfoOverlay(row, changes,
        () => {
          saveToStorage(key, newFields, row);
          if (newFields.productUrl) linkifyProductName(nameCell, newFields.productUrl, newFields.brokenLink);
          if (newFields.brokenLink === false) nameCell?.querySelector("span[title]")?.remove();
          if (newFields.date) updateCell(cell, row, addThreeMonths(newFields.date));
          else if (newFields.availableFrom) updateCell(cell, row, null, newFields.availableFrom, newFields.availableFromDate);
          resolve();
        },
        () => { resolve(); }
      );
    }));
  });

  return Promise.all(pendingOverlays);
}

// ─── Leyenda ──────────────────────────────────────────────────────────────────

function addLegend() {
  const table = document.getElementById("preorder_list");
  if (!table || document.getElementById("pixelatoy-legend")) return;

  const style = document.createElement("style");
  style.textContent = `[data-placeholder]:empty:before { content: attr(data-placeholder); opacity: 0.4; pointer-events: none; font-size: 0.75em; white-space: pre; }
.pixelatoy-dots span { display:inline-block; font-size:3.5em; opacity:0.5; font-weight:400; transition:font-weight 0.2s, opacity 0.2s; }
.pixelatoy-dots span.active { font-weight:900; opacity:1; }
.pixelatoy-overlay { position:absolute; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.75); pointer-events:all; cursor:wait; z-index:10; }
.pixelatoy-info-overlay { background:rgba(217,237,255,0.95); cursor:default; justify-content:space-between; }
.pixelatoy-btn { font-size:16px;cursor:pointer;color:#fff;border:none;border-radius:3px;padding:4px 8px;transition:opacity 0.2s; }
.pixelatoy-btn:hover { opacity:0.8; }`;
  document.head.appendChild(style);

  const legend = document.createElement("div");
  legend.id = "pixelatoy-legend";
  legend.style.cssText = "margin-top:10px;display:flex;gap:16px;font-size:13px;align-items:center;";

  THRESHOLDS.forEach(({ bg, label }) => {
    const item = document.createElement("span");
    item.style.cssText = "display:flex;align-items:center;gap:6px;";
    item.innerHTML = `<span style="width:16px;height:16px;background:${bg};border-radius:3px;display:inline-block;"></span>${label}`;
    legend.appendChild(item);
  });

  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Refrescar datos";
  refreshBtn.className = "pixelatoy-btn";
  refreshBtn.style.cssText = "margin-left:auto;font-size:14px;background:#5cb85c;";
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = "0.5";
    try { await refreshAllData(); }
    finally { refreshBtn.disabled = false; refreshBtn.style.opacity = "1"; }
  });
  legend.appendChild(refreshBtn);

  table.insertAdjacentElement("afterend", legend);

  const now = new Date();
  const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const exampleNaturalES = `${now.getDate()} ${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;
  const exampleNaturalEN = `${MONTHS_EN[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const instructions = document.createElement("div");
  instructions.style.cssText = "margin-top:10px;padding:10px 14px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#333;line-height:1.6;";
  instructions.innerHTML = `
    <strong style="cursor:pointer;user-select:none;" id="pixelatoy-instr-toggle">▶ Instrucciones de uso</strong>
    <ul id="pixelatoy-instr-list" style="display:none;margin:6px 0 0 0;padding-left:18px;">
      <li class="pixelatoy-instr-broken">La fecha de entrada y el enlace al producto se obtienen automáticamente al cargar la página. El nombre del producto es un enlace a su ficha. Si aparece <span class="pixelatoy-broken-icon"></span>, el enlace está roto.</li>
      <li>Usa "Refrescar datos" para actualizar la información manualmente y reintentar enlaces rotos. Solo se muestran filas con cambios.</li>
      <li>Para introducir o corregir la fecha manualmente, haz click en la celda de <em>En almacén</em>. Formatos aceptados: <code>YYYY-MM-DD</code>, <code>DD/MM/YYYY</code>, <code>DD mes YYYY</code> (ej: <code>${exampleNaturalES}</code>), <code>mes DD, YYYY</code> (ej: <code>${exampleNaturalEN}</code>), con o sin hora (<code>HH:MM</code>).</li>
      <li>Las columnas con &#9650;&#9660; permiten ordenar la tabla. Un click ordena ascendente, dos descendente y tres restaura el orden original.</li>
      <li>Si un producto desaparece de la tabla pero tiene datos guardados, aparece una sección <em>Reservas no encontradas</em> debajo con opción de eliminar.</li>
      <li>El icono de la extensión muestra un resumen de productos agrupados por urgencia.</li>
    </ul>
  `;
  const brokenIcon = document.createElement("span");
  brokenIcon.textContent = " ⛓️‍💥";
  instructions.querySelector(".pixelatoy-broken-icon").replaceWith(brokenIcon);
  const toggle = instructions.querySelector("#pixelatoy-instr-toggle");
  const list = instructions.querySelector("#pixelatoy-instr-list");
  toggle.addEventListener("click", () => {
    const open = list.style.display !== "none";
    list.style.display = open ? "none" : "block";
    toggle.innerHTML = (open ? "&#9654;" : "&#9660;") + " Instrucciones de uso";
  });
  legend.insertAdjacentElement("afterend", instructions);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

applyCustomColumn();
addLegend();
checkOrphanData();
setInterval(refreshCountdowns, 60000);
