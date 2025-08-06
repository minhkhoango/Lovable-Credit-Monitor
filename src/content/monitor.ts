// Pylance strict mode compliant
// This script runs in the main page context and cannot use chrome.* APIs

let lastKnownCredit: number | null = null;
let creditHistory: number[] = [];
let currentWorkspaceId: string | null = null;

function parseWorkspaceObject(workspace: any): number | null {
  try {
    // Verify the workspace contains the required numeric fields
    if (
      typeof workspace.daily_credits_limit !== 'number' ||
      typeof workspace.daily_credits_used !== 'number'
    ) {
      console.log('Lovable Credit Monitor: Missing or invalid credit fields in workspace data');
      return null;
    }

    // Calculate remaining credits
    const creditsLeft = workspace.daily_credits_limit - workspace.daily_credits_used;
    
    console.log('Lovable Credit Monitor: API credit calculation:', {
      limit: workspace.daily_credits_limit,
      used: workspace.daily_credits_used,
      remaining: creditsLeft
    });

    return creditsLeft;

  } catch (error) {
    console.log('Lovable Credit Monitor: Error in parseWorkspaceObject:', error);
    return null;
  }
}

function extractCreditsFromAPI(responseData: any): number | null {
  try {
    // Handles the ".../user/workspaces" response, which has a PLURAL 'workspaces' key
    if (responseData?.workspaces && Array.isArray(responseData.workspaces)) {
      if (responseData.workspaces.length > 0) {
        return parseWorkspaceObject(responseData.workspaces[0]);
      }
      return null; // Handle empty array case
    }
    
    // Handles the ".../workspaces/{id}" response, which has a SINGULAR 'workspace' key
    if (responseData?.workspace) {
      return parseWorkspaceObject(responseData.workspace);
    }

    console.log('Lovable Credit Monitor: Invalid or unrecognized API response structure');
    return null;

  } catch (error) {
    console.log('Lovable Credit Monitor: Error in extractCreditsFromAPI:', error);
    return null;
  }
}

function calculateBurnRate(hist: number[]): number {
  if (hist.length < 2) {
    return 0;
  }
  // Calculate burn rate: (oldest - newest) / number of operations
  // History is stored in chronological order [oldest, ..., newest]
  const creditsUsed = hist[0] - hist[hist.length - 1];
  const operations = hist.length - 1;
  // Round to 2 decimal places to avoid floating point precision issues
  return creditsUsed > 0 ? Math.round((creditsUsed / operations) * 100) / 100 : 0;
}

function showCreditToast(creditValue: number, history: number[]): void {
  try {
    const burnRate = calculateBurnRate(history);
    const operationsLeft = burnRate > 0 && creditValue > 0 ? (creditValue / burnRate).toFixed(1) : '∞';
    
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
      try {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      } catch (error) {
        console.log('Lovable Credit Monitor: Error removing toast:', error);
      }
    }, 5000);
  } catch (error) {
    console.error('Lovable Credit Monitor: Error showing credit toast:', error);
  }
}

function sendCreditUpdate(value: number): void {
  try {
    // Update history array
    creditHistory.push(value);
    // Keep only the last 10 entries to avoid memory issues
    if (creditHistory.length > 10) {
      creditHistory = creditHistory.slice(-10);
    }
    
    // Use a console.log for debugging, you can remove this later.
    console.log(`%cLovable Credit Monitor: Detected credit value -> ${value}`, 'color: #3b82f6; font-weight: bold;');
    
    // Send credit update to the content script via custom event
    window.dispatchEvent(new CustomEvent('credit_update', { detail: { value } }));
    
    // Show the toast notification
    showCreditToast(value, creditHistory);
  } catch (error) {
    console.error('Lovable Credit Monitor: Error sending credit update:', error);
  }
}

// Wrap fetch ONCE at the top level of the script. This runs a single time when the script is injected.
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await originalFetch(input, init);
  
  try {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    if (url.includes('/workspaces')) {
      console.log('Lovable Credit Monitor: Intercepted workspaces API call');
      const clonedResponse = response.clone();
      const responseData = await clonedResponse.json();
      
      const creditValue = extractCreditsFromAPI(responseData);
      if (creditValue !== null) {
        sendCreditUpdate(creditValue);
      }
    }
  } catch (error) {
    console.log('Lovable Credit Monitor: Error processing API response:', error);
  }
  
  return response;
};

console.log('Lovable Credit Monitor: Successfully initialized fetch interceptor.');

// This function will reset state on navigation.
function handleNavigation(): void {
  console.log('Lovable Credit Monitor: Navigation detected, resetting credit history.');
  // Reset history to ensure burn rate is calculated fresh for the new page context.
  creditHistory = [];
}

// Listen for SPA navigation events and just reset the state.
window.addEventListener('popstate', handleNavigation);

const originalPushState = history.pushState;
history.pushState = function(...args) {
  originalPushState.apply(history, args);
  handleNavigation();
};

const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  handleNavigation();
};