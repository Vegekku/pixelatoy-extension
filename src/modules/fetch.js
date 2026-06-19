import { MONTHS, parseDateTime, toISODateTime } from "../helpers.js";
import { t } from "../i18n.js";

export function fetchHTML(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "fetch", url }, (res) => {
      resolve(res?.html ?? null);
    });
  });
}

export function parseHTML(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

export function createOverlay(row) {
  const rect = row.getBoundingClientRect();
  const overlayDiv = document.createElement("div");
  overlayDiv.className = "pixelatoy-overlay";
  overlayDiv.style.cssText = `top:${rect.top + window.scrollY}px;left:${rect.left + window.scrollX}px;width:${rect.width}px;height:${rect.height}px;`;
  const dotsEl = document.createElement("span");
  dotsEl.className = "pixelatoy-dots";
  dotsEl.innerHTML = "<span>&bull;</span><span>&bull;</span><span>&bull;</span>";
  overlayDiv.appendChild(dotsEl);
  document.body.appendChild(overlayDiv);
  const spans = dotsEl.querySelectorAll("span");
  let frameIndex = 0;
  spans[0].classList.add("active");
  const interval = setInterval(() => {
    spans[frameIndex % 3].classList.remove("active");
    frameIndex++;
    spans[frameIndex % 3].classList.add("active");
  }, 400);
  const originalRemove = overlayDiv.remove.bind(overlayDiv);
  overlayDiv.remove = () => { clearInterval(interval); originalRemove(); };
  return overlayDiv;
}

export async function resolveProductUrl(row, key) {
  const rowCells = row.children;
  const lastCell = rowCells[rowCells.length - 1];
  const orderLink = lastCell.querySelector("a")?.href;
  if (!orderLink) return null;

  const orderHTML = await fetchHTML(orderLink);
  if (!orderHTML) return null;

  const orderDoc = parseHTML(orderHTML);
  const productLink = Array.from(orderDoc.querySelectorAll("a"))
    .find(a => a.textContent.trim() === key)?.href;
  return productLink || null;
}

export function parseAvailableFrom(text) {
  const match = text.match(/([a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+)\s+(?:de\s+)?(\d{4})/i);
  if (!match) return null;
  const mm = MONTHS[match[1].toLowerCase()];
  if (!mm) return null;
  return toISODateTime(match[2], mm, "01");
}

function isValidProductPage(html) {
  const doc = parseHTML(html);
  return !!doc.querySelector('h1.page-title[itemprop="name"]');
}

export async function fetchDateFromProduct(productUrl, normalizeDateTime) {
  const empty = { date: null, brokenLink: false, availableFrom: null, availableFromDate: null };
  const productHTML = await fetchHTML(productUrl);
  if (!productHTML) return empty;

  if (!isValidProductPage(productHTML)) {
    return { ...empty, brokenLink: true };
  }

  const productDoc = parseHTML(productHTML);
  const dts = productDoc.querySelectorAll("dt.name");
  let date = null, availableFrom = null, availableFromDate = null;
  for (const dt of dts) {
    const label = dt.textContent.trim();
    const value = dt.nextElementSibling?.textContent.trim() || null;
    if (label === t("fetch_label_date") && value) {
      const normalized = normalizeDateTime(value);
      date = parseDateTime(normalized) ? normalized : null;
    } else if (label === t("fetch_label_avail") && value) {
      availableFrom = value;
      availableFromDate = parseAvailableFrom(value);
    }
  }
  return { date, brokenLink: false, availableFrom, availableFromDate };
}
