// Content script loader that injects the monitoring script into the main page context
// This script runs in the isolated world and acts as a bridge

let isContextValid: boolean = true;
let injectionAttempts: number = 0;
const MAX_INJECTION_ATTEMPTS: number = 3;

function validateExtensionContext(): boolean {
  try {
    // Check if chrome runtime is available and valid
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           typeof chrome.runtime.sendMessage === 'function';
  } catch (error) {
    console.log('Lovable Credit Monitor: Extension context validation failed:', error);
    return false;
  }
}

function injectMonitoringScript(): void {
  try {
    // Validate extension context before attempting to get URL
    if (!validateExtensionContext()) {
      console.log('Lovable Credit Monitor: Extension context invalid, skipping injection');
      
      // Retry injection with exponential backoff if we haven't exceeded max attempts
      if (injectionAttempts < MAX_INJECTION_ATTEMPTS) {
        injectionAttempts++;
        const retryDelay = Math.min(1000 * Math.pow(2, injectionAttempts - 1), 10000);
        console.log(`Lovable Credit Monitor: Retrying injection in ${retryDelay}ms (attempt ${injectionAttempts})`);
        setTimeout(() => injectMonitoringScript(), retryDelay);
      } else {
        console.error('Lovable Credit Monitor: Max injection attempts reached, giving up');
      }
      return;
    }

    // Reset attempt counter on successful validation
    injectionAttempts = 0;

    // Get the URL for the monitor script from the extension
    const monitorScriptUrl = chrome.runtime.getURL('content/monitor.js');
    
    // Create a script element to inject into the page
    const script = document.createElement('script');
    script.src = monitorScriptUrl;
    script.type = 'module';
    
    // Inject the script into the page's head
    document.head.appendChild(script);
    
    console.log('Lovable Credit Monitor: Injected monitoring script into page context');
  } catch (error) {
    console.error('Lovable Credit Monitor: Failed to inject monitoring script:', error);
    isContextValid = false;
    
    // Retry on error if we haven't exceeded max attempts
    if (injectionAttempts < MAX_INJECTION_ATTEMPTS) {
      injectionAttempts++;
      const retryDelay = Math.min(1000 * Math.pow(2, injectionAttempts - 1), 10000);
      console.log(`Lovable Credit Monitor: Retrying injection after error in ${retryDelay}ms (attempt ${injectionAttempts})`);
      setTimeout(() => injectMonitoringScript(), retryDelay);
    }
  }
}

// Listen for credit update events from the main page context
window.addEventListener('credit_update', (event: Event) => {
  try {
    // Check if extension context is still valid
    if (!isContextValid || !validateExtensionContext()) {
      console.log('Lovable Credit Monitor: Extension context invalid, skipping credit update');
      return;
    }

    const customEvent = event as CustomEvent;
    const { value } = customEvent.detail;
    
    // Send the credit update to the background script with proper error handling
    chrome.runtime.sendMessage({ type: 'CREDIT_UPDATE', value }, () => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
        
        // THIS IS THE KEY CHANGE:
        if (errorMessage.includes('Extension context invalidated')) {
          // It's not an error, it's a state change. Don't log a red stack trace.
          // Just quietly note that this content script is now dormant.
          if (isContextValid) { // Only log this once
              console.log('Lovable Credit Monitor: Context invalidated (normal during dev). Awaiting page refresh.');
          }
          isContextValid = false;
          // And most importantly, stop processing.
          return; 
        }
        
        // For any OTHER errors, you still want to know about them.
        console.error('Lovable Credit Monitor: Unexpected extension error:', errorMessage);
        isContextValid = false;
      }
    });
    
  } catch (error) {
    // Handle specific extension context errors more gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('Extension context invalidated') || 
        errorMessage.includes('Could not establish connection')) {
      console.log('Lovable Credit Monitor: Extension context invalidated (normal during reloads):', errorMessage);
      isContextValid = false;
      
      // Try to re-initialize after a short delay
      setTimeout(() => {
        if (validateExtensionContext()) {
          console.log('Lovable Credit Monitor: Extension context restored');
          isContextValid = true;
        }
      }, 2000);
    } else {
      console.error('Lovable Credit Monitor: Error forwarding credit update:', error);
      isContextValid = false;
    }
  }
});

// Listen for credit updates from background script and forward to popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CREDIT_UPDATE_FROM_BACKGROUND') {
    try {
      // Forward the credit update to the popup window via custom event
      window.dispatchEvent(new CustomEvent('credit_update', { 
        detail: { value: message.value } 
      }));
      console.log('Lovable Credit Monitor: Forwarded background credit update to popup');
    } catch (error) {
      console.error('Lovable Credit Monitor: Error forwarding background credit update:', error);
    }
  }
  return true; // Keep the message channel open for async response
});

// Periodically check if extension context is still valid and try to restore it
setInterval(() => {
  if (!validateExtensionContext()) {
    if (isContextValid) {
      console.log('Lovable Credit Monitor: Extension context lost, marking as invalid');
      isContextValid = false;
    }
  } else {
    if (!isContextValid) {
      console.log('Lovable Credit Monitor: Extension context restored');
      isContextValid = true;
    }
  }
}, 5000); // Check every 5 seconds

// Inject the monitoring script when the content script loads
injectMonitoringScript(); 