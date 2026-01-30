document.getElementById("save").addEventListener("click", () => {
  const key = document.getElementById("key").value.trim();
  const text = document.getElementById("text").value.trim();

  if (!key) return;

  chrome.storage.local.get("pixelatoyTexts", (result) => {
    const data = result.pixelatoyTexts || {};
    data[key] = text;

    chrome.storage.local.set({ pixelatoyTexts: data }, () => {
      window.close();
    });
  });
});