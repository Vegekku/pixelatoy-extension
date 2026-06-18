import { parseDateTime, getDataRows } from "../helpers.js";

const SORTABLE_COLUMNS = new Set([2, 3, 4, 5, 6, 8]);

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

export function sortTable(colIndex) {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const tbody = table.tBodies[0] || table;
  const headerRow = table.querySelector("tr:first-child");
  const rows = Array.from(tbody.querySelectorAll("tr")).filter(
    r => r !== headerRow && !r.querySelector("th")
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

export function applyColumnSorting() {
  const table = document.getElementById("preorder_list");
  if (!table) return;
  const headerRow = table.querySelector("tr:first-child");
  if (!headerRow) return;

  const rows = getDataRows(table).filter(r => r !== headerRow);
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
