# Lovable Credit Monitor (MVP)

An open-source browser extension to help Lovable.ai users track and predict their credit usage in real-time, preventing unexpected costs and workflow interruptions.

![Lovable Credit Monitor Screenshot](https://i.imgur.com/uR12x1p.png)
*(Replace this with an updated screenshot or, even better, a GIF of the extension in action)*

## The Problem

Lovable's credit-based pricing is a major point of friction for developers. Users frequently burn through their daily credits unexpectedly, especially during prompt engineering or error-fixing loops. This forces workflow interruptions, makes budgeting impossible, and effectively means you're paying to debug the AI.

## The Solution

This extension unobtrusively monitors your credit balance by securely intercepting API calls within the Lovable web app. It provides real-time feedback and predictions without ever leaving the Lovable UI.

### Key Features

* **Real-Time Toast Notifications:** Get immediate feedback on the cost of your last action, with color-coded warnings as your credits get low.
* **Popup Dashboard:** A clean dashboard showing your current credit balance, a sparkline of recent usage, your average burn rate, and an estimate of operations left.
* **Intelligent Burn Detection:** The extension is smart enough to differentiate between a true credit-burning action and a simple page refresh, ensuring calculations are accurate.

## How It Works

The core of this extension is a sophisticated, multi-stage injection and communication architecture designed to securely operate within Chrome's security model.

1.  **Main-World Injection:** A minimal content script (`loader.ts`) injects the main monitoring script (`monitor.ts`) directly into the web page's main JavaScript context. This is necessary to gain access to the page's `fetch` API calls, bypassing Chrome's "isolated worlds" security sandbox.
2.  **API Interception:** The `monitor.ts` script wraps the global `fetch` function, allowing it to inspect the request and response of API calls made to `/workspaces`. It extracts the current credit balance from the JSON response.
3.  **Intelligent State Management:** The background `serviceWorker.ts` acts as the single source of truth. It listens for credit updates and maintains the official `lastCredit` and `creditHistory` in `chrome.storage.local`. Crucially, it only logs a "burn event" to the history if the new credit value is **less than** the previous one, making it resilient to page reloads.
4.  **Decoupled UI:** The React-based popup (`Popup.tsx`) and the toast notifications are "dumb" components. They simply read from the central data store and display the results, ensuring data consistency across the entire extension.

## Tech Stack

* **Frontend:** React, TypeScript, TailwindCSS
* **Extension Framework:** Vite for building a modern Chrome Extension
* **State Management:** Native `chrome.storage.local` API
* **Charting:** `react-sparklines`

## Getting Started

1.  **Clone the repository.**
2.  **Install dependencies:** `npm install`
3.  **Build the extension for production:** `npm run build`
4.  **Load the extension in Chrome:**
    * Navigate to `chrome://extensions`
    * Enable "Developer mode"
    * Click "Load unpacked" and select the `dist` directory that was just created.