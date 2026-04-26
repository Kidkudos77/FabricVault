// FabricVault CertChain Wallet - Popup Script

function sendMsg(msg, callback) {
  // Wake service worker first then send message
  chrome.runtime.sendMessage({type: 'PING'}, function() {
    chrome.runtime.lastError; // clear error
    setTimeout(function() {
      chrome.runtime.sendMessage(msg, function(response) {
        if (chrome.runtime.lastError) {
          console.log('lastError:', chrome.runtime.lastError.message);
        }
        callback(response);
      });
    }, 100);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('FabricVault popup loaded');
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
  sendMsg({type: 'GENERATE_DILITHIUM_KEYPAIR'}, function(response) {
    if (btn) btn.textContent = 'Generate Dilithium3 Keypair';
    if (response && response.success) {
      var el = document.getElementById('keyStatus');
      if (el) { el.textContent = 'Ready'; el.className = 'bdg g'; }
      var msg = response.existing
        ? 'Keypair already exists!\nPublic key: ' + response.publicKey.substring(0,32) + '...'
        : 'Keypair generated!\nPublic key: ' + response.publicKey.substring(0,32) + '...';
      alert(msg + '\n\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204');
    } else {
      alert('No response — try clicking again. Service worker may be waking up.');
    }
  });
}

function viewKey() {
  sendMsg({type: 'GET_DILITHIUM_PUBLIC_KEY'}, function(response) {
    if (response && response.publicKey) {
      alert('Dilithium3 Public Key:\n' + response.publicKey.substring(0,64) + '...\n\nLength: ' + response.publicKey.length + ' chars\nAlgorithm: CRYSTALS-Dilithium3 (ML-DSA-65)\nNIST FIPS 204');
    } else {
      alert('No keypair found. Click Generate first.');
    }
  });
}
