// Pylance strict mode compliant
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid'; // Simple way to get a unique ID

interface CreditUpdateMessage {
  type: 'CREDIT_UPDATE';
  payload: {
    value: number;
  };
}

// Load environment variables from Vite's import.meta.env
const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase credentials not found. Service worker will not persist data.");
}

let extensionId: string | null = null;

// Get or create a unique ID for this extension instance for anonymous tracking
chrome.runtime.onInstalled.addListener(async () => {
    const result = await chrome.storage.local.get('extensionId');
    if (!result['extensionId']) {
        const newId = uuidv4();
        await chrome.storage.local.set({ extensionId: newId });
        extensionId = newId;
    }
});

chrome.runtime.onStartup.addListener(async () => {
    const result = await chrome.storage.local.get('extensionId');
    if (result['extensionId']) {
        extensionId = result['extensionId'] as string;
    }
});

// Validate and sanitize credit value for Supabase insert
function validateCreditValue(rawValue: number): number {
  // Parse as float to handle any numeric input
  const val = parseFloat(rawValue.toString());
  
  // Check if it's a valid number
  if (isNaN(val)) {
    throw new Error(`Invalid credit value: ${rawValue} is not a valid number`);
  }
  
  // Check if it's an integer (Supabase integer column requirement)
  if (!Number.isInteger(val)) {
    console.warn(`Lovable Credit Monitor: Non-integer credit value detected: ${val}, rounding to nearest integer`);
    return Math.round(val);
  }
  
  return val;
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

    // 5. Keep the existing logic to broadcast updates and stream to Supabase.
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
    
    if (supabase && extensionId) {
      // The Supabase streaming logic can remain as is.
      // We want to log ALL credit events for analytics, not just actionable ones.
      try {
        const sanitizedValue = validateCreditValue(value);
        const { error } = await supabase.from('credit_events').insert({
          extension_id: extensionId,
          credit: sanitizedValue,
          ts: new Date().toISOString(),
        });
        if (error) {
          console.error('Supabase insert error:', error.message);
        }
      } catch (e) {
        if (e instanceof Error) console.error('Failed to send data to Supabase:', e.message);
      }
    }
  }
  return true; // Indicates async response
});