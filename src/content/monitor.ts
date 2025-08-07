// Pylance strict mode compliant
// This script runs in the main page context and cannot use chrome.* APIs

let lastKnownCredit: number | null = null;
let currentWorkspaceId: string | null = null;

// Function to get credit history from storage via the content script bridge
async function getCreditHistoryFromStorage(): Promise<number[]> {
  return new Promise((resolve) => {
    console.log('Lovable Credit Monitor: Requesting credit history from storage...');
    
    // Dispatch a custom event to request history from the content script
    window.dispatchEvent(new CustomEvent('request_credit_history'));
    
    // Listen for the response
    const handleResponse = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.history) {
        window.removeEventListener('credit_history_response', handleResponse);
        console.log('Lovable Credit Monitor: Received credit history from storage:', customEvent.detail.history);
        resolve(customEvent.detail.history);
      }
    };
    
    window.addEventListener('credit_history_response', handleResponse);
    
    // Increased timeout to 2 seconds
    setTimeout(() => {
      window.removeEventListener('credit_history_response', handleResponse);
      console.log('Lovable Credit Monitor: Credit history request timed out, using empty array');
      resolve([]);
    }, 2000);
  });
}

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
    // Handles the ".../user/workspaces" response (List View)
    if (responseData?.workspaces && Array.isArray(responseData.workspaces)) {
      if (responseData.workspaces.length > 0) {
        const creditValue = parseWorkspaceObject(responseData.workspaces[0]);
        if (creditValue !== null) {
          return creditValue;
        }
      }
      return null;
    }
    
    // Handles the ".../workspaces/{id}" response (Detail View)
    if (responseData?.workspace) {
      const creditValue = parseWorkspaceObject(responseData.workspace);
      if (creditValue !== null) {
        return creditValue;
      }
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

  const deltas: number[] = [];
  for (let i = 1; i < hist.length; i++) {
    const diff = hist[i - 1] - hist[i];
    // Only consider actual credit-burning operations
    if (diff > 0) {
      deltas.push(diff);
    }
  }

  if (deltas.length === 0) {
    return 0; // No burn detected
  }

  const totalBurn = deltas.reduce((sum, current) => sum + current, 0);
  const averageBurn = totalBurn / deltas.length;
  
  // Round to 2 decimal places
  return Math.round(averageBurn * 100) / 100;
}

function showCreditToast(creditValue: number, lastActionCost: number): void {
  try {
    const operationsLeft = lastActionCost > 0 && creditValue > 0 ? Math.floor(creditValue / lastActionCost) : '∞';

    // --- Color and Animation Logic ---
    const toast = document.createElement('div');
    const creditPercentage = (creditValue / 50) * 100; // Assuming max 50 credits

    let backgroundColor = '#1f2937'; // Default: Dark Gray/Blue
    if (creditPercentage <= 20) {
      backgroundColor = '#b91c1c'; // Danger: Red
    } else if (creditPercentage <= 50) {
      backgroundColor = '#d97706'; // Warning: Amber/Yellow
    }

    // Base styling
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: backgroundColor,
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      zIndex: '9999',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      minWidth: '200px',
      maxWidth: '300px',
      transform: 'translateY(100px)',
      opacity: '0',
      transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
    });

    toast.innerHTML = `
      <div style="margin-bottom: 4px; font-weight: 600;">Credit Burn Detected</div>
      <div style="font-size: 12px; opacity: 0.9;">
        Last action cost: <strong>${lastActionCost.toFixed(2)}</strong> credits<br>
        Est. ops left (at this rate): <strong>${operationsLeft}</strong>
      </div>
    `;
    
    document.body.appendChild(toast);

    // Trigger the slide-in animation
    setTimeout(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    }, 10);

    // Auto-dismiss with slide-out animation
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 400);
    }, 5000);

  } catch (error) {
    console.error('Lovable Credit Monitor: Error showing credit toast:', error);
  }
}

function sendCreditUpdate(value: number): void {
  try {
    // Always send the update to the service worker for state management.
    window.dispatchEvent(new CustomEvent('credit_update', { detail: { value } }));

    // ONLY show the toast if a burn is detected.
    if (lastKnownCredit !== null && value < lastKnownCredit) {
      console.log(`%cLovable Credit Monitor: Burn detected! ${lastKnownCredit} -> ${value}. Showing toast.`, 'color: #ef4444; font-weight: bold;');
      
      // Calculate the cost of this specific action
      const lastBurnCost = lastKnownCredit - value;
      
      // Call the new toast function with the new argument
      showCreditToast(value, lastBurnCost);

    } else {
        console.log(`%cLovable Credit Monitor: State update (no burn). New value: ${value}`, 'color: #3b82f6; font-weight: bold;');
    }
    
    // ALWAYS update the last known credit value for the next check.
    lastKnownCredit = value;

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
      
      const extractionResult = extractCreditsFromAPI(responseData);
      if (extractionResult !== null) {
        sendCreditUpdate(extractionResult);
      }
    }
  } catch (error) {
    console.log('Lovable Credit Monitor: Error processing API response:', error);
  }
  
  return response;
};

console.log('Lovable Credit Monitor: Successfully initialized fetch interceptor.');