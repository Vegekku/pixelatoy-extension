/**
 * @module options
 * @description Options page logic: loads config from storage, renders controls,
 * saves changes and resets to defaults.
 */

import { CONFIG_KEY, DEFAULT_CONFIG, STORAGE_KEY } from "./helpers.js";
import { getLang, t } from "./i18n.js";
import { runMigrations } from "./migrations.js";

/** Valid keys for each product entry in STORAGE_KEY. */
const PRODUCT_SCHEMA = {
  date: ["string", "null"],
  img: ["string"],
  productUrl: ["string", "null"],
  brokenLink: ["boolean"],
  availableFrom: ["string", "null"],
  availableFromDate: ["string", "null"],
  comingSoon: ["string", "null"],
};

/** Valid keys for CONFIG_KEY. */
const CONFIG_SCHEMA = {
  notifications: "boolean",
  popup: "boolean",
  tabs: "boolean",
  thresholds: "array",
  colors: "array",
  defaultTab: "string",
  instructionsOpen: "boolean",
  lang: "string",
  schemaVersion: "string",
};

/**
 * Validates imported data structure against expected schemas.
 * Returns an object with `valid` boolean and `errors` array of messages.
 * @param {Object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateImportData(data) {
  const errors = [];

  if (data[CONFIG_KEY]) {
    const config = data[CONFIG_KEY];
    if (typeof config !== "object" || Array.isArray(config)) {
      errors.push(`${CONFIG_KEY} must be an object`);
    } else {
      for (const [key, value] of Object.entries(config)) {
        if (!(key in CONFIG_SCHEMA)) {
          errors.push(`${CONFIG_KEY}: unexpected key "${key}"`);
          continue;
        }
        const expected = CONFIG_SCHEMA[key];
        if (expected === "array" && !Array.isArray(value)) {
          errors.push(`${CONFIG_KEY}.${key}: expected array`);
        } else if (expected !== "array" && typeof value !== expected) {
          errors.push(`${CONFIG_KEY}.${key}: expected ${expected}, got ${typeof value}`);
        }
      }
      if (config.thresholds && Array.isArray(config.thresholds)) {
        if (config.thresholds.length !== 3 || !config.thresholds.every(n => typeof n === "number" && n > 0)) {
          errors.push(`${CONFIG_KEY}.thresholds: must be 3 positive numbers`);
        }
      }
      if (config.colors && Array.isArray(config.colors)) {
        if (config.colors.length !== 4 || !config.colors.every(c => c && typeof c.bg === "string" && typeof c.color === "string")) {
          errors.push(`${CONFIG_KEY}.colors: must be 4 objects with bg and color strings`);
        }
      }
      if (config.defaultTab && !["warehouse", "unavailable"].includes(config.defaultTab)) {
        errors.push(`${CONFIG_KEY}.defaultTab: must be "warehouse" or "unavailable"`);
      }
    }
  }

  if (data[STORAGE_KEY]) {
    const products = data[STORAGE_KEY];
    if (typeof products !== "object" || Array.isArray(products)) {
      errors.push(`${STORAGE_KEY} must be an object`);
    } else {
      for (const [name, entry] of Object.entries(products)) {
        if (typeof entry !== "object" || Array.isArray(entry) || entry === null) {
          errors.push(`${STORAGE_KEY}["${name}"]: must be an object`);
          continue;
        }
        for (const key of Object.keys(entry)) {
          if (!(key in PRODUCT_SCHEMA)) {
            errors.push(`${STORAGE_KEY}["${name}"]: unexpected key "${key}"`);
          }
        }
        for (const [key, allowedTypes] of Object.entries(PRODUCT_SCHEMA)) {
          if (key in entry && entry[key] !== null && entry[key] !== undefined) {
            if (!allowedTypes.includes(typeof entry[key]) && !(allowedTypes.includes("null") && entry[key] === null)) {
              errors.push(`${STORAGE_KEY}["${name}"].${key}: expected ${allowedTypes.join(" | ")}`);
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Applies i18n labels to the static elements of the page.
 * @param {string} lang
 * @param {string} version
 */
function applyLabels(lang, version) {
  document.title = t("options_title", lang);
  document.getElementById("sidebar-title").textContent = t("options_sidebar_title", lang);
  document.getElementById("tab-config").textContent = t("options_tab_config", lang);
  document.getElementById("tab-data").textContent = t("options_tab_data", lang);
  document.getElementById("tab-about").textContent = t("options_tab_about", lang);
  document.getElementById("title").textContent = t("options_tab_config", lang);
  document.getElementById("title-data").textContent = t("options_tab_data", lang);
  document.getElementById("title-about").textContent = t("options_tab_about", lang);
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
  document.getElementById("export").textContent = t("options_export", lang);
  document.getElementById("import").textContent = t("options_import", lang);
  document.getElementById("data-description-export").textContent = t("options_data_desc_export", lang);
  document.getElementById("data-description-import").textContent = t("options_data_desc_import", lang);
  document.getElementById("about-version").textContent = `${t("options_about_version", lang)} ${version}`;
  document.getElementById("about-store").textContent = t("options_about_store", lang);
  document.getElementById("about-changelog").textContent = t("options_about_changelog", lang);
  document.getElementById("about-issues").textContent = t("options_about_issues", lang);
  document.getElementById("about-privacy").textContent = t("options_about_privacy", lang);
  document.getElementById("about-donate").textContent = t("options_about_donate", lang);
  document.getElementById("about-support-text").textContent = t("options_about_support", lang);
}

/**
 * Initialises vertical tab navigation.
 */
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
    });
  });
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
  const el = document.getElementById("status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 2000);
}

/**
 * Shows a status message in the data section and clears it after 3 seconds.
 * @param {string} msg
 * @param {boolean} [error]
 */
function showDataStatus(msg, error = false) {
  const el = document.getElementById("data-status");
  el.textContent = msg;
  el.style.color = error ? "#a94442" : "#5cb85c";
  setTimeout(() => { el.textContent = ""; }, 3000);
}

async function init() {
  const lang = await getLang();
  const version = chrome.runtime.getManifest().version;
  applyLabels(lang, version);
  initTabs();

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

  document.getElementById("export").addEventListener("click", () => {
    chrome.storage.local.get([STORAGE_KEY, CONFIG_KEY], res => {
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pixelatoy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showDataStatus(t("options_export_done", lang));
    });
  });

  document.getElementById("import").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document.getElementById("import-file").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== "object" || Array.isArray(data)) throw new Error();
        const toStore = {};
        if (data[STORAGE_KEY] && typeof data[STORAGE_KEY] === "object") toStore[STORAGE_KEY] = data[STORAGE_KEY];
        if (data[CONFIG_KEY] && typeof data[CONFIG_KEY] === "object") toStore[CONFIG_KEY] = data[CONFIG_KEY];
        if (!Object.keys(toStore).length) throw new Error();

        const { valid, errors } = validateImportData(toStore);
        if (!valid) {
          console.warn("[Pixelatoy] Import validation errors:", errors);
          showDataStatus(t("options_import_error", lang), true);
          return;
        }

        chrome.storage.local.set(toStore, () => {
          runMigrations().then(() => location.reload());
        });
      } catch {
        showDataStatus(t("options_import_error", lang), true);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });
}

init();
