import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js"

const toHex = (b: Uint8Array) => Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('')

async function checkKeyStatus() {
  const result = await chrome.storage.local.get(['certchain_dilithium3_public'])
  const el = document.getElementById('keyStatus')
  if (el) {
    if (result.certchain_dilithium3_public) {
      el.textContent = 'Ready'
      el.className = 'bdg g'
    } else {
      el.textContent = 'Not Generated'
      el.className = 'bdg o'
    }
  }
}

async function generateKeypair() {
  const btn = document.querySelector('.btn1') as HTMLButtonElement
  if (btn) { btn.textContent = 'Generating...'; btn.disabled = true }
  try {
    const existing = await chrome.storage.local.get(['certchain_dilithium3_public'])
    if (existing.certchain_dilithium3_public) {
      alert('Keypair already exists!\n\nPublic key:\n' + existing.certchain_dilithium3_public.substring(0,32) + '...\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204')
      if (btn) { btn.textContent = 'Generate Dilithium3 Keypair'; btn.disabled = false }
      return
    }
    const seed = crypto.getRandomValues(new Uint8Array(32))
    const { secretKey, publicKey } = ml_dsa65.keygen(seed)
    const pub = toHex(publicKey)
    const priv = toHex(secretKey)
    await chrome.storage.local.set({
      certchain_dilithium3_public: pub,
      certchain_dilithium3_private: priv
    })
    alert('Keypair generated!\n\nPublic key:\n' + pub.substring(0,32) + '...\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204')
    checkKeyStatus()
  } catch(e: any) {
    alert('Error: ' + e.message)
  } finally {
    if (btn) { btn.textContent = 'Generate Dilithium3 Keypair'; btn.disabled = false }
  }
}

async function viewKey() {
  const result = await chrome.storage.local.get(['certchain_dilithium3_public'])
  if (result.certchain_dilithium3_public) {
    const key = result.certchain_dilithium3_public
    alert('Dilithium3 Public Key:\n\n' + key.substring(0,64) + '...\n\nLength: ' + key.length + ' hex chars\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204')
  } else {
    alert('No keypair found.\nClick "Generate Dilithium3 Keypair" first.')
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('FabricVault popup loaded')
  checkKeyStatus()
  const genBtn = document.querySelector('.btn1')
  const viewBtn = document.querySelector('.btn2')
  if (genBtn) genBtn.addEventListener('click', generateKeypair)
  if (viewBtn) viewBtn.addEventListener('click', viewKey)
})
