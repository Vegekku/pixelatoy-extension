console.log("Pixelatoy content script activo");

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const STORAGE_KEY = "pixelatoyTexts";
const DATA_INSERT = "data-pixelatoy-insert";
const PLACEHOLDER = "YYYY-MM-DD\n(hora opcional)";
const TOOLTIP_FORMATS = "Formatos aceptados: 2024-03-15, 15/03/2024, 15 marzo 2024, February 23 2026";
const TOOLTIP_ERROR = "Formato no válido. Ej: 2024-03-15, 15/03/2024, 15 marzo 2024 o February 23 2026";

const COLOR_THRESHOLDS = [
  { days: 7,        bg: "#000",    color: "#fff", label: "Menos de 7 días" },
  { days: 30,       bg: "#d9534f", color: "#fff", label: "Menos de 30 días" },
  { days: 60,       bg: "#f0ad4e", color: "#000", label: "Menos de 60 días" },
  { days: Infinity, bg: "#5cb85c", color: "#000", label: "60 días o más" },
];

const SORTABLE_COLUMNS = new Set([2, 3, 4, 5, 6, 8]);

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function toISODateTime(yyyy, mm, dd, hh = "00", min = "00") {
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseDateTime(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
}

function parseNaturalDate(dateStr) {
  const MONTHS = {
    enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
    julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
    january:1, february:2, march:3, april:4, may:5, june:6,
    july:7, august:8, september:9, october:10, november:11, december:12,
  };
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

function addThreeMonths(dateStr) {
  const date = parseDateTime(dateStr);
  if (!date) return null;
  date.setMonth(date.getMonth() + 3);
  return toISODateTime(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes()
  );
}

function formatCountdown(dateStr) {
  const date = parseDateTime(dateStr);
  if (!date) return "";
  const diffMs = date - new Date();
  if (diffMs <= 0) return "Vencido";
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const months = Math.floor(totalMinutes / (60 * 24 * 30));
  const days = Math.floor((totalMinutes % (60 * 24 * 30)) / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return `${months}m ${days}d ${hours}h ${minutes}min`;
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
  const { bg, color } = COLOR_THRESHOLDS.find(t => diffDays < t.days);
  row.style.background = bg;
  row.style.color = color;
}

function updateCell(cell, row, limitDate) {
  cell.setAttribute("data-limit-date", limitDate ?? "");
  cell.textContent = limitDate ? formatCountdown(limitDate) : "";
  if (!limitDate) {
    row.style.background = "";
    row.style.color = "";
  } else {
    colorRowByDate(row, parseDateTime(limitDate));
  }
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

function saveToStorage(key, value, row) {
  try {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      const data = res[STORAGE_KEY] || {};
      if (value) {
        data[key] = { date: value, img: getRowImg(row) };
      } else {
        delete data[key];
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

    saveToStorage(key, value, row);
    updateCell(cell, row, value ? addThreeMonths(value) : null);
  });

  return cell;
}

// ─── Columna personalizada ────────────────────────────────────────────────────

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

      const cell = createEditableCell(key, row);
      const storedDate = getStoredDate(storedTexts[key]);
      const limitDate = addThreeMonths(storedDate);
      updateCell(cell, row, limitDate);

      // Update img in storage if missing
      if (storedDate && storedTexts[key] && !storedTexts[key].img) {
        const img = getRowImg(row);
        if (img) {
          storedTexts[key] = { date: storedDate, img };
          chrome.storage.local.set({ [STORAGE_KEY]: storedTexts });
        }
      }

      row.insertBefore(cell, cells[INSERT_COLUMN_INDEX] || null);
    });

    applyColumnSorting();
  });
}

function refreshCountdowns() {
  const table = document.getElementById("preorder_list");
  if (!table) return;
  table.querySelectorAll(`[${DATA_INSERT}]`).forEach((cell) => {
    if (cell.tagName === "TH" || cell.getAttribute("data-editing") === "1") return;
    const limitDate = cell.getAttribute("data-limit-date");
    if (!limitDate) return;
    cell.textContent = formatCountdown(limitDate);
    colorRowByDate(cell.closest("tr"), parseDateTime(limitDate));
  });
}

// ─── Ordenación ───────────────────────────────────────────────────────────────

let sortState = { colIndex: null, direction: null };

function getSortValue(cell, colIndex) {
  return colIndex === 4 ? cell.getAttribute("data-limit-date") || "" : cell.textContent.trim();
}

