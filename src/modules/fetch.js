/**
 * @module modules/fetch
 * @description Handles fetching and parsing product pages via the background service worker.
 * Provides overlay UI during loading and extracts product data from HTML.
 */

import { MONTHS, parseDateTime, toISODateTime } from "../helpers.js";
import { t } from "../i18n.js";

/**
 * Fetches HTML content of a URL via the background service worker.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
export function fetchHTML(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "fetch", url }, (res) => {
      resolve(res?.html ?? null);
    });
  });
}

/**
 * Parses an HTML string into a Document.
 * @param {string} html
 * @returns {Document}
 */
export function parseHTML(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

/**
 * Creates a positioned overlay div inside a table row.
 * @param {HTMLTableRowElement} row
 * @param {string} [extraClass]
 * @returns {HTMLDivElement}
 */
export function createRowOverlay(row, extraClass) {
  row.style.position = "relative";
  const div = document.createElement("div");
  div.className = extraClass ? `pixelatoy-overlay ${extraClass}` : "pixelatoy-overlay";
  row.appendChild(div);
  return div;
}

/**
 * Creates an animated loading overlay positioned over a table row.
 * Call `overlay.remove()` to clean up (also clears the animation interval).
 * @param {HTMLTableRowElement} row
 * @returns {HTMLDivElement} The overlay element.
 */
export function createOverlay(row) {
  const overlayDiv = createRowOverlay(row);
  const dotsEl = document.createElement("span");
  dotsEl.className = "pixelatoy-dots";
  dotsEl.innerHTML = "<span>&bull;</span><span>&bull;</span><span>&bull;</span>";
  overlayDiv.appendChild(dotsEl);
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

/**
 * Resolves the product detail URL by navigating through the order detail page.
 * @param {HTMLTableRowElement} row - Table row containing the order link.
 * @param {string} key - Product name to match in the order page.
 * @returns {Promise<string|null>} Product URL or null.
 */
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

/**
 * Parses an availability text (e.g. "enero de 2025") into an ISO date string.
 * @param {string} text
 * @returns {string|null} `YYYY-MM-DD HH:MM` (day 01) or null.
 */
export function parseAvailableFrom(text) {
  const match = text.match(/([a-z\u00e1\u00e9\u00ed\u00f3\u00fa]+)\s+(?:de\s+)?(\d{4})/i);
  if (!match) return null;
  const mm = MONTHS[match[1].toLowerCase()];
  if (!mm) return null;
  return toISODateTime(match[2], mm, "01");
}

/**
 * Checks whether an HTML page is a valid product detail page.
 * @param {string} html
 * @returns {boolean}
 */
function isValidProductPage(html) {
  const doc = parseHTML(html);
  return !!doc.querySelector('h1.page-title[itemprop="name"]');
}

/**
 * Fetches and parses product data (date, availability, broken link status).
 * @param {string} productUrl - URL of the product detail page.
 * @param {function} normalizeDateTime - Date normalisation function.
 * @returns {Promise<{date: string|null, brokenLink: boolean, availableFrom: string|null, availableFromDate: string|null, comingSoon: string|null}>}
 */
export async function fetchDateFromProduct(productUrl, normalizeDateTime) {
  const empty = { date: null, brokenLink: false, availableFrom: null, availableFromDate: null };
  const productHTML = await fetchHTML(productUrl);
  if (!productHTML) return empty;

  if (!isValidProductPage(productHTML)) {
    return { ...empty, brokenLink: true };
  }

  const productDoc = parseHTML(productHTML);
  const urlLang = productUrl.match(/\/(es|en)\//)?.[1] ?? null;
  const labelDate = t("fetch_label_date", urlLang);
  const labelAvail = t("fetch_label_avail", urlLang);
  const dts = productDoc.querySelectorAll("dt.name");
  let date = null, availableFrom = null, availableFromDate = null, comingSoon = null;
  for (const dt of dts) {
    const label = dt.textContent.trim();
    const value = dt.nextElementSibling?.textContent.trim().replace(/\s+,/g, ",") || null;
    if (label === labelDate && value) {
      const normalized = normalizeDateTime(value);
      if (parseDateTime(normalized)) {
        date = normalized;
      } else {
        comingSoon = value;
      }
    } else if (label === labelAvail && value) {
      availableFrom = value;
      availableFromDate = parseAvailableFrom(value);
    }
  }
  return { date, brokenLink: false, availableFrom, availableFromDate, comingSoon };
}
