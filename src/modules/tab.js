/**
 * @module modules/tab
 * @description Manages the two-tab UI ("En almacén" / "No disponible") above the preorder table.
 * Tabs filter row visibility and update the custom column header label accordingly.
 */

import { getDataRows, DATA_INSERT } from "../helpers.js";
import { t } from "../i18n.js";

/** Currently active tab: "warehouse" | "unavailable" */
let activeTab = "warehouse";

/**
 * Returns true if the row belongs to the "En almacén" tab (has a form in the actions column).
 * @param {HTMLTableRowElement} row
 * @returns {boolean}
 */
export function isWarehouseRow(row) {
  return !!row.children[row.children.length - 2]?.querySelector("form");
}

/**
 * Switches the visible tab: updates row visibility and the custom column header.
 * @param {"warehouse"|"unavailable"} tab
 * @param {HTMLElement} wBtn
 * @param {HTMLElement} uBtn
 */
function switchTab(tab, wBtn, uBtn) {
  activeTab = tab;
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const th = table.querySelector(`th[${DATA_INSERT}]`);
  if (th) th.textContent = tab === "warehouse" ? t("col_header") : t("col_header_avail");

  getDataRows(table).forEach(row => {
    row.style.display = (isWarehouseRow(row) === (tab === "warehouse")) ? "" : "none";
  });

  wBtn.classList.toggle("pixelatoy-tab-active", tab === "warehouse");
  uBtn.classList.toggle("pixelatoy-tab-active", tab === "unavailable");
}

/**
 * Creates and inserts the tab bar above the preorder table.
 * Applies initial row visibility (default tab: "warehouse").
 */
export function buildTabs() {
  const table = document.getElementById("preorder_list");
  if (!table || document.getElementById("pixelatoy-tabs")) return;

  const rows = getDataRows(table);
  const wCount = rows.filter(isWarehouseRow).length;
  const uCount = rows.length - wCount;

  const bar = document.createElement("div");
  bar.id = "pixelatoy-tabs";

  const wBtn = document.createElement("button");
  const uBtn = document.createElement("button");
  wBtn.className = "pixelatoy-tab pixelatoy-tab-active";
  uBtn.className = "pixelatoy-tab";
  wBtn.textContent = `${t("tab_warehouse")} (${wCount})`;
  uBtn.textContent = `${t("tab_unavailable")} (${uCount})`;

  wBtn.addEventListener("click", () => switchTab("warehouse", wBtn, uBtn));
  uBtn.addEventListener("click", () => switchTab("unavailable", wBtn, uBtn));

  bar.appendChild(wBtn);
  bar.appendChild(uBtn);
  table.insertAdjacentElement("beforebegin", bar);

  switchTab("warehouse", wBtn, uBtn);
}