function applySortIndicator(ths) {
  ths.forEach((th, i) => {
    if (!SORTABLE_COLUMNS.has(i)) return;
    const base = th.getAttribute("data-original-text") || th.textContent.trim();
    if (!th.getAttribute("data-original-text")) th.setAttribute("data-original-text", base);
    const isActive = sortState.colIndex === i;
    th.innerHTML = `${base} <span style="display:inline-flex;flex-direction:column;font-size:0.5em;line-height:1;vertical-align:middle;"><span style="opacity:${isActive && sortState.direction === "asc" ? 1 : 0.3}">▲</span><span style="opacity:${isActive && sortState.direction === "desc" ? 1 : 0.3}">▼</span></span>`;
  });
}

function sortTable(colIndex) {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const tbody = table.tBodies[0] || table;
  const headerRow = table.querySelector("tr:first-child");
  const rows = Array.from(tbody.querySelectorAll("tr")).filter(
    r => r !== headerRow && r.querySelectorAll("th").length === 0
  );

  if (sortState.colIndex === colIndex) {
    if (sortState.direction === "asc") sortState.direction = "desc";
    else sortState = { colIndex: null, direction: null };
  } else {
    sortState = { colIndex, direction: "asc" };
  }

  const sorted = sortState.direction === null
    ? rows.slice().sort((a, b) => Number(a.getAttribute("data-original-index")) - Number(b.getAttribute("data-original-index")))
    : rows.slice().sort((a, b) => {
        const aVal = getSortValue(a.children[colIndex], colIndex);
        const bVal = getSortValue(b.children[colIndex], colIndex);
        const aDate = parseDateTime(aVal);
        const bDate = parseDateTime(bVal);
        let cmp;
        if (aDate && bDate) cmp = aDate - bDate;
        else if (!aVal && bVal) cmp = 1;
        else if (aVal && !bVal) cmp = -1;
        else cmp = aVal.localeCompare(bVal, "es", { numeric: true });
        return sortState.direction === "asc" ? cmp : -cmp;
      });

  sorted.forEach(r => tbody.appendChild(r));
  applySortIndicator(Array.from(headerRow.children));
}

function applyColumnSorting() {
  const table = document.getElementById("preorder_list");
  if (!table) return;
  const headerRow = table.querySelector("tr:first-child");
  if (!headerRow) return;

  const rows = Array.from(table.querySelectorAll("tr")).filter(
    r => r !== headerRow && r.querySelectorAll("th").length === 0
  );
  rows.forEach((r, i) => r.setAttribute("data-original-index", i));

  Array.from(headerRow.children).forEach((th, i) => {
    if (!SORTABLE_COLUMNS.has(i)) return;
    th.style.cursor = "pointer";
    th.style.userSelect = "none";
    th.style.whiteSpace = "nowrap";
    th.addEventListener("click", () => sortTable(i));
  });

  applySortIndicator(Array.from(headerRow.children));
}

// ─── Leyenda ──────────────────────────────────────────────────────────────────

