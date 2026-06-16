import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  CurrencyResponse,
  ExchangeRateProvider,
  ExchangeRateResponse,
  HistoricalRateResponse,
  ProviderResponse,
} from '../types';

const API_BASE = 'https://api.frankfurter.dev/v2';
const DEBOUNCE_MS = 500;
const FALLBACK_CURRENCIES = [
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK',
  'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
];

export function useExchangeRates() {
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [fromCurrency, setFromCurrency] = useState<string>(() => localStorage.getItem('fromCurrency') ?? 'USD');
  const [toCurrency, setToCurrency] = useState<string>(() => localStorage.getItem('toCurrency') ?? 'HKD');
  const [amount, setAmount] = useState<string>('1');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [providers, setProviders] = useState<ExchangeRateProvider[]>([]);
  const [providerNamesByKey, setProviderNamesByKey] = useState<Record<string, string>>({});
  const [historicalRates, setHistoricalRates] = useState<HistoricalRateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch available currencies on mount
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE}/currencies`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Currency list request failed');
        return res.json() as Promise<CurrencyResponse[]>;
      })
      .then(data => {
        setCurrencies(data.map(currency => currency.iso_code).sort());
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCurrencies(FALLBACK_CURRENCIES);
        setError('Failed to load live currency list. Showing common currencies.');
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE}/providers`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Provider list request failed');
        return res.json() as Promise<ProviderResponse[]>;
      })
      .then(data => {
        setProviderNamesByKey(Object.fromEntries(data.map(provider => [provider.key, provider.name])));
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setProviderNamesByKey({});
      });

    return () => controller.abort();
  }, []);

  // Persist user selections
  useEffect(() => { localStorage.setItem('fromCurrency', fromCurrency); }, [fromCurrency]);
  useEffect(() => { localStorage.setItem('toCurrency', toCurrency); }, [toCurrency]);

  const convert = useCallback(() => {
    const numAmount = parseFloat(amount);
    abortRef.current?.abort();
    abortRef.current = null;

    if (!numAmount || isNaN(numAmount) || fromCurrency === toCurrency) {
      setConvertedAmount(null);
      setRate(null);
      setRateDate(null);
      setProviders([]);
      setHistoricalRates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);
    const toDateParam = endDate.toISOString().slice(0, 10);
    const fromDateParam = startDate.toISOString().slice(0, 10);

    Promise.all([
      fetch(`${API_BASE}/rate/${fromCurrency}/${toCurrency}?expand=providers`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error('API error');
          return res.json() as Promise<ExchangeRateResponse>;
        }),
      fetch(`${API_BASE}/rates?base=${fromCurrency}&quotes=${toCurrency}&from=${fromDateParam}&to=${toDateParam}`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error('History API error');
          return res.json() as Promise<HistoricalRateResponse[]>;
        }),
    ])
      .then(([data, history]) => {
        const result = numAmount * data.rate;
        setConvertedAmount(result);
        setRate(data.rate);
        setRateDate(data.date);
        setProviders(data.providers ?? []);
        setHistoricalRates(history);
        setError(null);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setError('Failed to fetch exchange rate. Please try again.');
      })
      .finally(() => {
        if (abortRef.current === controller) {
          setLoading(false);
          abortRef.current = null;
        }
      });
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
    rateDate,
    providers,
    providerNamesByKey,
    historicalRates,
    loading,
    error,
    swapCurrencies,
  };
}
