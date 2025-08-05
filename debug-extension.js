// Debug script for testing the Lovable Credit Monitor extension
// Run this in the browser console on http://localhost:3000

console.log('🔍 Testing Lovable Credit Monitor Extension...');

// Test 1: Check if the credit selector works
const creditElement = document.querySelector('div.bg-muted p.text-muted-foreground');
console.log('Credit element found:', creditElement);
if (creditElement) {
  console.log('Credit text:', creditElement.textContent);
  const match = creditElement.textContent.match(/\d+/);
  if (match) {
    console.log('Extracted credit value:', parseInt(match[0], 10));
  }
}

// Test 2: Simulate credit changes
function simulateCreditChange(newValue) {
  const creditElement = document.querySelector('div.bg-muted p.text-muted-foreground');
  if (creditElement) {
    creditElement.textContent = `${newValue} left`;
    console.log(`✅ Simulated credit change to: ${newValue}`);
    
    // Trigger a DOM mutation to test the extension
    const event = new Event('DOMNodeInserted');
    document.body.dispatchEvent(event);
  }
}

// Test 3: Check extension storage
function checkExtensionStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['lastCredit', 'creditHistory'], (data) => {
      console.log('Extension storage data:', data);
    });
  } else {
    console.log('Chrome storage not available');
  }
}

// Add test functions to window for easy access
window.testCreditMonitor = {
  simulateChange: simulateCreditChange,
  checkStorage: checkExtensionStorage
};

console.log('📋 Test functions available:');
console.log('- window.testCreditMonitor.simulateChange(25) - Simulate credit change to 25');
console.log('- window.testCreditMonitor.checkStorage() - Check extension storage');

// Auto-test sequence
setTimeout(() => {
  console.log('🧪 Running auto-test sequence...');
  simulateCreditChange(45);
  setTimeout(() => simulateCreditChange(40), 1000);
  setTimeout(() => simulateCreditChange(35), 2000);
  setTimeout(() => checkExtensionStorage(), 3000);
}, 2000); 