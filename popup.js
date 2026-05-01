const STORAGE_KEY = "pixelatoyTexts";
const PREORDER_URL = "https://www.pixelatoy.com/es/module/preorder/preorderorderdetails";

const THRESHOLDS = [
  { days: 7, label: "Menos de 7 días", bg: "#000", color: "#fff" },
  { days: 30, label: "Menos de 30 días", bg: "#d9534f", color: "#fff" },
  { days: 60, label: "Menos de 60 días", bg: "#f0ad4e", color: "#000" },
];

function parseDateTime(value) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
}

function addThreeMonths(dateStr) {
  const date = parseDateTime(dateStr);
  if (!date) return null;
  date.setMonth(date.getMonth() + 3);
  return date;
}

chrome.storage.local.get(STORAGE_KEY, (res) => {
  const data = res[STORAGE_KEY] || {};
  const content = document.getElementById("content");
  const now = new Date();
  const groups = THRESHOLDS.map(() => []);

  for (const [name, entry] of Object.entries(data)) {
    const dateStr = entry.date;
    const img = entry.img || "";
    const limit = addThreeMonths(dateStr);
    if (!limit) continue;
    const diffDays = (limit - now) / (1000 * 60 * 60 * 24);
    for (let i = 0; i < THRESHOLDS.length; i++) {
      if (diffDays < THRESHOLDS[i].days) {
        groups[i].push({ name, img });
        break;
      }
    }
  }

  const hasAny = groups.some(g => g.length > 0);

  if (!hasAny) {
    content.innerHTML = '<div class="empty">No hay productos con urgencia</div>';
  } else {
    THRESHOLDS.forEach((t, i) => {
      if (groups[i].length === 0) return;
      const wrapper = document.createElement("div");

      const div = document.createElement("div");
      div.className = "range";
      div.innerHTML = `<span class="arrow">▶</span><span class="dot" style="background:${t.bg}"></span><span>${t.label}</span><span class="count">${groups[i].length}</span>`;

      const list = document.createElement("div");
      list.className = "products";
      groups[i].forEach(({ name, img }) => {
        if (img) {
          const el = document.createElement("img");
          el.src = img;
          el.title = name;
          list.appendChild(el);
        } else {
          const el = document.createElement("div");
          el.className = "no-img";
          el.title = name;
          el.textContent = "?";
          list.appendChild(el);
        }
      });

      div.addEventListener("click", () => {
        list.classList.toggle("open");
        div.querySelector(".arrow").classList.toggle("open");
      });

      wrapper.appendChild(div);
      wrapper.appendChild(list);
      content.appendChild(wrapper);
    });
  }

  const btn = document.createElement("a");
  btn.className = "btn";
  btn.textContent = "Ver reservas";
  btn.href = PREORDER_URL;
  btn.target = "_blank";
  content.appendChild(btn);
});
