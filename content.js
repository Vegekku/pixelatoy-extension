console.log("Pixelatoy content script activo");

const COLUMN_INDEX_KEY = 2;     // Columna 3
const INSERT_COLUMN_INDEX = 4; // Columna 5
const STORAGE_KEY = "pixelatoyTexts";

function applyCustomColumn() {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedTexts = result[STORAGE_KEY] || {};
    const table = document.getElementById("preorder_list");

    if (!table) {
      console.warn("No se encontró la tabla");
      return;
    }

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
          const value = cell.textContent.trim();

          chrome.storage.local.get(STORAGE_KEY, (res) => {
            const data = res[STORAGE_KEY] || {};
            data[key] = value;

            chrome.storage.local.set({ [STORAGE_KEY]: data });
          });
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