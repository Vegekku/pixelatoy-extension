/**
 * @module background
 * @description Service worker responsible for:
 * - Daily alarm to check urgency and send notifications.
 * - Handling fetch requests delegated from content scripts (to avoid CORS).
 */

import { STORAGE_KEY, CONFIG_KEY, DEFAULT_CONFIG, PREORDER_URL, THRESHOLDS, parseDateTime, addThreeMonths, groupByThreshold } from "./helpers.js";
import { t, getLang } from "./i18n.js";
import { runMigrations } from "./migrations.js";

const ALARM_NAME = "pixelatoy-daily-check";

/**
 * Builds a notification body summarising products by urgency.
 * @param {Object} data - Storage data keyed by product name.
 * @param {string} lang - Language code for labels.
 * @returns {string|null} Multi-line message or null if nothing to report.
 */
function buildNotificationMessage(data, lang) {
  const groups = groupByThreshold(data);
  const lines = THRESHOLDS
    .filter((th, i) => th.days !== Infinity && groups[i].length > 0)
    .map(th => {
      const i = THRESHOLDS.indexOf(th);
      return `${t(th.labelKey, lang)}: ${groups[i].length}`;
    });
  return lines.length > 0 ? lines.join("\n") : null;
}

/** Checks stored data and sends a Chrome notification if products need attention. */
async function checkAndNotify() {
  const lang = await getLang();
  chrome.storage.local.get([STORAGE_KEY, CONFIG_KEY], (res) => {
    const config = { ...DEFAULT_CONFIG, ...(res[CONFIG_KEY] || {}) };
    if (!config.notifications) return;
    const data = res[STORAGE_KEY] || {};
    const message = buildNotificationMessage(data, lang);
    if (!message) return;

    chrome.notifications.create("pixelatoy-alert", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: t("notif_title", lang),
      message,
      priority: 2,
      requireInteraction: true,
    });
  });
}

// Toggle popup when config changes
chrome.storage.onChanged.addListener((changes) => {
  if (!changes[CONFIG_KEY]) return;
  const config = { ...DEFAULT_CONFIG, ...(changes[CONFIG_KEY].newValue || {}) };
  if (config.popup) {
    chrome.action.setPopup({ popup: "popup.html" });
  } else {
    chrome.action.setPopup({ popup: "" });
  }
});

// Open preorder page on notification click
chrome.notifications.onClicked.addListener((id) => {
  if (id === "pixelatoy-alert") {
    chrome.tabs.create({ url: PREORDER_URL });
    chrome.notifications.clear(id);
  }
});

// Schedule daily alarm and check on startup
function scheduleAlarm() {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });
}

chrome.runtime.onStartup.addListener(() => {
  runMigrations().then(() => checkAndNotify());
  scheduleAlarm();
});

chrome.runtime.onInstalled.addListener(() => {
  runMigrations().then(() => checkAndNotify());
  scheduleAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkAndNotify();
});

// Delegated fetch for content scripts (avoids CORS restrictions)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "fetch") {
    fetch(msg.url)
      .then(r => r.text())
      .then(html => sendResponse({ html }))
      .catch(() => sendResponse({ html: null }));
    return true; // async response
  }
});
