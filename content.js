console.log("Pixelatoy content script activo");

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const STORAGE_KEY = "pixelatoyTexts";
const DATA_INSERT = 'data-pixelatoy-insert';

function normalizeDateTime(value) {
  const withTime = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (withTime) {
    let [, dd, mm, yyyy, hh, min] = withTime;
    dd = dd.padStart(2, "0");
    mm = mm.padStart(2, "0");
    hh = hh.padStart(2, "0");
    if (dd > 31 || mm > 12 || hh > 23 || min > 59) return value;
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  const dateOnly = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dateOnly) {
    let [, dd, mm, yyyy] = dateOnly;
    dd = dd.padStart(2, "0");
    mm = mm.padStart(2, "0");
    if (dd > 31 || mm > 12) return value;
    return `${yyyy}-${mm}-${dd} 00:00`;
  }

  const isoDateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, yyyy, mm, dd] = isoDateOnly;
    if (dd > 31 || mm > 12) return value;
    return `${yyyy}-${mm}-${dd} 00:00`;
  }

  return value;
}

function cleanText(value) {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateTime(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);

  if (!match) return null;

  let [, y, m, d, h, min] = match;

  return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
}

function addThreeMonths(dateStr) {
  const date = parseDateTime(dateStr);

  if (!date) return null;

  date.setMonth(date.getMonth() + 3);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${y}-${m}-${d} ${h}:${mi}`;
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

function colorRowByDate(row, date) {
  if (!date) return;

  const now = new Date();
  const diffMs = date - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  row.style.background = "";
  row.style.color = "";

  if (diffDays < 7) {
    row.style.background = "#000";
    row.style.color = "#fff";
  } else if (diffDays < 30) {
    row.style.background = "#d9534f";
    row.style.color = "#fff";
  } else if (diffDays < 60) {
    row.style.background = "#f0ad4e";
    row.style.color = "#000";
  } else {
    row.style.background = "#5cb85c";
    row.style.color = "#000";
  }
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

function applyCustomColumn() {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedTexts = result[STORAGE_KEY] || {};

    table.querySelectorAll("tr").forEach((row) => {
      const cells = row.children;
      if (cells.length <= COLUMN_INDEX_KEY) return;

      const isHeader = row.querySelectorAll("th").length > 0;
      const key = isHeader ? null : cells[COLUMN_INDEX_KEY].textContent.trim();

      if (cells[INSERT_COLUMN_INDEX]?.hasAttribute(DATA_INSERT)) return;

      const cell = document.createElement(isHeader ? "th" : "td");
      cell.setAttribute(DATA_INSERT, "1");

      if (isHeader) {
        cell.textContent = "En almacén";
      } else {
        const storedDate = storedTexts[key] || "";
        const limitDate = addThreeMonths(storedDate);

        cell.setAttribute("data-limit-date", limitDate ?? "");
        cell.textContent = limitDate ? formatCountdown(limitDate) : "";

        if (limitDate) colorRowByDate(row, parseDateTime(limitDate));

        cell.addEventListener("click", () => {
          if (cell.getAttribute("data-editing") === "1") return;
          cell.setAttribute("data-editing", "1");
          cell.contentEditable = "true";
          try {
            chrome.storage.local.get(STORAGE_KEY, (res) => {
              const stored = (res[STORAGE_KEY] || {})[key] || "";
              cell.textContent = stored;
              if (!stored) cell.setAttribute("data-placeholder", "YYYY-MM-DD\n(hora opcional)");
              cell.focus();
            });
          } catch (e) {
            cell.textContent = "";
            cell.setAttribute("data-placeholder", "YYYY-MM-DD (hora opcional)");
            cell.focus();
          }
        });

        cell.addEventListener("input", () => {
          if (cell.textContent.trim()) cell.removeAttribute("data-placeholder");
          else cell.setAttribute("data-placeholder", "YYYY-MM-DD HH:MM");
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

          let value = normalizeDateTime(cleanText(cell.textContent));

          if (value && !parseDateTime(value)) {
            cell.style.outlineColor = "#d9534f";
            cell.title = "Formato de fecha no válido. Ej: 2024-03-15 o 2024-03-15 10:30";
            cell.contentEditable = "true";
            cell.setAttribute("data-editing", "1");
            cell.focus();
            return;
          }

          cell.style.outlineColor = "";
          cell.title = "";

          try {
            chrome.storage.local.get(STORAGE_KEY, (res) => {
              const data = res[STORAGE_KEY] || {};
              if (value) data[key] = value; else delete data[key];
              chrome.storage.local.set({ [STORAGE_KEY]: data });
            });
          } catch (e) {
            console.warn("Pixelatoy: contexto de extensión invalidado, recarga la página.");
          }

          const newLimit = value ? addThreeMonths(value) : null;
          cell.setAttribute("data-limit-date", newLimit ?? "");
          cell.textContent = newLimit ? formatCountdown(newLimit) : "";

          if (!newLimit) {
            row.style.background = "";
            row.style.color = "";
          } else {
            colorRowByDate(row, parseDateTime(newLimit));
          }
        });
      }

      row.insertBefore(cell, cells[INSERT_COLUMN_INDEX] || null);
    });

    applyColumnSorting();
  });
}

function addLegend() {
  const table = document.getElementById("preorder_list");
  if (!table || document.getElementById("pixelatoy-legend")) return;

  const style = document.createElement("style");
  style.textContent = `[data-placeholder]:empty:before { content: attr(data-placeholder); opacity: 0.4; pointer-events: none; font-size: 0.75em; white-space: pre; }`;
  document.head.appendChild(style);

  const legend = document.createElement("div");
  legend.id = "pixelatoy-legend";
  legend.style.cssText = "margin-top:10px;display:flex;gap:16px;font-size:13px;align-items:center;";

  const items = [
    { bg: "#000", label: "Menos de 7 días" },
    { bg: "#d9534f", label: "Menos de 30 días" },
    { bg: "#f0ad4e", label: "Menos de 60 días" },
    { bg: "#5cb85c", label: "60 días o más" },
  ];

  items.forEach(({ bg, label }) => {
    const item = document.createElement("span");
    item.style.cssText = "display:flex;align-items:center;gap:6px;";
    item.innerHTML = `<span style="width:16px;height:16px;background:${bg};border-radius:3px;display:inline-block;"></span>${label}`;
    legend.appendChild(item);
  });

  table.insertAdjacentElement("afterend", legend);

  const instructions = document.createElement("div");
  instructions.style.cssText = "margin-top:10px;padding:10px 14px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#333;line-height:1.6;";
  instructions.innerHTML = `
    <strong>Instrucciones de uso</strong>
    <ul style="margin:6px 0 0 0;padding-left:18px;">
      <li>Haz click en una celda de <em>En almacén</em> para introducir o editar la fecha de entrada.</li>
      <li>Formato de fecha esperado: <code>YYYY-MM-DD</code> o <code>YYYY-MM-DD HH:MM</code> (ej: <code>2024-03-15</code> o <code>2024-03-15 10:30</code>). La hora es opcional, si no se indica se asume <code>00:00</code>. También se aceptan los formatos <code>DD/MM/YYYY</code> y <code>DD-MM-YYYY</code> (ej: <code>15/03/2024</code> o <code>15-03-2024</code>), con o sin hora.</li>
      <li>Al salir del campo, la fecha se guarda automáticamente y se muestra el tiempo restante hasta el límite (entrada + 3 meses).</li>
      <li>El contador se actualiza automáticamente cada minuto.</li>
      <li>Las columnas con &#9650;&#9660; permiten ordenar la tabla. Un click ordena ascendente, dos descendente y tres restaura el orden original.</li>
    </ul>
  `;
  legend.insertAdjacentElement("afterend", instructions);
}

const SORTABLE_COLUMNS = new Set([2, 3, 4, 5, 6, 8]);
let sortState = { colIndex: null, direction: null }; // null | 'asc' | 'desc'

function getSortValue(cell, colIndex) {
  if (colIndex === 4) return cell.getAttribute("data-limit-date") || "";
  return cell.textContent.trim();
}

function applySortIndicator(ths) {
  ths.forEach((th, i) => {
    if (!SORTABLE_COLUMNS.has(i)) return;
    const base = th.getAttribute("data-original-text") || th.textContent.trim();
    if (!th.getAttribute("data-original-text")) th.setAttribute("data-original-text", base);

    const isActive = sortState.colIndex === i;
    th.innerHTML = `${base} <span style="display:inline-flex;flex-direction:column;font-size:0.5em;line-height:1;vertical-align:middle;"><span style="opacity:${isActive && sortState.direction === 'asc' ? 1 : 0.3}">▲</span><span style="opacity:${isActive && sortState.direction === 'desc' ? 1 : 0.3}">▼</span></span>`;
  });
}

function sortTable(colIndex) {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const tbody = table.tBodies[0] || table;
  const headerRow = table.querySelector("tr:first-child");
  const rows = Array.from(tbody.querySelectorAll("tr")).filter(r => r !== headerRow && r.querySelectorAll("th").length === 0);

  if (sortState.colIndex === colIndex) {
    if (sortState.direction === "asc") sortState.direction = "desc";
    else if (sortState.direction === "desc") { sortState = { colIndex: null, direction: null }; }
  } else {
    sortState = { colIndex: colIndex, direction: "asc" };
  }

  if (sortState.direction === null) {
    rows.forEach(r => r.setAttribute("data-original-index", r.getAttribute("data-original-index")));
    const sorted = rows.slice().sort((a, b) => Number(a.getAttribute("data-original-index")) - Number(b.getAttribute("data-original-index")));
    sorted.forEach(r => tbody.appendChild(r));
  } else {
    const sorted = rows.slice().sort((a, b) => {
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
  }

  applySortIndicator(Array.from(headerRow.children));
}

function applyColumnSorting() {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const headerRow = table.querySelector("tr:first-child");
  if (!headerRow) return;

  // Guardar índice original de cada fila
  const rows = Array.from(table.querySelectorAll("tr")).filter(r => r !== headerRow && r.querySelectorAll("th").length === 0);
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

applyCustomColumn();
addLegend();
setInterval(refreshCountdowns, 60000);
