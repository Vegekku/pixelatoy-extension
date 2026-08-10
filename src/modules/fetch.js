/**
 * @module modules/fetch
 * @description Handles fetching and parsing product pages via the background service worker.
 * Provides overlay UI during loading and extracts product data from HTML.
 */

import { parseDateTime, DATA_INSERT, parseAvailableFrom, normalizeDateTime } from "../helpers.js";
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
  const orderLink = Array.from(row.querySelectorAll(`td:not([${DATA_INSERT}]) a`))
    .find(a => a.textContent.trim())?.href;
  if (!orderLink) return null;

  const orderHTML = await fetchHTML(orderLink);
  if (!orderHTML) return null;

  const orderDoc = parseHTML(orderHTML);
  const productLink = Array.from(orderDoc.querySelectorAll("a"))
    .find(a => a.textContent.trim() === key)?.href;
  return productLink || null;
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
 * Extracts the product reference (last number ≥7 digits) from a product URL.
 * @param {string} url
 * @returns {string|null}
 */
export function extractReference(url) {
  const match = url?.match(/-(\d{7,})(?:\.html|$)/i);
  return match ? match[1] : null;
}

/**
 * Resolves a product URL by querying the Pixelatoy search API with a product reference.
 * @param {string} reference - Product reference number.
 * @param {string} [lang="es"] - Language code for the API URL.
 * @returns {Promise<string|null>}
 */
export async function resolveUrlByReference(reference, lang = "es") {
  const apiUrl = `https://www.pixelatoy.com/${lang}/module/ambjolisearch/jolisearch?s=${reference}&ajax=true&use_rendered_products=false`;
  const raw = await fetchHTML(apiUrl);
  if (!raw) return null;
  try {
    const json = JSON.parse(raw);
    const rendered = json?.rendered_products ?? "";
    const match = rendered.match(/href="(https:\/\/www\.pixelatoy\.com\/[^"]+\.html)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Parses product data (date, availability) from an HTML string.
 * @param {string} html
 * @param {string} productUrl - Used to detect page language.
 * @returns {{date: string|null, availableFrom: string|null, availableFromDate: string|null, comingSoon: string|null}}
 */
function parseDateFromHTML(html, productUrl) {
  const productDoc = parseHTML(html);
  const urlLang = productUrl.match(/\/(es|en)\//)?.[1] ?? null;
  const labelDate = t("fetch_label_date", urlLang);
  const labelAvail = t("fetch_label_avail", urlLang);
  const labelAvailUpd = t("fetch_label_avail_upd", urlLang);
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
    } else if (label === labelAvailUpd && value) {
      availableFrom = value;
      availableFromDate = parseAvailableFrom(value);
    } else if (label === labelAvail && value && !availableFrom) {
      availableFrom = value;
      availableFromDate = parseAvailableFrom(value);
    }
  }
  return { date, availableFrom, availableFromDate, comingSoon };
}

/**
 * Fetches and parses product data (date, availability, broken link status).
 * When the product URL is broken, attempts to resolve it via the search API.
 * @param {string} productUrl - URL of the product detail page.
 * @returns {Promise<{date: string|null, brokenLink: boolean, resolvedUrl: string|null, availableFrom: string|null, availableFromDate: string|null, comingSoon: string|null}>}
 */
export async function fetchDateFromProduct(productUrl) {
  const empty = { date: null, brokenLink: false, resolvedUrl: null, availableFrom: null, availableFromDate: null, comingSoon: null };
  const productHTML = await fetchHTML(productUrl);
  if (!productHTML) return empty;

  if (!isValidProductPage(productHTML)) {
    const reference = extractReference(productUrl);
    if (!reference) return { ...empty, brokenLink: true };

    const lang = productUrl.match(/\/(es|en)\//)?.[1] ?? "es";
    const resolvedUrl = await resolveUrlByReference(reference, lang);
    if (!resolvedUrl) return { ...empty, brokenLink: true };

    const resolvedHTML = await fetchHTML(resolvedUrl);
    if (!resolvedHTML || !isValidProductPage(resolvedHTML)) {
      return { ...empty, brokenLink: true, resolvedUrl };
    }

    return { ...parseDateFromHTML(resolvedHTML, resolvedUrl), brokenLink: false, resolvedUrl };
  }

  return { ...parseDateFromHTML(productHTML, productUrl), brokenLink: false, resolvedUrl: null };
}
