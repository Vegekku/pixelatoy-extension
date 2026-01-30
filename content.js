console.log("Pixelatoy content script activo");

const COLUMN_INDEX_KEY = 2; // columna 3 (0-based)
const INSERT_COLUMN_INDEX = 4; // columna 5

function applyCustomColumn() {
  chrome.storage.local.get("pixelatoyTexts", (result) => {
    const storedTexts = result.pixelatoyTexts || {};
    const table = document.getElementById("preorder_list");

    if (!table) {
      console.warn("No se encontró la tabla");
      return;
    }

    const rows = table.querySelectorAll("tr");

    rows.forEach((row, rowIndex) => {
      const cells = row.children;
      if (cells.length <= COLUMN_INDEX_KEY) return;

      const isHeader = row.querySelectorAll("th").length > 0;
      const key = isHeader ? null : cells[COLUMN_INDEX_KEY].textContent.trim();

      // Evitar duplicar la columna
      if (cells[INSERT_COLUMN_INDEX]?.dataset?.custom === "1") return;

      const cell = document.createElement(isHeader ? "th" : "td");
      cell.dataset.custom = "1";

      cell.textContent = isHeader
        ? "Disponibilidad"
        : (storedTexts[key] || "");

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

// Reaplicar si la tabla cambia (reservas nuevas / eliminadas)
// const observer = new MutationObserver(() => {
//   applyCustomColumn();
// });

// observer.observe(document.body, {
//   childList: true,
//   subtree: true
// });