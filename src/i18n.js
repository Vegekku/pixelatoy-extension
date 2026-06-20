export const LANG = (typeof document !== "undefined"
  ? document.documentElement.lang
  : "es"
).slice(0, 2).toLowerCase();

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

    // orphans
    orphans_title:      "Reservas no encontradas",
    orphans_delete_all: "Eliminar todos",
    orphans_confirm:    "¿Eliminar todas las reservas no encontradas?",
    orphans_no_date:    "Sin fecha",
    orphans_entry:      "Entrada",
    orphans_limit:      "Límite",

    // fetch — selectores en la ficha del producto
    fetch_label_date:   "Entrada en almacén",
    fetch_label_avail:  "Disponibilidad",

    // popup
    popup_empty:        "No hay productos con urgencia",
    popup_btn:          "Ver reservas",

    // background
    notif_title:        "Pixelatoy — Reservas en almacén",

    // broken link tooltip
    broken_link_tooltip: "Este enlace puede no apuntar al producto correcto",

    // overlay buttons
    overlay_accept:     "Aplicar cambios",
    overlay_reject:     "Descartar cambios",
  },
  en: {
    threshold_7:        "Less than 7 days",
    threshold_30:       "Less than 30 days",
    threshold_60:       "Less than 60 days",
    threshold_inf:      "60 days or more",
    expired:            "Expired",

    col_header:         "In warehouse",
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

    orphans_title:      "Not found preorders",
    orphans_delete_all: "Delete all",
    orphans_confirm:    "Delete all not found preorders?",
    orphans_no_date:    "No date",
    orphans_entry:      "Entry",
    orphans_limit:      "Limit",

    fetch_label_date:   "Warehouse entry",
    fetch_label_avail:  "Availability",

    popup_empty:        "No urgent products",
    popup_btn:          "View preorders",

    notif_title:        "Pixelatoy — Preorders in warehouse",

    broken_link_tooltip: "This link may not point to the correct product",

    overlay_accept:     "Apply changes",
    overlay_reject:     "Discard changes",
  },
};

export function t(key) {
  return (MESSAGES[LANG] ?? MESSAGES.es)[key] ?? MESSAGES.es[key] ?? key;
}
