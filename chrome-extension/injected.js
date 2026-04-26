(() => {
  // packages/extension/src/injected.ts
  var fabricVaultIconUrl = "";
  window.fabric = {
    request: (payload) => {
      return new Promise((resolve, reject) => {
        const id = generateId();
        const listener = (event) => {
          const msg = event.data;
          if (event.source !== window || !msg || msg.from === "webpage" || msg.kind !== "response" || msg.id !== id) {
            return;
          }
          window.removeEventListener("message", listener);
          if (msg.error) {
            reject(msg.error);
          } else {
            resolve(msg.result);
          }
        };
        window.addEventListener("message", listener);
        window.postMessage(
          {
            id,
            method: payload.method,
            params: payload.params,
            from: "webpage",
            kind: "request"
          },
          "*"
        );
      });
    },
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, /* @__PURE__ */ new Set());
      }
      listeners.get(event)?.add(handler);
      return this;
    },
    removeListener(event, handler) {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(handler);
      }
      return this;
    }
    //isFabricVault: true
  };
  var fabricProviderInfo = {
    uuid: generateId(),
    name: "Fabric Vault",
    icon: fabricVaultIconUrl,
    rdns: "dev.ifeanyiugwu.fabricvault"
  };
  function announceFabricProvider() {
    const detail = {
      info: fabricProviderInfo,
      provider: window.fabric
    };
    window.dispatchEvent(new CustomEvent("fabric:announceProvider", { detail }));
  }
  window.addEventListener(
    "fabric:requestProvider",
    () => {
      announceFabricProvider();
    },
    { once: true }
    // Only respond to the first request to avoid spamming, subsequent requests on a single page load might not be needed
  );
  announceFabricProvider();
  function generateId() {
    return `fab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  var listeners = /* @__PURE__ */ new Map();
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (event.source !== window || !msg || msg.from === "webpage" || msg.kind !== "event")
      return;
    const { type, result } = msg;
    if (type && listeners.has(type)) {
      listeners.get(type)?.forEach((handler) => handler(result));
    }
  });
})();
