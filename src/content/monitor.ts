// Pylance strict mode compliant

// This selector targets the <p> tag with the muted text color
// inside the main gray "Credits" widget box.
const CREDIT_SELECTOR: string = 'div.bg-muted p.text-muted-foreground';

let lastKnownCredit: number | null = null;
let creditHistory: number[] = [];

function extractCredits(): number | null {
  const creditElement = document.querySelector<HTMLElement>(CREDIT_SELECTOR);
  if (creditElement && creditElement.textContent) {
    // The text is "5 left", so we need to extract the number.
    const match = creditElement.textContent.match(/\d+/); // Find the first sequence of digits
    if (match) {
      const creditValue = parseInt(match[0], 10);
      return isNaN(creditValue) ? null : creditValue;
    }
  }
  return null;
}

function calculateBurnRate(hist: number[]): number {
  if (hist.length < 2) {
    return 0;
  }
  // Calculate burn rate: (oldest - newest) / number of operations
  // History is stored in chronological order [oldest, ..., newest]
  const creditsUsed = hist[0] - hist[hist.length - 1];
  const operations = hist.length - 1;
  return creditsUsed > 0 ? creditsUsed / operations : 0;
}

function showCreditToast(creditValue: number, history: number[]): void {
  const burnRate = calculateBurnRate(history);
  const operationsLeft = burnRate > 0 && creditValue > 0 ? Math.floor(creditValue / burnRate) : '∞';
  
  // Create the toast element
  const toast = document.createElement('div');
  
  // Style the toast
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = '#1f2937';
  toast.style.color = 'white';
  toast.style.padding = '12px 16px';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '9999';
  toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.minWidth = '200px';
  toast.style.maxWidth = '300px';
  
  // Set the content
  toast.innerHTML = `
    <div style="margin-bottom: 4px; font-weight: 600;">Credit Update</div>
    <div style="font-size: 12px; opacity: 0.9;">
      Burn rate: <strong>${burnRate.toFixed(2)}</strong> credits/op<br>
      Est. ops left: <strong>${operationsLeft}</strong>
    </div>
  `;
  
  // Append to document body
  document.body.appendChild(toast);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
}

function sendCreditUpdate(value: number): void {
  // Update history array
  creditHistory.push(value);
  // Keep only the last 10 entries to avoid memory issues
  if (creditHistory.length > 10) {
    creditHistory = creditHistory.slice(-10);
  }
  
  // Use a console.log for debugging, you can remove this later.
  console.log(`%cLovable Credit Monitor: Detected credit value -> ${value}`, 'color: #3b82f6; font-weight: bold;');
  
  // Check if chrome.runtime is available before trying to send message
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage({ type: 'CREDIT_UPDATE', value }, () => {
        if (chrome.runtime.lastError) {
          // Extension context invalidated or other error - this is normal when extension is reloaded
          console.log('Extension context error (normal during reload):', chrome.runtime.lastError.message);
        }
      });
    } catch (error) {
      // Handle any other runtime errors
      console.log('Error sending credit update:', error);
    }
  } else {
    console.log('Chrome runtime not available - extension may be reloading');
  }
  
  // Show the toast notification
  showCreditToast(value, creditHistory);
}

function checkForUpdate(): void {
  const currentCredits = extractCredits();
  if (currentCredits !== null && currentCredits !== lastKnownCredit) {
    lastKnownCredit = currentCredits;
    sendCreditUpdate(currentCredits);
  }
}

// Initial check on load. Give the SPA time to render.
setTimeout(checkForUpdate, 1500);

// Observe DOM mutations to catch changes without constantly polling.
try {
  const observer = new MutationObserver(() => {
    checkForUpdate();
  });

  // Start observing the entire document body for changes.
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
} catch (error) {
  console.log('Error setting up mutation observer:', error);
}