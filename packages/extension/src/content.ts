import browser from "webextension-polyfill"

function injectScript() {
  const script = document.createElement("script")
  script.src = chrome.runtime.getURL("injected.js")
  script.type = "text/javascript"
  script.onload = () => {
    script.remove() // Clean up after injection
  }
  document.documentElement.appendChild(script)
}

injectScript()

const port = browser.runtime.connect({ name: "fabric" })

window.addEventListener("message", (event) => {
  const msg = event.data
  if (event.source !== window || !msg || msg.from !== "webpage") {
    return
  }

  // Forward message to background script
  if (msg.kind === "request") {
    port.postMessage(msg)
  }
})

port.onMessage.addListener((response) => {
  // Receive response and events from background script and forward to the dapp via the injected script
  window.postMessage({ ...response, from: "content" }, "*")
})