function addLegend() {
  const table = document.getElementById("preorder_list");
  if (!table || document.getElementById("pixelatoy-legend")) return;

  const style = document.createElement("style");
  style.textContent = `[data-placeholder]:empty:before { content: attr(data-placeholder); opacity: 0.4; pointer-events: none; font-size: 0.75em; white-space: pre; }`;
  document.head.appendChild(style);

  const legend = document.createElement("div");
  legend.id = "pixelatoy-legend";
  legend.style.cssText = "margin-top:10px;display:flex;gap:16px;font-size:13px;align-items:center;";

  COLOR_THRESHOLDS.forEach(({ bg, label }) => {
    const item = document.createElement("span");
    item.style.cssText = "display:flex;align-items:center;gap:6px;";
    item.innerHTML = `<span style="width:16px;height:16px;background:${bg};border-radius:3px;display:inline-block;"></span>${label}`;
    legend.appendChild(item);
  });

  table.insertAdjacentElement("afterend", legend);

  const now = new Date();
  const exampleDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const exampleDateTime = toISODateTime(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes());
  const exampleDMY = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const exampleNaturalES = `${now.getDate()} ${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;
  const exampleNaturalEN = `${MONTHS_EN[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const instructions = document.createElement("div");
  instructions.style.cssText = "margin-top:10px;padding:10px 14px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#333;line-height:1.6;";
  instructions.innerHTML = `
    <strong>Instrucciones de uso</strong>
    <ul style="margin:6px 0 0 0;padding-left:18px;">
      <li>Haz click en una celda de <em>En almacén</em> para introducir o editar la fecha de entrada.</li>
      <li>Formato de fecha esperado: <code>YYYY-MM-DD</code> o <code>YYYY-MM-DD HH:MM</code> (ej: <code>${exampleDate}</code> o <code>${exampleDateTime}</code>). La hora es opcional, si no se indica se asume <code>00:00</code>. También se aceptan los formatos <code>DD/MM/YYYY</code>, <code>DD-MM-YYYY</code> (ej: <code>${exampleDMY}</code>), <code>DD mes YYYY</code> (ej: <code>${exampleNaturalES}</code>) y <code>mes DD, YYYY</code> (ej: <code>${exampleNaturalEN}</code>), con o sin hora.</li>
      <li>Al salir del campo, la fecha se guarda automáticamente y se muestra el tiempo restante hasta el límite (entrada + 3 meses).</li>
      <li>El contador se actualiza automáticamente cada minuto.</li>
      <li>Las columnas con &#9650;&#9660; permiten ordenar la tabla. Un click ordena ascendente, dos descendente y tres restaura el orden original.</li>
    </ul>
  `;
  legend.insertAdjacentElement("afterend", instructions);
}

// ─── Datos huérfanos ──────────────────────────────────────────────────────────

function checkOrphanData() {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const existing = document.getElementById("pixelatoy-orphans");
  if (existing) existing.remove();

  const tableKeys = new Set();
  table.querySelectorAll("tr").forEach((row) => {
    if (row.querySelectorAll("th").length > 0) return;
    const key = row.children[COLUMN_INDEX_KEY]?.textContent.trim();
    if (key) tableKeys.add(key);
  });

  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const data = res[STORAGE_KEY] || {};
    const orphans = Object.entries(data).filter(([key]) => !tableKeys.has(key));
    if (orphans.length === 0) return;

    const container = document.createElement("div");
    container.id = "pixelatoy-orphans";
    container.style.cssText = "margin-top:14px;padding:12px 14px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;font-size:13px;color:#333;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    header.innerHTML = `<strong>⚠️ Datos huérfanos (${orphans.length})</strong>`;

    const deleteAllBtn = document.createElement("button");
    deleteAllBtn.textContent = "Eliminar todos";
    deleteAllBtn.style.cssText = "background:#d9534f;color:#fff;border:none;padding:4px 10px;border-radius:3px;cursor:pointer;font-size:12px;";
    deleteAllBtn.addEventListener("click", () => {
      if (!confirm("¿Eliminar todos los datos huérfanos?")) return;
      chrome.storage.local.get(STORAGE_KEY, (res) => {
        const d = res[STORAGE_KEY] || {};
        orphans.forEach(([key]) => delete d[key]);
        chrome.storage.local.set({ [STORAGE_KEY]: d }, () => container.remove());
      });
    });
    header.appendChild(deleteAllBtn);
    container.appendChild(header);

    const list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:6px;";

    orphans.forEach(([key, { date: dateStr, img }]) => {
      const limitDate = addThreeMonths(dateStr);
      const status = limitDate ? formatCountdown(limitDate) : "Sin fecha";

      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#fff;border-radius:3px;";

      const info = document.createElement("span");
      info.innerHTML = `<strong>${key}</strong><br><small>Entrada: ${dateStr} · Límite: ${status}</small>`;
      info.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;";

      const delBtn = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.style.cssText = "background:#d9534f;color:#fff;border:none;width:24px;height:24px;border-radius:3px;cursor:pointer;font-size:14px;flex-shrink:0;margin-left:8px;";
      delBtn.addEventListener("click", () => {
        chrome.storage.local.get(STORAGE_KEY, (res) => {
          const d = res[STORAGE_KEY] || {};
          delete d[key];
          chrome.storage.local.set({ [STORAGE_KEY]: d }, () => {
            row.remove();
            const remaining = list.children.length;
            if (remaining === 0) container.remove();
            else header.querySelector("strong").textContent = `⚠️ Datos huérfanos (${remaining})`;
          });
        });
      });

      row.appendChild(info);
      row.appendChild(delBtn);
      list.appendChild(row);
    });

    container.appendChild(list);

    const instructions = document.querySelector("#pixelatoy-legend + div");
    if (instructions) instructions.insertAdjacentElement("afterend", container);
    else table.insertAdjacentElement("afterend", container);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

applyCustomColumn();
addLegend();
checkOrphanData();
setInterval(refreshCountdowns, 60000);
