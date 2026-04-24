import { p256 } from "@noble/curves/p256"
import browser from "webextension-polyfill"
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"

// Dilithium3 key storage keys
const DILITHIUM_PRIVATE_KEY = "certchain_dilithium3_private"
const DILITHIUM_PUBLIC_KEY  = "certchain_dilithium3_public"

// Helper: convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2)
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr
}

// Helper: convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
}

export class CryptoManager {
  private key: CryptoKey | null = null

  constructor() {}

  async restoreKey(keyData: number[], salt: number[]) {
    // Import the raw key data back into a CryptoKey
    this.key = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(keyData),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    )
  }

  clearKey() {
    // Clear the crypto key from memory
    this.key = null
  }

  async deriveKey(password: string, storedSalt?: ArrayBuffer) {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    const importedKey = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    )

    let salt: Uint8Array
    if (storedSalt) {
      salt = new Uint8Array(storedSalt)
    } else {
      salt = crypto.getRandomValues(new Uint8Array(16))
    }

    this.key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      importedKey,
      { name: "AES-GCM", length: 256 },
      true, // set to true to allow export
      ["encrypt", "decrypt"]
    )

    // Export the key as raw bytes for session storage
    const exportedKey = await crypto.subtle.exportKey("raw", this.key)

    return {
      salt: Array.from(salt),
      key: Array.from(new Uint8Array(exportedKey))
    }
  }

  async encrypt(data: any) {
    if (!this.key) throw new Error("Key not initialized")
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key,
      encoded
    )
    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ciphertext))
    }
  }

  async decrypt({ iv, data }: { iv: number[]; data: number[] }) {
    if (!this.key) throw new Error("Key not initialized")
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      this.key,
      new Uint8Array(data)
    )
    return JSON.parse(new TextDecoder().decode(decrypted))
  }

  async sign(digestBase64: string, privateKeyPem: string): Promise<string> {
    // Clean PEM format and decode base64
    const pem = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "") // remove all whitespaces

    if (!pem.match(/^[A-Za-z0-9+/=]+$/)) {
      throw new Error("PEM content is not valid base64")
    }

    const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))

    // Import key into WebCrypto
    const importedKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    )

    // Export JWK to get the 'd' field
    const jwk = await crypto.subtle.exportKey("jwk", importedKey)
    if (!jwk.d) {
      throw new Error("JWK missing 'd' field")
    }

    // Decode base64url 'd'
    const dBytes = Uint8Array.from(
      atob(jwk.d.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    )

    // Decode digest
    const digestBytes = Uint8Array.from(atob(digestBase64), (c) =>
      c.charCodeAt(0)
    )

    // Sign using noble (lowS, deterministic)
    const signature = p256.sign(digestBytes, dBytes, { lowS: true })

    // Convert DER signature to base64
    const derSig = signature.toDERRawBytes()
    return btoa(String.fromCharCode(...derSig))
  }

  // ── CRYSTALS-Dilithium3 (ML-DSA-65) Post-Quantum Signing ──────────────────
  // NIST FIPS 204 / ML-DSA standard
  // Used for credential artifact signing — separate from Fabric ECDSA layer

  async generateDilithiumKeypair(): Promise<{ publicKey: string; privateKey: string }> {
    const seed = crypto.getRandomValues(new Uint8Array(32))
    const { secretKey, publicKey } = ml_dsa65.keygen(seed)
    const pub = bytesToHex(publicKey)
    const priv = bytesToHex(secretKey)
    // Store in extension local storage
    await browser.storage.local.set({
      [DILITHIUM_PUBLIC_KEY]: pub,
      [DILITHIUM_PRIVATE_KEY]: priv
    })
    return { publicKey: pub, privateKey: priv }
  }

  async getDilithiumPublicKey(): Promise<string | null> {
    const result = await browser.storage.local.get(DILITHIUM_PUBLIC_KEY)
    return result[DILITHIUM_PUBLIC_KEY] ?? null
  }

  async signWithDilithium3(
    credentialJson: string
  ): Promise<{ signature: string; publicKey: string; algorithm: string }> {
    // Retrieve stored private key
    const stored = await browser.storage.local.get([
      DILITHIUM_PRIVATE_KEY,
      DILITHIUM_PUBLIC_KEY
    ])
    let privHex: string = stored[DILITHIUM_PRIVATE_KEY]
    let pubHex: string  = stored[DILITHIUM_PUBLIC_KEY]

    // Auto-generate keypair if not yet created
    if (!privHex || !pubHex) {
      const kp = await this.generateDilithiumKeypair()
      privHex = kp.privateKey
      pubHex  = kp.publicKey
    }

    const privKey = hexToBytes(privHex)
    const pubKey  = hexToBytes(pubHex)

    // Sign the credential JSON bytes
    const msgBytes = new TextEncoder().encode(credentialJson)
    const signature = ml_dsa65.sign(privKey, msgBytes)

    return {
      signature:  bytesToHex(signature),
      publicKey:  pubHex,
      algorithm:  "CRYSTALS-Dilithium3 (NIST FIPS 204 / ML-DSA-65)"
    }
  }

  async verifyDilithium3(
    credentialJson: string,
    signatureHex: string,
    publicKeyHex: string
  ): Promise<boolean> {
    try {
      const pubKey    = hexToBytes(publicKeyHex)
      const sigBytes  = hexToBytes(signatureHex)
      const msgBytes  = new TextEncoder().encode(credentialJson)
      return ml_dsa65.verify(pubKey, msgBytes, sigBytes)
    } catch {
      return false
    }
  }

}