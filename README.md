# Lovable Credit Monitor (MVP)

An open-source browser extension to help Lovable users track and predict their credit usage in real-time, preventing unexpected costs and workflow interruptions.

## The Problem

Lovable's credit-based pricing is a major point of friction. Users frequently run out of credits unexpectedly, especially during error-fix loops, which stifles development and makes budgeting impossible. You're paying to debug the AI.

## The Solution

This extension unobtrusively monitors your credit balance directly from the Lovable UI. It provides a simple dashboard with:
-   Real-time credit count
-   A sparkline of your recent usage history
-   A simple prediction for when you'll run out of credits at your current pace

All data can be anonymously streamed to a Supabase backend for more advanced analysis, helping build a model of which actions are most expensive.

## Getting Started

1.  **Clone the repository.**
2.  **Install dependencies:** `npm install`
3.  **Create a `.env` file** with your Supabase credentials:
    ```
    VITE_SUPABASE_URL=your_url
    VITE_SUPABASE_ANON_KEY=your_key
    ```
4.  **Build the extension:** `npm run build`
5.  **Load the extension in Chrome:**
    -   Navigate to `chrome://extensions`
    -   Enable "Developer mode"
    -   Click "Load unpacked" and select the `dist` directory.