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

    // 2. Stream to Supabase for long-term analysis (if configured)
    if (!supabase || !extensionId) return;

    try {
      const { error } = await supabase.from('credit_events').insert({
        extension_id: extensionId,
        credit: value,
        ts: new Date().toISOString(),
      });
      if (error) {
        console.error('Supabase insert error:', error.message);
      }
    } catch (e) {
        if (e instanceof Error) {
            console.error('Failed to send data to Supabase:', e.message);
        }
    }
  }
  return true; // Indicates we will respond asynchronously
});