/**
 * @module i18n
 * @description Internationalisation support (ES/EN).
 *
 * - In content scripts: LANG is derived from the page's `document.documentElement.lang`.
 * - In popup/background (no page context): LANG falls back to "en".
 * - The popup and background read the actual language via `getLang()` from storage.
 */

import { CONFIG_KEY, DEFAULT_CONFIG } from "./helpers.js";

/** Current language code detected from the page or fallback. */
export const LANG = (
  typeof document !== "undefined" && document.documentElement.lang
    ? document.documentElement.lang
    : "en"
).slice(0, 2).toLowerCase();

/**
 * Reads the saved page language from storage (set by content.js).
 * Used by popup and background where document.lang is unavailable.
 * @returns {Promise<string>} Language code ("es" or "en").
 */
export function getLang() {
  return new Promise(resolve => {
    chrome.storage.local.get(CONFIG_KEY, res => resolve((res[CONFIG_KEY]?.lang) || DEFAULT_CONFIG.lang));
  });
}

/** Persists the current page language to storage. Called by content.js on load. */
export function saveLang() {
  chrome.storage.local.get(CONFIG_KEY, res => {
    const config = { ...DEFAULT_CONFIG, ...(res[CONFIG_KEY] || {}), lang: LANG };
    chrome.storage.local.set({ [CONFIG_KEY]: config });
  });
}

