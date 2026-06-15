import { STORAGE_KEY, PREORDER_URL, THRESHOLDS, groupByThreshold } from "./helpers.js";

chrome.storage.local.get(STORAGE_KEY, (res) => {
  const data = res[STORAGE_KEY] || {};
  const content = document.getElementById("content");
  const groups = groupByThreshold(data);
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
