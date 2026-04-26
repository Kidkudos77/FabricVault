(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // packages/extension/src/injected.ts
  var import_icon = __toESM(__require("data-base64:assets/icon.png"));
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
    icon: import_icon.default,
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
