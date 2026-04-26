// FabricVault CertChain Wallet - Popup Script
document.addEventListener('DOMContentLoaded', function() {
  console.log('FabricVault popup loaded');
});

function generateKeypair() {
  chrome.runtime.sendMessage({type: 'GENERATE_DILITHIUM_KEYPAIR'}, function(response) {
    if (chrome.runtime.lastError) {
      alert('Error: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      if (response.existing) {
        alert('Dilithium3 keypair already exists.\nPublic key: ' + response.publicKey.substring(0, 32) + '...\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST Standard: FIPS 204');
      } else {
        alert('Dilithium3 keypair generated!\nPublic key: ' + response.publicKey.substring(0, 32) + '...\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST Standard: FIPS 204');
      }
    } else {
      alert('Generation failed: ' + (response ? response.error : 'No response'));
    }
  });
}

function viewKey() {
  chrome.runtime.sendMessage({type: 'GET_DILITHIUM_PUBLIC_KEY'}, function(response) {
    if (chrome.runtime.lastError) {
      alert('Error: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response && response.publicKey) {
      alert('Dilithium3 Public Key:\n' + response.publicKey.substring(0, 64) + '...\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST Standard: FIPS 204');
    } else {
      alert('No keypair found. Click Generate first.');
    }
  });
}
