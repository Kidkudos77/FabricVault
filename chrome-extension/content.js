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

  // packages/extension/src/content.ts
  var import_webextension_polyfill = __toESM(__require("webextension-polyfill"));
  var import_injected = __toESM(__require("url:~src/injected"));
  var config = {
    matches: ["<all_urls>"],
    all_frames: true,
    run_at: "document_start"
  };
  function injectScript() {
    const script = document.createElement("script");
    script.src = import_injected.default;
    script.type = "text/javascript";
    script.onload = () => {
      script.remove();
    };
    document.documentElement.appendChild(script);
  }
  injectScript();
  var port = import_webextension_polyfill.default.runtime.connect({ name: "fabric" });
  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (event.source !== window || !msg || msg.from !== "webpage") {
      return;
    }
    if (msg.kind === "request") {
      port.postMessage(msg);
    }
  });
  port.onMessage.addListener((response) => {
    window.postMessage({ ...response, from: "content" }, "*");
  });
})();
