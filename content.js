console.log("Pixelatoy content script activo");

const COLUMN_INDEX_KEY = 2;     // Columna 3
const INSERT_COLUMN_INDEX = 4; // Columna 5
const LIMIT_COLUMN_INDEX = 5;
const STORAGE_KEY = "pixelatoyTexts";
const DATA_INSERT = 'data-pixelatoy-insert';
const DATA_LIMIT = 'data-pixelatoy-limit';

function normalizeDateTime(value) {
  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})$/);

  if (!match) return value;

  const [, dd, mm, yyyy, hh, min] = match;

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
    .replace(/\u00A0/g, " ") // espacios raros
    .replace(/\s+/g, " ")
    .trim();
}

function addThreeMonths(dateStr) {
  const match = dateStr.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/
  );

  if (!match) return "";

  let [, yyyy, mm, dd, hh, min] = match;

  const date = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min)
  );

  date.setMonth(date.getMonth() + 3);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");

  return `${y}-${m}-${d} ${h}:${mi}`;
}

function applyCustomColumn() {
  const table = document.getElementById("preorder_list");
  
  if (!table) {
    console.warn("No se encontró la tabla");
    return;
  }

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
            let value = cell.textContent;
            value = cleanText(value);
            value = normalizeDateTime(value);

            cell.textContent = value;

            chrome.storage.local.get(STORAGE_KEY, (res) => {
              const data = res[STORAGE_KEY] || {};
              
              if (value) data[key] = value;
              else delete data[key];

              chrome.storage.local.set({ [STORAGE_KEY]: data });
            });
          });
        }

        row.insertBefore(cell, cells[INSERT_COLUMN_INDEX] || null);
      }

      if (!cells[LIMIT_COLUMN_INDEX]?.hasAttribute(DATA_LIMIT)) {
        const topeCell = document.createElement(isHeader ? "th" : "td");
        topeCell.setAttribute(DATA_LIMIT, "1");

        if (isHeader) {
          topeCell.textContent = "Límite";
        } else {
          const noteValue = cells[INSERT_COLUMN_INDEX]?.textContent.trim();
          topeCell.textContent = addThreeMonths(noteValue);
        }

        row.insertBefore(topeCell, cells[LIMIT_COLUMN_INDEX] || null);
      } else if (!isHeader) {
        // Recalcular si cambia la nota
        const noteValue = cells[INSERT_COLUMN_INDEX]?.textContent.trim();
        cells[LIMIT_COLUMN_INDEX].textContent = addThreeMonths(noteValue);
      }
    });
  });
}

// Ejecutar al cargar
applyCustomColumn();

// Detectar cambios dinámicos (entradas/salidas)
// const observer = new MutationObserver(applyCustomColumn);
// observer.observe(document.body, { childList: true, subtree: true });