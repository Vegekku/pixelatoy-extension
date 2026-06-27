/**
 * @module content
 * @description Entry point for the content script. Orchestrates module initialisation
 * and sets up the periodic countdown refresh.
 */

import { checkOrphanData } from "./modules/orphans.js";
import { addLegend } from "./modules/legend.js";
import { refreshAllData as _refreshAllData } from "./modules/refresh.js";
import { applyCustomColumn, refreshCountdowns, getRowKey, saveToStorage, linkifyProductName, updateCell, normalizeDateTime, getStoredDate, COLUMN_INDEX_KEY, DATA_INSERT } from "./modules/column.js";
import { buildTabs } from "./modules/tab.js";
import { saveLang } from "./i18n.js";

if (typeof __BUILD_TIME__ !== "undefined") console.log(`[Pixelatoy] build: ${__BUILD_TIME__}`);

function refreshAllData() {
  return _refreshAllData({ getRowKey, saveToStorage, linkifyProductName, updateCell, normalizeDateTime, getStoredDate, COLUMN_INDEX_KEY, DATA_INSERT });
}

saveLang();
applyCustomColumn();
buildTabs();
addLegend(refreshAllData);
checkOrphanData();
setInterval(refreshCountdowns, 60000);
