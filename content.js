(function () {
  // 🔧 TEXTO QUE QUIERES MOSTRAR EN LA NUEVA COLUMNA
  const customText = "MI TEXTO";

  // Esperamos a que el DOM esté listo
  document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("preorder_list");
    console.log(table);

    if (!table) {
      console.warn("No se encontró la tabla");
      return;
    }

    const rows = table.querySelectorAll("tr");
    console.log(rows);

    rows.forEach((row, index) => {
      // Detectamos si es cabecera
      const isHeader = row.querySelectorAll("th").length > 0;

      const cell = document.createElement(isHeader ? "th" : "td");
      cell.textContent = isHeader ? "Disponibilidad" : customText;

      const cells = row.children;

      // Insertar en posición 5 (índice 4)
      if (cells.length >= 4) {
        row.insertBefore(cell, cells[4]);
      } else {
        row.appendChild(cell);
      }
    });
  });
})();