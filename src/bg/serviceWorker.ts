// Pylance strict mode compliant
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid'; // Simple way to get a unique ID

interface CreditUpdateMessage {
  type: 'CREDIT_UPDATE';
  value: number;
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
  if (message.type === 'CREDIT_UPDATE') {
    const { value } = message;

    // 1. Persist locally for the popup UI
    const result = await chrome.storage.local.get('creditHistory');
    const history: number[] = result['creditHistory'] || [];
    const newHistory = [...history, value].slice(-50); // Keep last 50 points
    
    await chrome.storage.local.set({
      lastCredit: value,
      creditHistory: newHistory,
    });

    // 2. Dispatch credit_update event to all tabs for immediate popup updates
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'CREDIT_UPDATE_FROM_BACKGROUND',
            value: value
          }).catch(() => {
            // Ignore errors for tabs that don't have our content script
          });
        }
      }
      
      // Also send directly to popup if it's open
      chrome.runtime.sendMessage({
        type: 'CREDIT_UPDATE_FROM_BACKGROUND',
        value: value
      }).catch(() => {
        // Ignore errors if popup is not open
      });
    } catch (error) {
      console.log('Lovable Credit Monitor: Error dispatching to tabs:', error);
    }

    // 3. Stream to Supabase for long-term analysis (if configured)
    if (!supabase || !extensionId) return;

    try {
      // Validate and sanitize the credit value
      const sanitizedValue = validateCreditValue(value);
      
      // Client-side validation regex to ensure integer format
      if (!/^\d+$/.test(sanitizedValue.toString())) {
        throw new Error(`Credit value failed regex validation: ${sanitizedValue}`);
      }
      
      const insertPayload = {
        extension_id: extensionId,
        credit: sanitizedValue,
        ts: new Date().toISOString(),
      };
      
      console.log('Lovable Credit Monitor: Inserting to Supabase:', insertPayload);
      
      const { error } = await supabase.from('credit_events').insert(insertPayload);
      
      if (error) {
        console.error('Supabase insert error:', error.message);
        console.error('Failed payload:', insertPayload);
      } else {
        console.log('Lovable Credit Monitor: Successfully inserted credit event to Supabase');
      }
      
    } catch (e) {
      if (e instanceof Error) {
        console.error('Failed to send data to Supabase:', e.message);
        console.error('Original value:', value);
      }
    }
  }
  return true; // Indicates we will respond asynchronously
});