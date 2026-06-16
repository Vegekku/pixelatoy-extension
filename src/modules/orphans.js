import { STORAGE_KEY, addThreeMonths, formatCountdown, getDataRows } from "../helpers.js";

const COLUMN_INDEX_KEY = 2;

function getRowKey(row) {
  const cell = row.children[COLUMN_INDEX_KEY];
  return cell?.querySelector("a.pixelatoy-link")?.textContent.trim() || cell?.textContent.trim();
}

export function checkOrphanData() {
  const table = document.getElementById("preorder_list");
  if (!table) return;

  const existing = document.getElementById("pixelatoy-orphans");
  if (existing) existing.remove();

  const tableKeys = new Set();
  getDataRows(table).forEach((row) => {
    const key = getRowKey(row);
    if (key) tableKeys.add(key);
  });

  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const data = res[STORAGE_KEY] || {};
    const orphans = Object.entries(data).filter(([key]) => !tableKeys.has(key));
    if (orphans.length === 0) return;

    const container = document.createElement("div");
    container.id = "pixelatoy-orphans";
    container.style.cssText = "margin-top:14px;padding:12px 14px;background:#fff3cd;border:1px solid #ffc107;border-radius:4px;font-size:13px;color:#333;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
    const toggle = document.createElement("strong");
    toggle.style.cssText = "cursor:pointer;user-select:none;";
    toggle.textContent = `▶ Reservas no encontradas (${orphans.length})`;
    toggle.addEventListener("click", () => {
      const open = list.style.display !== "none";
      list.style.display = open ? "none" : "flex";
      toggle.textContent = `${open ? "▶" : "▼"} Reservas no encontradas (${orphans.length})`;
    });
    header.appendChild(toggle);

    const deleteAllBtn = document.createElement("button");
    deleteAllBtn.textContent = "Eliminar todos";
    deleteAllBtn.style.cssText = "background:#d9534f;color:#fff;border:none;padding:4px 10px;border-radius:3px;cursor:pointer;font-size:12px;";
    deleteAllBtn.addEventListener("click", () => {
      if (!confirm("¿Eliminar todas las reservas no encontradas?")) return;
      chrome.storage.local.get(STORAGE_KEY, (res) => {
        const d = res[STORAGE_KEY] || {};
        orphans.forEach(([key]) => delete d[key]);
        chrome.storage.local.set({ [STORAGE_KEY]: d }, () => container.remove());
      });
    });
    header.appendChild(deleteAllBtn);
    container.appendChild(header);

    const list = document.createElement("div");
    list.style.cssText = "display:none;flex-direction:column;gap:6px;margin-top:8px;";

    orphans.forEach(([key, { date: dateStr, img, productUrl }]) => {
      const limitDate = addThreeMonths(dateStr);
      const status = limitDate ? formatCountdown(limitDate) : "Sin fecha";

      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#fff;border-radius:3px;gap:8px;";

      if (img) {
        const thumb = document.createElement("img");
        thumb.src = img;
        thumb.style.cssText = "width:40px;height:40px;object-fit:contain;flex-shrink:0;";
        row.appendChild(thumb);
      }

      const info = document.createElement("span");
      const nameEl = productUrl
        ? `<a href="${productUrl}" target="_blank" style="color:inherit;font-weight:bold;">${key}</a>`
        : `<strong>${key}</strong>`;
      info.innerHTML = `${nameEl}<br><small>Entrada: ${dateStr} · Límite: ${status}</small>`;
      info.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;";

      const delBtn = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.style.cssText = "background:#d9534f;color:#fff;border:none;width:24px;height:24px;border-radius:3px;cursor:pointer;font-size:14px;flex-shrink:0;margin-left:8px;";
      delBtn.addEventListener("click", () => {
        chrome.storage.local.get(STORAGE_KEY, (res) => {
          const d = res[STORAGE_KEY] || {};
          delete d[key];
          chrome.storage.local.set({ [STORAGE_KEY]: d }, () => {
            row.remove();
            const remaining = list.children.length;
            if (remaining === 0) container.remove();
            else toggle.textContent = `▼ Reservas no encontradas (${remaining})`;
          });
        });
      });

      row.appendChild(info);
      row.appendChild(delBtn);
      list.appendChild(row);
    });

    container.appendChild(list);

    const instructions = document.querySelector("#pixelatoy-legend + div");
    if (instructions) instructions.insertAdjacentElement("afterend", container);
    else table.insertAdjacentElement("afterend", container);
  });
}
