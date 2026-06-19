import { STORAGE_KEY, PREORDER_URL, THRESHOLDS, parseDateTime, addThreeMonths, groupByThreshold } from "./helpers.js";
import { t } from "./i18n.js";

const ALARM_NAME = "pixelatoy-daily-check";
const NOTIFICATION_THRESHOLDS = THRESHOLDS.filter(t => t.days !== Infinity);

function buildNotificationMessage(data) {
  const groups = groupByThreshold(data);
  const lines = THRESHOLDS
    .filter((t, i) => t.days !== Infinity && groups[i].length > 0)
    .map(t => {
      const i = THRESHOLDS.indexOf(t);
      return `${t.label}: ${groups[i].length}`;
    });
  return lines.length > 0 ? lines.join("\n") : null;
}

function checkAndNotify() {
  chrome.storage.local.get(STORAGE_KEY, (res) => {
    const data = res[STORAGE_KEY] || {};
    const message = buildNotificationMessage(data);
    if (!message) return;

    chrome.notifications.create("pixelatoy-alert", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: t("notif_title"),
      message,
      priority: 2,
      requireInteraction: true,
    });
  });
}

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
  checkAndNotify();
  scheduleAlarm();
});

chrome.runtime.onInstalled.addListener(() => {
  checkAndNotify();
  scheduleAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkAndNotify();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "fetch") {
    fetch(msg.url)
      .then(r => r.text())
      .then(html => sendResponse({ html }))
      .catch(() => sendResponse({ html: null }));
    return true; // async response
  }
});
