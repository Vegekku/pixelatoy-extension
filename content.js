console.log("Pixelatoy content script activo");

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const LIMIT_COLUMN_INDEX = 5;
const STORAGE_KEY = "pixelatoyTexts";
const DATA_INSERT = 'data-pixelatoy-insert';
const DATA_LIMIT = 'data-pixelatoy-limit';

function normalizeDateTime(value) {
  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})$/);

  if (!match) return value;

  let [, dd, mm, yyyy, hh, min] = match;

  dd = dd.padStart(2, "0");
  mm = mm.padStart(2, "0");
  hh = hh.padStart(2, "0");

  if (dd > 31 || mm > 12 || hh > 23 || min > 59) {
    return value;
  }

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function cleanText(value) {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateTime(value) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/
  );

  if (!match) return null;

  let [, y, m, d, h, min] = match;

  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(h),
    Number(min)
  );
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

function colorRowByDate(row, date) {
  if (!date) return;

  const now = new Date();
  const diffMs = date - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Reset estilos previos
  row.style.background = "";
  row.style.color = "";

  if (diffDays < 7) {
    row.style.background = "#000";
    row.style.color = "#fff";
  } else if (diffDays < 30) {
    row.style.background = "#d9534f"; // rojo
    row.style.color = "#fff";
  } else if (diffDays < 60) {
    row.style.background = "#f0ad4e"; // naranja
    row.style.color = "#000";
  } else {
    row.style.background = "#5cb85c"; // verde
    row.style.color = "#000";
  }
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

      if (!cells[INSERT_COLUMN_INDEX]?.hasAttribute(DATA_INSERT)) {
        const cell = document.createElement(isHeader ? "th" : "td");
        cell.setAttribute(DATA_INSERT, "1");

        if (isHeader) {
          cell.textContent = "Entrada";
        } else {
          cell.contentEditable = "true";
          cell.textContent = storedTexts[key] || "";

          // Pegar solo texto plano
          cell.addEventListener("paste", (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData("text");
            document.execCommand("insertText", false, text);
          });

          // Guardar automáticamente al editar
          cell.addEventListener("blur", () => {
            let value = normalizeDateTime(cleanText(cell.textContent));
            cell.textContent = value;

            chrome.storage.local.get(STORAGE_KEY, (res) => {
              const data = res[STORAGE_KEY] || {};
              if (value) data[key] = value; else delete data[key];
              chrome.storage.local.set({ [STORAGE_KEY]: data });
            });
          });
        }

        row.insertBefore(cell, cells[INSERT_COLUMN_INDEX] || null);
      }

      if (!cells[LIMIT_COLUMN_INDEX]?.hasAttribute(DATA_LIMIT)) {
        const topeCell = document.createElement(isHeader ? "th" : "td");
        topeCell.setAttribute(DATA_LIMIT, "1");

        topeCell.textContent = isHeader
          ? "Límite"
          : addThreeMonths(cells[INSERT_COLUMN_INDEX]?.textContent.trim());

        row.insertBefore(topeCell, cells[LIMIT_COLUMN_INDEX] || null);
      } else if (!isHeader) {
        // Recalcular si cambia la nota
        const noteValue = cells[INSERT_COLUMN_INDEX]?.textContent.trim();
        cells[LIMIT_COLUMN_INDEX].textContent = addThreeMonths(noteValue);
      }

      if (!isHeader) {
        colorRowByDate(row, parseDateTime(cells[LIMIT_COLUMN_INDEX].textContent.trim()));
      }
    });
  });
}

// Ejecutar al cargar
applyCustomColumn();

// Detectar cambios dinámicos (entradas/salidas)
// const observer = new MutationObserver(applyCustomColumn);
// observer.observe(document.body, { childList: true, subtree: true });