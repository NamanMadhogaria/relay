// Keep capture in the studio page, whose lifetime is independent of the launcher.
let opening = false;
chrome.action.onClicked.addListener(async () => {
  if (opening) return;
  opening = true;
  try {
    const url = chrome.runtime.getURL('index.html');
    const tabs = await chrome.tabs.query({ url });
    if (tabs[0]?.id !== undefined) {
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url });
    }
  } finally {
    opening = false;
  }
});
