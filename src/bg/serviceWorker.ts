// Pylance strict mode compliant

interface CreditUpdateMessage {
  type: 'CREDIT_UPDATE';
  payload: {
    value: number;
  };
}

chrome.runtime.onMessage.addListener(async (message: CreditUpdateMessage) => {
  // Check for the correct message type and the new payload structure
  if (message.type === 'CREDIT_UPDATE' && message.payload) {
    const { value } = message.payload;

    // 1. Get both lastCredit and creditHistory from storage
    const result = await chrome.storage.local.get(['lastCredit', 'creditHistory']);
    const history: number[] = result['creditHistory'] || [];

    // 2. Always update history with the new value for proper tracking
    const newHistory = [...history, value].slice(-50); // Keep last 50 points
    await chrome.storage.local.set({ creditHistory: newHistory });

    // 4. ALWAYS update lastCredit with the new value
    await chrome.storage.local.set({ lastCredit: value });

    // 5. Keep the existing logic to broadcast updates.
    // This logic does not need to change.
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'CREDIT_UPDATE_FROM_BACKGROUND', value: value })
            .catch(() => { /* Ignore errors */ });
        }
      }
      chrome.runtime.sendMessage({ type: 'CREDIT_UPDATE_FROM_BACKGROUND', value: value })
        .catch(() => { /* Ignore errors */ });
    } catch (error) {
      console.log('Lovable Credit Monitor: Error dispatching to tabs:', error);
    }
  }
  return true; // Indicates async response
});