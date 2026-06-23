import { STORAGE_KEY, THRESHOLDS, groupByThreshold } from "./helpers.js";
import { t, getLang } from "./i18n.js";

getLang().then(lang => {
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    document.getElementById("title").textContent = t("popup_title", lang);
    const data = res[STORAGE_KEY] || {};
    const content = document.getElementById("content");
    const groups = groupByThreshold(data);
    const hasAny = groups.some(g => g.length > 0);

    if (!hasAny) {
      content.innerHTML = `<div class="empty">${t("popup_empty", lang)}</div>`;
    } else {
      THRESHOLDS.forEach((th, i) => {
        if (groups[i].length === 0) return;
        const wrapper = document.createElement("div");

        const div = document.createElement("div");
        div.className = "range";
        div.innerHTML = `<span class="arrow">▶</span><span class="dot" style="background:${th.bg}"></span><span>${t(th.labelKey, lang)}</span><span class="count">${groups[i].length}</span>`;

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
    btn.textContent = t("popup_btn", lang);
    btn.href = `https://www.pixelatoy.com/${lang}/module/preorder/preorderorderdetails`;
    btn.target = "_blank";
    content.appendChild(btn);
  });
});