const MESSAGES = {
  es: {
    // helpers
    threshold_7:        "Menos de 7 días",
    threshold_30:       "Menos de 30 días",
    threshold_60:       "Menos de 60 días",
    threshold_inf:      "60 días o más",
    expired:            "Vencido",

    // column
    col_header:         "En almacén",
    col_header_avail:   "Disponibilidad",
    tab_warehouse:      "En almacén",
    tab_unavailable:    "No disponible",
    not_available:      "No disponible",
    placeholder:        "YYYY-MM-DD\n(hora opcional)",
    tooltip_formats:    "Formatos aceptados: 2024-03-15, 15/03/2024, 15 marzo 2024, February 23 2026",
    tooltip_error:      "Formato no válido. Ej: 2024-03-15, 15/03/2024, 15 marzo 2024 o February 23 2026",

    // legend
    refresh_btn:        "Refrescar datos",
    instr_toggle:       "Instrucciones de uso",
    instr_1:            "La fecha de entrada y el enlace al producto se obtienen automáticamente al cargar la página. El nombre del producto es un enlace a su ficha. Si aparece BROKEN_ICON, el enlace está roto.",
    instr_2:            "Usa \"Refrescar datos\" para actualizar la información manualmente y reintentar enlaces rotos. Solo se muestran filas con cambios.",
    instr_3_a:          "Para introducir o corregir la fecha manualmente, haz click en la celda de",
    instr_3_b:          ". Formatos aceptados:",
    instr_3_c:          ", con o sin hora",
    instr_4:            "Las columnas con ▲▼ permiten ordenar la tabla. Un click ordena ascendente, dos descendente y tres restaura el orden original.",
    instr_5:            "Si un producto desaparece de la tabla pero tiene datos guardados, aparece una sección Reservas no encontradas debajo con opción de eliminar.",
    instr_6:            "El icono de la extensión muestra un resumen de productos agrupados por urgencia.",
    instr_7:            "Puedes personalizar umbrales, colores y notificaciones desde las opciones: click derecho en el icono de la extensión → Opciones.",

    // orphans
    orphans_title:      "Reservas no encontradas",
    orphans_delete_all: "Eliminar todos",
    orphans_confirm:    "¿Eliminar todas las reservas no encontradas?",
    orphans_no_date:    "Sin fecha",
    orphans_entry:      "Entrada",
    orphans_limit:      "Límite",

    // fetch — product page labels
    fetch_label_date:   "Entrada en almacén",
    fetch_label_avail:  "Disponibilidad",
    coming_soon:        "Muy pronto (Llegada en 1-2 semanas aproximadamente)",

    // popup
    popup_title:        "Reservas en almacén",
    popup_empty:        "No hay productos con urgencia",
    popup_btn:          "Ver reservas",

    // background
    notif_title:        "Pixelatoy — Reservas en almacén",

    // broken link tooltip
    broken_link_tooltip: "Este enlace puede no apuntar al producto correcto",

    // overlay buttons
    overlay_accept:     "Aplicar cambios",
    overlay_reject:     "Descartar cambios",

    // options page
    options_title:           "Pixelatoy — Opciones",
    options_h_general:       "General",
    options_h_urgency:       "Umbrales de urgencia",
    options_l_notifications: "Notificaciones push",
    options_l_popup:         "Popup del icono",
    options_l_tabs:          "Pestañas En almacén / No disponible",
    options_l_default_tab:   "Pestaña por defecto",
    options_opt_warehouse:   "En almacén",
    options_opt_unavailable: "No disponible",
    options_l_instructions:  "Instrucciones expandidas por defecto",
    options_h_days:          "Días",
    options_h_bg:            "Fondo",
    options_h_text:          "Texto",
    options_threshold_0:     "Crítico (negro)",
    options_threshold_1:     "Alto (rojo)",
    options_threshold_2:     "Medio (naranja)",
    options_threshold_3:     "Bajo (verde)",
    options_save:            "Guardar",
    options_reset:           "Restablecer",
    options_saved:           "Guardado. Los cambios se aplicarán al recargar la página de reservas.",
    options_reset_done:      "Configuración restablecida. La configuración se aplicará al recargar la página de reservas.",
  },
  en: {
    threshold_7:        "Less than 7 days",
    threshold_30:       "Less than 30 days",
    threshold_60:       "Less than 60 days",
    threshold_inf:      "60 days or more",
    expired:            "Expired",

    col_header:         "In warehouse",
    col_header_avail:   "Availability",
    tab_warehouse:      "In warehouse",
    tab_unavailable:    "Not available",
    not_available:      "Not Allowed For Now",
    placeholder:        "YYYY-MM-DD\n(time optional)",
    tooltip_formats:    "Accepted formats: 2024-03-15, 15/03/2024, 15 March 2024, February 23 2026",
    tooltip_error:      "Invalid format. E.g.: 2024-03-15, 15/03/2024, 15 March 2024 or February 23 2026",

    refresh_btn:        "Refresh data",
    instr_toggle:       "Usage instructions",
    instr_1:            "The warehouse entry date and product link are fetched automatically on page load. The product name is a link to its page. If BROKEN_ICON appears, the link is broken.",
    instr_2:            "Use \"Refresh data\" to manually update information and retry broken links. Only rows with changes are shown.",
    instr_3_a:          "To manually enter or correct the date, click the",
    instr_3_b:          "cell. Accepted formats:",
    instr_3_c:          ", with or without time",
    instr_4:            "Columns with ▲▼ can be sorted. One click sorts ascending, two descending, three restores the original order.",
    instr_5:            "If a product disappears from the table but has saved data, a Not found preorders section appears below with a delete option.",
    instr_6:            "The extension icon shows a summary of products grouped by urgency.",
    instr_7:            "You can customise thresholds, colours and notifications from the options: right-click the extension icon → Options.",

    orphans_title:      "Not found preorders",
    orphans_delete_all: "Delete all",
    orphans_confirm:    "Delete all not found preorders?",
    orphans_no_date:    "No date",
    orphans_entry:      "Entry",
    orphans_limit:      "Limit",

    fetch_label_date:   "Warehouse entry",
    fetch_label_avail:  "Availability",
    coming_soon:        "Coming soon (Arrival in approximately 1-2 weeks)",

    popup_title:        "Preorders in warehouse",
    popup_empty:        "No urgent products",
    popup_btn:          "View preorders",

    notif_title:        "Pixelatoy — Preorders in warehouse",

    broken_link_tooltip: "This link may not point to the correct product",

    overlay_accept:     "Apply changes",
    overlay_reject:     "Discard changes",

    // options page
    options_title:           "Pixelatoy — Options",
    options_h_general:       "General",
    options_h_urgency:       "Urgency thresholds",
    options_l_notifications: "Push notifications",
    options_l_popup:         "Extension icon popup",
    options_l_tabs:          "Tabs In warehouse / Not available",
    options_l_default_tab:   "Default tab",
    options_opt_warehouse:   "In warehouse",
    options_opt_unavailable: "Not available",
    options_l_instructions:  "Show instructions expanded by default",
    options_h_days:          "Days",
    options_h_bg:            "Background",
    options_h_text:          "Text",
    options_threshold_0:     "Critical (black)",
    options_threshold_1:     "High (red)",
    options_threshold_2:     "Medium (orange)",
    options_threshold_3:     "Low (green)",
    options_save:            "Save",
    options_reset:           "Reset to defaults",
    options_saved:           "Saved. Changes will apply when you reload the preorders page.",
    options_reset_done:      "Settings reset to defaults. Settings will apply when you reload the preorders page.",
  },
};

