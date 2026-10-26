const toggle = document.getElementById("toggle");
const statusLabel = document.getElementById("status");
const message = document.getElementById("message");

function setStatus(enabled) {
  statusLabel.textContent = enabled ? "Inspector on" : "Inspector off";
}

function showError(error) {
  message.textContent = error instanceof Error ? error.message : String(error);
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0] || typeof tabs[0].id !== "number") {
    throw new Error("No active tab is available.");
  }
  return tabs[0];
}

async function sendInspectorState(enabled) {
  const tab = await getActiveTab();
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "DEVEYE_SET_ENABLED",
      enabled
    });
  } catch (error) {
    throw new Error("DevEye cannot run on this page.", { cause: error });
  }
}

async function initialize() {
  const stored = await chrome.storage.local.get({ enabled: false });
  toggle.checked = stored.enabled === true;
  setStatus(toggle.checked);

  try {
    await sendInspectorState(toggle.checked);
  } catch (error) {
    toggle.checked = false;
    setStatus(false);
    await chrome.storage.local.set({ enabled: false });
    showError(error);
  }
}

toggle.addEventListener("change", async () => {
  const enabled = toggle.checked;
  message.textContent = "";
  toggle.disabled = true;

  try {
    await sendInspectorState(enabled);
    await chrome.storage.local.set({ enabled });
    setStatus(enabled);
  } catch (error) {
    toggle.checked = !enabled;
    setStatus(toggle.checked);
    showError(error);
  } finally {
    toggle.disabled = false;
  }
});

initialize().catch(showError);
