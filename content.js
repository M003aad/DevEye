(() => {
  let enabled = false;
  let hoveredElement = null;
  let tooltip = null;
  let modal = null;
  let paused = false;
  let uiHost = null;
  let uiRoot = null;

  function ensureUiRoot() {
    if (!uiHost) {
      uiHost = document.createElement("div");
      uiHost.style.cssText = [
        "all: initial !important",
        "display: block !important",
        "position: fixed !important",
        "inset: 0 !important",
        "z-index: 2147483647 !important",
        "pointer-events: none !important"
      ].join(";");
      uiRoot = uiHost.attachShadow({ mode: "open" });

      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = chrome.runtime.getURL("overlay.css");
      uiRoot.appendChild(stylesheet);
      uiRoot.addEventListener("click", (event) => event.stopPropagation());
    }

    if (!uiHost.isConnected) {
      document.documentElement.appendChild(uiHost);
    }

    return uiRoot;
  }

  function isUiEvent(event) {
    return event.composedPath().includes(uiHost);
  }

  function rgbToHex(color) {
    const match = color.match(/\d+(?:\.\d+)?/g);
    if (!match || match.length < 3) {
      return color;
    }

    return `#${match
      .slice(0, 3)
      .map((value) => Number.parseInt(value, 10).toString(16).padStart(2, "0"))
      .join("")}`
      .toUpperCase();
  }

  function shortenFontFamily(fontFamily) {
    let quote = null;
    let firstComma = -1;

    for (let index = 0; index < fontFamily.length; index += 1) {
      const character = fontFamily[index];
      if ((character === "'" || character === '"') && fontFamily[index - 1] !== "\\") {
        quote = quote === character ? null : quote || character;
      } else if (character === "," && !quote) {
        firstComma = index;
        break;
      }
    }

    const primaryFont = (firstComma === -1
      ? fontFamily
      : fontFamily.slice(0, firstComma)
    ).trim();

    return firstComma === -1 ? primaryFont : `${primaryFont} ...`;
  }

  function getElementData(element) {
    const styles = window.getComputedStyle(element);
    return {
      fontFamily: shortenFontFamily(styles.fontFamily),
      fontSize: styles.fontSize,
      color: rgbToHex(styles.color),
      backgroundColor: rgbToHex(styles.backgroundColor)
    };
  }

  function ensureTooltip() {
    if (tooltip) {
      return;
    }

    tooltip = document.createElement("div");
    tooltip.className = "deveye-tooltip";
    tooltip.setAttribute("role", "status");
    ensureUiRoot().appendChild(tooltip);
  }

  function updateTooltip(element, event) {
    ensureTooltip();
    const data = getElementData(element);
    tooltip.innerHTML = `
      <div><strong>Font:</strong> ${escapeHtml(data.fontFamily)}</div>
      <div><strong>Size:</strong> ${escapeHtml(data.fontSize)}</div>
      <div><strong>Text:</strong> <span class="deveye-color" style="background:${escapeHtml(data.color)}"></span>${escapeHtml(data.color)}</div>
      <div><strong>Background:</strong> <span class="deveye-color" style="background:${escapeHtml(data.backgroundColor)}"></span>${escapeHtml(data.backgroundColor)}</div>
    `;
    positionTooltip(event);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function positionTooltip(event) {
    if (!tooltip) {
      return;
    }

    const offset = 14;
    const maxLeft = window.innerWidth - tooltip.offsetWidth - 8;
    const maxTop = window.innerHeight - tooltip.offsetHeight - 8;
    tooltip.style.left = `${Math.max(8, Math.min(event.clientX + offset, maxLeft))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(event.clientY + offset, maxTop))}px`;
  }

  function copyText(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        if (button.isConnected) {
          button.textContent = originalText;
        }
      }, 1000);
    }).catch((error) => {
      console.error("DevEye could not copy CSS properties.", error);
    });
  }

  function createPropertyRow(label, value) {
    const row = document.createElement("div");
    row.className = "deveye-property";

    const content = document.createElement("div");
    content.className = "deveye-property-content";
    const name = document.createElement("span");
    name.className = "deveye-property-name";
    name.textContent = label;
    const valueElement = document.createElement("span");
    valueElement.className = "deveye-property-value";
    valueElement.textContent = value;
    content.append(name, valueElement);

    const copyButton = document.createElement("button");
    copyButton.className = "deveye-copy-button";
    copyButton.type = "button";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", (event) => {
      event.stopPropagation();
      copyText(value, copyButton);
    });
    row.append(content, copyButton);
    return row;
  }

  function showModal(element, data) {
    tooltip?.remove();
    tooltip = null;
    modal?.remove();

    modal = document.createElement("section");
    modal.className = "deveye-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "DevEye CSS properties");

    const header = document.createElement("div");
    header.className = "deveye-modal-header";
    const title = document.createElement("h2");
    title.textContent = "CSS Inspector";
    const closeButton = document.createElement("button");
    closeButton.className = "deveye-close-button";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close inspector");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      disable();
    });
    header.append(title, closeButton);

    const properties = document.createElement("div");
    properties.className = "deveye-properties";
    properties.append(
      createPropertyRow("Font Family", data.fontFamily),
      createPropertyRow("Font Size", data.fontSize),
      createPropertyRow("Text Color", data.color),
      createPropertyRow("Background Color", data.backgroundColor)
    );

    const copyAllButton = document.createElement("button");
    copyAllButton.className = "deveye-copy-all-button";
    copyAllButton.type = "button";
    copyAllButton.textContent = "Copy All";
    copyAllButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const text = [
        `Font Family: ${data.fontFamily}`,
        `Font Size: ${data.fontSize}`,
        `Text Color: ${data.color}`,
        `Background Color: ${data.backgroundColor}`
      ].join("\n");
      copyText(text, copyAllButton);
    });

    modal.append(header, properties, copyAllButton);
    ensureUiRoot().appendChild(modal);

    const bounds = element.getBoundingClientRect();
    const left = Math.min(
      Math.max(12, bounds.left),
      window.innerWidth - modal.offsetWidth - 12
    );
    const top = bounds.bottom + 12 + modal.offsetHeight <= window.innerHeight
      ? bounds.bottom + 12
      : Math.max(12, bounds.top - modal.offsetHeight - 12);
    modal.style.left = `${left}px`;
    modal.style.top = `${top}px`;
  }

  function handleMouseOver(event) {
    if (paused || isUiEvent(event)) {
      return;
    }

    const element = event.target instanceof Element ? event.target : null;
    if (!element) {
      return;
    }

    if (hoveredElement) {
      hoveredElement.classList.remove("deveye-highlight");
    }
    hoveredElement = element;
    hoveredElement.classList.add("deveye-highlight");
    updateTooltip(element, event);
  }

  function handleMouseMove(event) {
    if (!paused && !isUiEvent(event)) {
      positionTooltip(event);
    }
  }

  function handleClick(event) {
    if (isUiEvent(event)) {
      return;
    }

    if (paused) {
      event.preventDefault();
      event.stopPropagation();
      disable();
      return;
    }

    const element = event.target instanceof Element ? event.target : null;
    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    paused = true;
    const data = getElementData(element);
    showModal(element, data);
  }

  function enable() {
    if (enabled) {
      return;
    }

    enabled = true;
    paused = false;
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
  }

  function disable() {
    enabled = false;
    paused = false;
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    hoveredElement?.classList.remove("deveye-highlight");
    hoveredElement = null;
    tooltip?.remove();
    tooltip = null;
    modal?.remove();
    modal = null;
    uiHost?.remove();
    chrome.storage.local.set({ enabled: false }).catch((error) => {
      console.error("DevEye could not persist its disabled state.", error);
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "DEVEYE_SET_ENABLED") {
      return;
    }

    if (message.enabled === true) {
      enable();
    } else {
      disable();
    }
    sendResponse({ enabled });
  });
})();
