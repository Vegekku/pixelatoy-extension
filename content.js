console.log("Pixelatoy content script activo");

const COLUMN_INDEX_KEY = 2;     // Columna 3
const INSERT_COLUMN_INDEX = 4; // Columna 5
const STORAGE_KEY = "pixelatoyTexts";

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

function applyCustomColumn() {
  const table = document.getElementById("preorder_list");
  
  if (!table) {
    console.warn("No se encontró la tabla");
    return;
  }

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedTexts = result[STORAGE_KEY] || {};

    const rows = table.querySelectorAll("tr");

    rows.forEach((row) => {
      const cells = row.children;
      if (cells.length <= COLUMN_INDEX_KEY) return;

      const isHeader = row.querySelectorAll("th").length > 0;
      const key = isHeader ? null : cells[COLUMN_INDEX_KEY].textContent.trim();

      // Evitar duplicados
      if (cells[INSERT_COLUMN_INDEX]?.dataset?.custom === "1") return;

      const cell = document.createElement(isHeader ? "th" : "td");
      cell.dataset.custom = "1";

      if (isHeader) {
        cell.textContent = "Disponibilidad";
      } else {
        cell.contentEditable = "true";
        cell.textContent = storedTexts[key] || "";

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

        // Pegar solo texto plano
        cell.addEventListener("paste", (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData("text");
          document.execCommand("insertText", false, text);
        });
      }

      if (cells.length > INSERT_COLUMN_INDEX) {
        row.insertBefore(cell, cells[INSERT_COLUMN_INDEX]);
      } else {
        row.appendChild(cell);
      }
    });
  });
}

// Ejecutar al cargar
applyCustomColumn();

// Detectar cambios dinámicos (entradas/salidas)
// const observer = new MutationObserver(applyCustomColumn);
// observer.observe(document.body, { childList: true, subtree: true });