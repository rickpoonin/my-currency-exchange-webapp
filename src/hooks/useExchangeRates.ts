import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExchangeRateResponse } from '../types';

const API_BASE = 'https://api.frankfurter.app';
const DEBOUNCE_MS = 500;

export function useExchangeRates() {
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [fromCurrency, setFromCurrency] = useState<string>(() => localStorage.getItem('fromCurrency') ?? 'USD');
  const [toCurrency, setToCurrency] = useState<string>(() => localStorage.getItem('toCurrency') ?? 'HKD');
  const [amount, setAmount] = useState<string>('1');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch available currencies on mount
  useEffect(() => {
    fetch(`${API_BASE}/currencies`)
      .then(res => res.json())
      .then((data: Record<string, string>) => {
        setCurrencies(Object.keys(data).sort());
      })
      .catch(() => setError('Failed to load currencies.'));
  }, []);

  // Persist user selections
  useEffect(() => { localStorage.setItem('fromCurrency', fromCurrency); }, [fromCurrency]);
  useEffect(() => { localStorage.setItem('toCurrency', toCurrency); }, [toCurrency]);

  const convert = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || fromCurrency === toCurrency) {
      setConvertedAmount(null);
      setRate(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/latest?amount=${numAmount}&from=${fromCurrency}&to=${toCurrency}`)
      .then(res => {
        if (!res.ok) throw new Error('API error');
        return res.json() as Promise<ExchangeRateResponse>;
      })
      .then(data => {
        const result = data.rates[toCurrency];
        const baseRate = result / numAmount;
        setConvertedAmount(result);
        setRate(baseRate);
        setError(null);
      })
      .catch(() => setError('Failed to fetch exchange rate. Please try again.'))
      .finally(() => setLoading(false));
  }, [amount, fromCurrency, toCurrency]);

  // Debounced conversion trigger
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(convert, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [convert]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return {
    currencies,
    fromCurrency, setFromCurrency,
    toCurrency, setToCurrency,
    amount, setAmount,
    convertedAmount,
    rate,
    loading,
    error,
    swapCurrencies,
  };
}
