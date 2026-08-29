/**
 * @module modules/tab
 * @description Manages the two-tab UI ("En almacén" / "No disponible") above the preorder table.
 * Tabs filter row visibility and update the custom column header label accordingly.
 */

import { getDataRows, DATA_INSERT } from "../shared/helpers.js";
import { t } from "../shared/i18n.js";
import { applySortIndicator } from "./sort.js";

const SESSION_TAB_KEY = "pixelatoy-active-tab";

/** Currently active tab: "warehouse" | "unavailable" */
let activeTab = "warehouse";

/** Tab button references, set when buildTabs() runs. */
let warehouseBtn = null;
let unavailableBtn = null;

/**
 * Updates the badge counter on a tab button.
 * @param {"warehouse"|"unavailable"} tab
 * @param {number} count - Number of pending changes. 0 removes the badge.
 */
export function updateTabBadge(tab, count) {
  const btn = tab === "warehouse" ? warehouseBtn : unavailableBtn;
  if (!btn) return;
  btn.querySelector(".pixelatoy-tab-badge")?.remove();
  if (count <= 0) return;
  const badge = document.createElement("span");
  badge.className = "pixelatoy-tab-badge";
  badge.textContent = count;
  btn.appendChild(badge);
}

/**
 * Returns true if the row belongs to the "En almacén" tab (has a form in the actions column).
 * @param {HTMLTableRowElement} row
 * @returns {boolean}
 */
export function isWarehouseRow(row) {
  return Array.from(row.querySelectorAll("td")).some(td => td.querySelector("form"));
}

/**
 * Switches the visible tab: updates row visibility and the custom column header.
 * @param {"warehouse"|"unavailable"} tab
 * @param {HTMLElement} wBtn
 * @param {HTMLElement} uBtn
 */
function switchTab(tab, wBtn, uBtn) {
  activeTab = tab;
  sessionStorage.setItem(SESSION_TAB_KEY, tab);
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const th = table.querySelector(`th[${DATA_INSERT}]`);
  if (th) {
    const label = tab === "warehouse" ? t("col_header") : t("col_header_avail");
    th.setAttribute("data-original-text", label);
    th.textContent = label;
  }

  const headerRow = table.querySelector("tr:first-child");
  if (headerRow) applySortIndicator(Array.from(headerRow.children));

  getDataRows(table).forEach(row => {
    row.style.display = (isWarehouseRow(row) === (tab === "warehouse")) ? "" : "none";
  });

  wBtn.classList.toggle("pixelatoy-tab-active", tab === "warehouse");
  uBtn.classList.toggle("pixelatoy-tab-active", tab === "unavailable");
}

/**
 * Creates and inserts the tab bar above the preorder table.
 * Applies initial row visibility based on the given default tab.
 * @param {"warehouse"|"unavailable"} [defaultTab="warehouse"]
 */
export function buildTabs(defaultTab = "warehouse") {
  defaultTab = sessionStorage.getItem(SESSION_TAB_KEY) || defaultTab;
  const table = document.getElementById("preorder_list");
  if (!table || document.getElementById("pixelatoy-tabs")) return;

  const rows = getDataRows(table);
  const wCount = rows.filter(isWarehouseRow).length;
  const uCount = rows.length - wCount;

  const bar = document.createElement("div");
  bar.id = "pixelatoy-tabs";

  const wBtn = document.createElement("button");
  const uBtn = document.createElement("button");
  wBtn.className = "pixelatoy-tab";
  uBtn.className = "pixelatoy-tab";
  wBtn.textContent = `${t("tab_warehouse")} (${wCount})`;
  uBtn.textContent = `${t("tab_unavailable")} (${uCount})`;

  wBtn.addEventListener("click", () => switchTab("warehouse", wBtn, uBtn));
  uBtn.addEventListener("click", () => switchTab("unavailable", wBtn, uBtn));

  warehouseBtn = wBtn;
  unavailableBtn = uBtn;

  bar.appendChild(wBtn);
  bar.appendChild(uBtn);
  table.insertAdjacentElement("beforebegin", bar);

  switchTab(defaultTab, wBtn, uBtn);
}
