import browser from "webextension-polyfill"

import { handlePortConnection } from "~handlers/port"

/**
 * Keep service worker alive to maintain WebSocket connections for dApp subscriptions.
 *
 * MV3 service workers terminate after 30s of inactivity, which closes WebSocket connections
 * and breaks active subscriptions. Since subscriptions require persistent connections and
 * there's no way to resume WebSocket state after service worker restart, we must prevent
 * termination while subscriptions are active.
 */

const KEEP_ALIVE_INTERVAL = 25 * 1000 // 25 seconds

const keepAlive = setInterval(async () => {
  try {
    await browser.runtime.getPlatformInfo()
  } catch (_) {}
}, KEEP_ALIVE_INTERVAL)

self.addEventListener("beforeunload", () => {
  clearInterval(keepAlive)
})

browser.runtime.onConnect.addListener(handlePortConnection)

// ── CertChain Dilithium3 Message Handler ──────────────────────────────────
// Handles keypair generation requests from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_DILITHIUM_KEYPAIR') {
    (async () => {
      try {
        // Check if keypair already exists
        const stored = await chrome.storage.local.get([
          'certchain_dilithium3_public',
          'certchain_dilithium3_private'
        ])
        if (stored.certchain_dilithium3_public) {
          sendResponse({
            success: true,
            publicKey: stored.certchain_dilithium3_public,
            existing: true
          })
          return
        }
        // Generate new keypair using ML-DSA-65
        const { ml_dsa65 } = await import("@noble/post-quantum/ml-dsa.js")
        const seed = crypto.getRandomValues(new Uint8Array(32))
        const { secretKey, publicKey } = ml_dsa65.keygen(seed)
        const toHex = (b) => Array.from(b).map(x => x.toString(16).padStart(2,"0")).join("")
        const pubHex = toHex(publicKey)
        const privHex = toHex(secretKey)
        await chrome.storage.local.set({
          certchain_dilithium3_public: pubHex,
          certchain_dilithium3_private: privHex
        })
        sendResponse({ success: true, publicKey: pubHex, existing: false })
      } catch(e) {
        sendResponse({ success: false, error: e.message })
      }
    })()
    return true  // keep message channel open for async response
  }

  if (message.type === 'GET_DILITHIUM_PUBLIC_KEY') {
    chrome.storage.local.get(['certchain_dilithium3_public'], (result) => {
      sendResponse({ publicKey: result.certchain_dilithium3_public || null })
    })
    return true
  }

  if (message.type === 'SIGN_CREDENTIAL_DILITHIUM3') {
    (async () => {
      try {
        const stored = await chrome.storage.local.get([
          'certchain_dilithium3_private',
          'certchain_dilithium3_public'
        ])
        if (stored.certchain_dilithium3_private === undefined) {
          sendResponse({ success: false, error: 'No keypair found. Generate one first.' })
          return
        }
        const { ml_dsa65 } = await import("@noble/post-quantum/ml-dsa.js")
        const toHex = (b) => Array.from(b).map(x => x.toString(16).padStart(2,"0")).join("")
        const fromHex = (h) => new Uint8Array(h.match(/.{2}/g).map(b => parseInt(b,16)))
        const privKey = fromHex(stored.certchain_dilithium3_private)
        const msgBytes = new TextEncoder().encode(message.credentialJson)
        const signature = ml_dsa65.sign(privKey, msgBytes)
        sendResponse({
          success: true,
          signature: toHex(signature),
          publicKey: stored.certchain_dilithium3_public,
          algorithm: "CRYSTALS-Dilithium3 (NIST FIPS 204 / ML-DSA-65)"
        })
      } catch(e) {
        sendResponse({ success: false, error: e.message })
      }
    })()
    return true
  }
})
