import { useState, useCallback } from 'react';
import type { ConversionHistory } from '../types';

const STORAGE_KEY = 'currency-app-history';
const MAX_HISTORY = 20;

function loadHistory(): ConversionHistory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConversionHistory[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: ConversionHistory[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function useHistory() {
  const [history, setHistory] = useState<ConversionHistory[]>(loadHistory);

  const addEntry = useCallback((entry: Omit<ConversionHistory, 'id' | 'timestamp'>) => {
    const newEntry: ConversionHistory = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, addEntry, clearHistory };
}
