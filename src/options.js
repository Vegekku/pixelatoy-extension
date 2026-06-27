/**
 * @module options
 * @description Options page logic: loads config from storage, renders controls,
 * saves changes and resets to defaults.
 */

import { CONFIG_KEY, DEFAULT_CONFIG } from "./helpers.js";
import { getLang, t } from "./i18n.js";

/**
 * Applies i18n labels to the static elements of the page.
 * @param {string} lang
 */
function applyLabels(lang) {
  document.title = t("options_title", lang);
  document.getElementById("title").textContent = t("options_title", lang);
  document.getElementById("h-general").textContent = t("options_h_general", lang);
  document.getElementById("h-urgency").textContent = t("options_h_urgency", lang);
  document.getElementById("l-notifications").textContent = t("options_l_notifications", lang);
  document.getElementById("l-popup").textContent = t("options_l_popup", lang);
  document.getElementById("l-tabs").textContent = t("options_l_tabs", lang);
  document.getElementById("l-default-tab").textContent = t("options_l_default_tab", lang);
  document.getElementById("opt-warehouse").textContent = t("options_opt_warehouse", lang);
  document.getElementById("opt-unavailable").textContent = t("options_opt_unavailable", lang);
  document.getElementById("l-instructions").textContent = t("options_l_instructions", lang);
  document.getElementById("h-days").textContent = t("options_h_days", lang);
  document.getElementById("h-bg").textContent = t("options_h_bg", lang);
  document.getElementById("h-text").textContent = t("options_h_text", lang);
  document.getElementById("save").textContent = t("options_save", lang);
  document.getElementById("reset").textContent = t("options_reset", lang);
}

/**
 * Renders the threshold rows (days + color pickers) based on config.
 * @param {typeof DEFAULT_CONFIG} config
 * @param {string} lang
 */
function renderThresholds(config, lang) {
  const container = document.getElementById("thresholds");
  container.innerHTML = "";
  [0, 1, 2, 3].forEach(i => {
    const row = document.createElement("div");
    row.className = "threshold-row";

    const lbl = document.createElement("span");
    lbl.textContent = t(`options_threshold_${i}`, lang);

    const bg = document.createElement("input");
    bg.type = "color";
    bg.value = config.colors[i].bg;
    bg.dataset.idx = i;
    bg.className = "threshold-bg";

    const color = document.createElement("input");
    color.type = "color";
    color.value = config.colors[i].color;
    color.dataset.idx = i;
    color.className = "threshold-color";

    if (i < 3) {
      const days = document.createElement("input");
      days.type = "number";
      days.min = 1;
      days.max = 365;
      days.value = config.thresholds[i];
      days.dataset.idx = i;
      days.className = "threshold-days";
      row.appendChild(lbl);
      row.appendChild(days);
    } else {
      const placeholder = document.createElement("span");
      placeholder.textContent = "—";
      row.appendChild(lbl);
      row.appendChild(placeholder);
    }

    row.appendChild(bg);
    row.appendChild(color);
    container.appendChild(row);
  });
}

/**
 * Reads current form values and returns a partial config object.
 * @returns {Partial<typeof DEFAULT_CONFIG>}
 */
function readForm() {
  const thresholds = [...DEFAULT_CONFIG.thresholds];
  const colors = DEFAULT_CONFIG.colors.map(c => ({ ...c }));

  document.querySelectorAll(".threshold-days").forEach(el => {
    thresholds[Number(el.dataset.idx)] = Number(el.value);
  });
  document.querySelectorAll(".threshold-bg").forEach(el => {
    colors[Number(el.dataset.idx)] = { ...colors[Number(el.dataset.idx)], bg: el.value };
  });
  document.querySelectorAll(".threshold-color").forEach(el => {
    colors[Number(el.dataset.idx)] = { ...colors[Number(el.dataset.idx)], color: el.value };
  });

  return {
    notifications: document.getElementById("notifications").checked,
    popup: document.getElementById("popup").checked,
    tabs: document.getElementById("tabs").checked,
    defaultTab: document.getElementById("defaultTab").value,
    instructionsOpen: document.getElementById("instructionsOpen").checked,
    thresholds,
    colors,
  };
}

/**
 * Populates the form with the given config values.
 * @param {typeof DEFAULT_CONFIG} config
 */
function populateForm(config) {
  document.getElementById("notifications").checked = config.notifications;
  document.getElementById("popup").checked = config.popup;
  document.getElementById("tabs").checked = config.tabs;
  document.getElementById("defaultTab").value = config.defaultTab;
  document.getElementById("instructionsOpen").checked = config.instructionsOpen;
}

/**
 * Shows a status message and clears it after 2 seconds.
 * @param {string} msg
 */
function showStatus(msg) {
  const status = document.getElementById("status");
  status.textContent = msg;
  setTimeout(() => { status.textContent = ""; }, 2000);
}

async function init() {
  const lang = await getLang();
  applyLabels(lang);

  const stored = await new Promise(resolve =>
    chrome.storage.local.get(CONFIG_KEY, res => resolve(res[CONFIG_KEY] || {}))
  );
  const config = { ...DEFAULT_CONFIG, ...stored };

  populateForm(config);
  renderThresholds(config, lang);

  document.getElementById("save").addEventListener("click", () => {
    const newConfig = { ...config, ...readForm(), lang: config.lang };
    chrome.storage.local.set({ [CONFIG_KEY]: newConfig }, () => showStatus(t("options_saved", lang)));
  });

  document.getElementById("reset").addEventListener("click", () => {
    const reset = { ...DEFAULT_CONFIG, lang: config.lang };
    chrome.storage.local.set({ [CONFIG_KEY]: reset }, () => {
      populateForm(reset);
      renderThresholds(reset, lang);
      showStatus(t("options_reset_done", lang));
    });
  });
}

init();
