import { THRESHOLDS } from "../helpers.js";

export function addLegend(refreshAllData) {
  const table = document.getElementById("preorder_list");
  if (!table || document.getElementById("pixelatoy-legend")) return;

  const style = document.createElement("style");
  style.textContent = `[data-placeholder]:empty:before { content: attr(data-placeholder); opacity: 0.4; pointer-events: none; font-size: 0.75em; white-space: pre; }
.pixelatoy-dots span { display:inline-block; font-size:3.5em; opacity:0.5; font-weight:400; transition:font-weight 0.2s, opacity 0.2s; }
.pixelatoy-dots span.active { font-weight:900; opacity:1; }
.pixelatoy-overlay { position:absolute; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.75); pointer-events:all; cursor:wait; z-index:10; }
.pixelatoy-info-overlay { background:rgba(217,237,255,0.95); cursor:default; justify-content:space-between; }
.pixelatoy-btn { font-size:16px;cursor:pointer;color:#fff;border:none;border-radius:3px;padding:4px 8px;transition:opacity 0.2s; }
.pixelatoy-btn:hover { opacity:0.8; }`;
  document.head.appendChild(style);

  const legend = document.createElement("div");
  legend.id = "pixelatoy-legend";
  legend.style.cssText = "margin-top:10px;display:flex;gap:16px;font-size:13px;align-items:center;";

  THRESHOLDS.forEach(({ bg, label }) => {
    const item = document.createElement("span");
    item.style.cssText = "display:flex;align-items:center;gap:6px;";
    item.innerHTML = `<span style="width:16px;height:16px;background:${bg};border-radius:3px;display:inline-block;"></span>${label}`;
    legend.appendChild(item);
  });

  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Refrescar datos";
  refreshBtn.className = "pixelatoy-btn";
  refreshBtn.style.cssText = "margin-left:auto;font-size:14px;background:#5cb85c;";
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = "0.5";
    try { await refreshAllData(); }
    finally { refreshBtn.disabled = false; refreshBtn.style.opacity = "1"; }
  });
  legend.appendChild(refreshBtn);

  table.insertAdjacentElement("afterend", legend);

  const now = new Date();
  const MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const exampleNaturalES = `${now.getDate()} ${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;
  const exampleNaturalEN = `${MONTHS_EN[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const instructions = document.createElement("div");
  instructions.style.cssText = "margin-top:10px;padding:10px 14px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#333;line-height:1.6;";
  instructions.innerHTML = `
    <strong style="cursor:pointer;user-select:none;" id="pixelatoy-instr-toggle">▶ Instrucciones de uso</strong>
    <ul id="pixelatoy-instr-list" style="display:none;margin:6px 0 0 0;padding-left:18px;">
      <li class="pixelatoy-instr-broken">La fecha de entrada y el enlace al producto se obtienen automáticamente al cargar la página. El nombre del producto es un enlace a su ficha. Si aparece <span class="pixelatoy-broken-icon"></span>, el enlace está roto.</li>
      <li>Usa "Refrescar datos" para actualizar la información manualmente y reintentar enlaces rotos. Solo se muestran filas con cambios.</li>
      <li>Para introducir o corregir la fecha manualmente, haz click en la celda de <em>En almacén</em>. Formatos aceptados: <code>YYYY-MM-DD</code>, <code>DD/MM/YYYY</code>, <code>DD mes YYYY</code> (ej: <code>${exampleNaturalES}</code>), <code>mes DD, YYYY</code> (ej: <code>${exampleNaturalEN}</code>), con o sin hora (<code>HH:MM</code>).</li>
      <li>Las columnas con &#9650;&#9660; permiten ordenar la tabla. Un click ordena ascendente, dos descendente y tres restaura el orden original.</li>
      <li>Si un producto desaparece de la tabla pero tiene datos guardados, aparece una sección <em>Reservas no encontradas</em> debajo con opción de eliminar.</li>
      <li>El icono de la extensión muestra un resumen de productos agrupados por urgencia.</li>
    </ul>
  `;
  const brokenIcon = document.createElement("span");
  brokenIcon.textContent = " ⛓️‍💥";
  instructions.querySelector(".pixelatoy-broken-icon").replaceWith(brokenIcon);
  const toggle = instructions.querySelector("#pixelatoy-instr-toggle");
  const list = instructions.querySelector("#pixelatoy-instr-list");
  toggle.addEventListener("click", () => {
    const open = list.style.display !== "none";
    list.style.display = open ? "none" : "block";
    toggle.innerHTML = (open ? "&#9654;" : "&#9660;") + " Instrucciones de uso";
  });
  legend.insertAdjacentElement("afterend", instructions);
}
