const STORAGE_KEY = "pixelatoyTexts";
const ALARM_NAME = "pixelatoy-daily-check";
const PREORDER_URL = "https://www.pixelatoy.com/es/module/preorder/preorderorderdetails";

const NOTIFICATION_THRESHOLDS = [
  { days: 7, label: "⬛ Crítico (menos de 7 días)" },
  { days: 30, label: "🟥 Urgente (menos de 30 días)" },
  { days: 60, label: "🟧 Atención (menos de 60 días)" },
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

function buildNotificationMessage(data) {
  const now = new Date();
  const counts = NOTIFICATION_THRESHOLDS.map(() => 0);

  for (const dateStr of Object.values(data)) {
    const limit = addThreeMonths(dateStr);
    if (!limit) continue;
    const diffDays = (limit - now) / (1000 * 60 * 60 * 24);
    for (let i = 0; i < NOTIFICATION_THRESHOLDS.length; i++) {
      if (diffDays < NOTIFICATION_THRESHOLDS[i].days) {
        counts[i]++;
        break;
      }
    }
  }

  const lines = NOTIFICATION_THRESHOLDS
    .map((t, i) => counts[i] > 0 ? `${t.label}: ${counts[i]}` : null)
    .filter(Boolean);

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
      title: "Pixelatoy — Reservas en almacén",
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
