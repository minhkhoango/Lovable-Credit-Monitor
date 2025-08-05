// Pylance strict mode compliant
import React, { useEffect, useState } from 'react';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import './Popup.css'; // Assuming you have a CSS file for basic styling

export default function Popup(): React.JSX.Element {
  const [credits, setCredits] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  const [burnRate, setBurnRate] = useState<number>(0);

  useEffect(() => {
    // Initial load from storage
    chrome.storage.local.get(['lastCredit', 'creditHistory'], (data) => {
      if (data.lastCredit) setCredits(data.lastCredit as number);
      if (data.creditHistory) {
        const hist = data.creditHistory as number[];
        setHistory(hist);
        calculateBurnRate(hist);
      }
    });

    // Listen for subsequent changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        if (changes.lastCredit) {
          setCredits(changes.lastCredit.newValue as number);
        }
        if (changes.creditHistory) {
          const newHist = changes.creditHistory.newValue as number[];
          setHistory(newHist);
          calculateBurnRate(newHist);
        }
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const calculateBurnRate = (hist: number[]) => {
    console.log('Calculating burn rate with history:', hist);
    if (hist.length < 2) {
      console.log('Not enough history points for burn rate calculation');
      setBurnRate(0);
      return;
    }
    // Calculate burn rate: (oldest - newest) / number of operations
    // History is stored in chronological order [oldest, ..., newest]
    const creditsUsed = hist[0] - hist[hist.length - 1];
    const operations = hist.length - 1;
    const rate = creditsUsed > 0 ? creditsUsed / operations : 0;
    console.log(`Burn rate calculation: ${creditsUsed} credits used over ${operations} operations = ${rate}`);
    setBurnRate(rate);
  };

  const operationsLeft = burnRate > 0 && credits > 0 ? Math.floor(credits / burnRate) : '∞';

  return (
    <div className="p-4 w-64 bg-white text-gray-800 font-sans">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg font-bold">Credit Monitor</h1>
        <span className="text-xl font-bold text-blue-600">{credits}</span>
      </div>

      <div className="h-16 my-2">
        {history.length > 1 ? (
          <Sparklines data={history} width={100} height={40} margin={5}>
            <SparklinesLine color="#3b82f6" />
          </Sparklines>
        ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Awaiting data...
            </div>
        )}
      </div>

      <div className="mt-4 p-2 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">Avg. burn-rate: <strong className="text-gray-900">{burnRate.toFixed(2)}</strong> credits/op</p>
        <p className="text-sm text-gray-600">Est. time to empty: <strong className="text-gray-900">{operationsLeft}</strong> ops</p>
      </div>
       <p className="text-xs text-center text-gray-400 mt-4">v0.1.0</p>
    </div>
  );
}