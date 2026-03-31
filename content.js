console.log("Pixelatoy content script activo");

const COLUMN_INDEX_KEY = 2;
const INSERT_COLUMN_INDEX = 4;
const STORAGE_KEY = "pixelatoyTexts";
const DATA_INSERT = 'data-pixelatoy-insert';

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
          cell.setAttribute("data-editing", "1");
          cell.contentEditable = "true";
          cell.textContent = storedTexts[key] || "";
          cell.focus();
        });

        cell.addEventListener("paste", (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData("text");
          document.execCommand("insertText", false, text);
        });

        cell.addEventListener("blur", () => {
          cell.removeAttribute("data-editing");
          cell.contentEditable = "false";

          let value = normalizeDateTime(cleanText(cell.textContent));

          chrome.storage.local.get(STORAGE_KEY, (res) => {
            const data = res[STORAGE_KEY] || {};
            if (value) data[key] = value; else delete data[key];
            chrome.storage.local.set({ [STORAGE_KEY]: data });
          });

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
  });
}

function addLegend() {
  const table = document.getElementById("preorder_list");
  if (!table || document.getElementById("pixelatoy-legend")) return;

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
}

applyCustomColumn();
addLegend();
setInterval(refreshCountdowns, 60000);
