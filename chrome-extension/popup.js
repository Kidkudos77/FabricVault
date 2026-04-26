// FabricVault CertChain Wallet - Popup Script

document.addEventListener('DOMContentLoaded', function() {
  console.log('FabricVault popup loaded');
  // Check if keypair exists and update status
  chrome.storage.local.get(['certchain_dilithium3_public'], function(result) {
    var el = document.getElementById('keyStatus');
    if (el) {
      if (result.certchain_dilithium3_public) {
        el.textContent = 'Ready';
        el.className = 'bdg g';
      } else {
        el.textContent = 'Not Generated';
        el.className = 'bdg o';
      }
    }
  });
});

function generateKeypair() {
  var btn = document.querySelector('.btn1');
  if (btn) btn.textContent = 'Generating...';
  chrome.runtime.sendMessage({type: 'GENERATE_DILITHIUM_KEYPAIR'}, function(response) {
    if (btn) btn.textContent = 'Generate Dilithium3 Keypair';
    if (chrome.runtime.lastError) {
      alert('Error: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      var el = document.getElementById('keyStatus');
      if (el) { el.textContent = 'Ready'; el.className = 'bdg g'; }
      if (response.existing) {
        alert('Keypair already exists!\nPublic key: ' + response.publicKey.substring(0,32) + '...\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204');
      } else {
        alert('Keypair generated!\nPublic key: ' + response.publicKey.substring(0,32) + '...\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204');
      }
    } else {
      alert('Failed: ' + (response ? response.error : 'No response from background'));
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
      alert('Dilithium3 Public Key:\n' + response.publicKey.substring(0,64) + '...\n\nFull length: ' + response.publicKey.length + ' chars\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204');
    } else {
      alert('No keypair found. Click Generate Dilithium3 Keypair first.');
    }
  });
}
