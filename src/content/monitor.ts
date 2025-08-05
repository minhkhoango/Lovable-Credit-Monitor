// Pylance strict mode compliant

// This selector is the most fragile part. We're betting it's stable enough for an MVP.
// You might need to adjust this based on Lovable's actual DOM.
const CREDIT_SELECTOR: string = '[data-testid="credit-badge"]';

let lastKnownCredit: number | null = null;

function extractCredits(): number | null {
  const creditElement = document.querySelector<HTMLElement>(CREDIT_SELECTOR);
  if (creditElement && creditElement.textContent) {
    const creditValue = parseInt(creditElement.textContent.trim(), 10);
    return isNaN(creditValue) ? null : creditValue;
  }
  return null;
}

function sendCreditUpdate(value: number): void {
  console.log(`Lovable Credit Monitor: Detected credit change to ${value}`);
  chrome.runtime.sendMessage({ type: 'CREDIT_UPDATE', value });
}

function checkForUpdate(): void {
  const currentCredits = extractCredits();
  if (currentCredits !== null && currentCredits !== lastKnownCredit) {
    lastKnownCredit = currentCredits;
    sendCreditUpdate(currentCredits);
  }
}

// Initial check on load
setTimeout(checkForUpdate, 1000); // Wait a second for SPA to fully render

// Observe DOM mutations to catch changes without polling
const observer = new MutationObserver(() => {
  checkForUpdate();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});