/**
 * Returns the translated string for the given key.
 * @param {string} key - Message key from MESSAGES.
 * @param {string|null} [lang] - Language override; defaults to LANG.
 * @returns {string}
 */
export function t(key, lang) {
  const l = lang ?? LANG;
  return (MESSAGES[l] ?? MESSAGES.en)[key] ?? MESSAGES.en[key] ?? key;
}

/**
 * Generates a threshold label dynamically based on the days value.
 * @param {number} days - Threshold days (Infinity for the last bucket).
 * @param {number|null} [prevDays] - Previous threshold's days (used when days is Infinity).
 * @param {string|null} [lang] - Language override; defaults to LANG.
 * @returns {string}
 */
export function thresholdLabel(days, prevDays, lang) {
  const l = lang ?? LANG;
  if (days === Infinity) {
    return l === "es" ? `${prevDays} días o más` : `${prevDays} days or more`;
  }
  return l === "es" ? `Menos de ${days} días` : `Less than ${days} days`;
}

const MONTHS_BY_NUM = {
  es: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};

const MONTHS_TO_NUM = {};
for (const [lang, arr] of Object.entries(MONTHS_BY_NUM)) {
  arr.forEach((m, i) => { MONTHS_TO_NUM[m.toLowerCase()] = i + 1; });
}

/**
 * Translates an availability text to the current page language.
 * Uses availableFromDate (ISO) when available to avoid re-parsing already-translated text.
 * @param {string|null|undefined} text - Raw or translated availability text.
 * @param {string|null|undefined} isoDate - Parsed date in `YYYY-MM-DD HH:MM` format.
 * @returns {string|null|undefined}
 */
export function translateAvailableFrom(text, isoDate) {
  if (!text) return text;

  // If we have a parsed ISO date, reconstruct the translated string from it
  if (isoDate) {
    const match = isoDate.match(/^(\d{4})-(\d{2})/);
    if (match) {
      const mm = Number(match[2]);
      const yyyy = match[1];
      const monthName = (MONTHS_BY_NUM[LANG] ?? MONTHS_BY_NUM.es)[mm - 1];
      return LANG === "en"
        ? `Estimated availability in ${monthName} ${yyyy}`
        : `Disponibilidad estimada en ${monthName} de ${yyyy}`;
    }
  }

  // Fallback: try to parse the text directly (raw text from Pixelatoy)
  const match = text.match(/([a-z\u00e0-\u00ff]+)\s+(\d{4})/i);
  if (!match) return text;
  const mm = MONTHS_TO_NUM[match[1].toLowerCase()];
  if (!mm) return text;
  const yyyy = match[2];
  const monthName = (MONTHS_BY_NUM[LANG] ?? MONTHS_BY_NUM.es)[mm - 1];
  return LANG === "en"
    ? `Estimated availability in ${monthName} ${yyyy}`
    : `Disponibilidad estimada en ${monthName} de ${yyyy}`;
}

/**
 * Translates a "coming soon" text to the current page language.
 * @param {string|null|undefined} text - Raw coming-soon text.
 * @returns {string|null|undefined}
 */
export function translateComingSoon(text) {
  if (!text) return text;
  if (text === t("coming_soon", "es") || text === t("coming_soon", "en")) return t("coming_soon");
  return text;
}
