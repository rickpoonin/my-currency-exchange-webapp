import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  CurrencyResponse,
  ExchangeRateProvider,
  ExchangeRateResponse,
  HistoricalRateResponse,
  IndividualRateSource,
  ProviderResponse,
  RateSource,
  RateSourceOption,
  SourceRateResult,
} from '../types';

const FRANKFURTER_API_BASE = 'https://api.frankfurter.dev/v2';
const HKMA_DAILY_RATES_URL = 'https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/er-eeri-daily?offset=0';
const CENSTATD_RATES_URL = import.meta.env.VITE_CENSTATD_RATES_URL
  ?? (import.meta.env.DEV ? '/api/censtatd' : '');
const DEBOUNCE_MS = 500;
const FALLBACK_CURRENCIES = [
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK',
  'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
];
const HKMA_CURRENCIES = [
  'AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'HKD', 'IDR', 'INR', 'JPY',
  'KRW', 'MYR', 'PHP', 'SGD', 'THB', 'TWD', 'USD', 'ZAR',
];
const CENSTATD_CURRENCIES = HKMA_CURRENCIES.filter(currency => currency !== 'IDR');
const HKMA_RATE_FIELDS: Record<string, string> = {
  AUD: 'aud', CAD: 'cad', CHF: 'chf', CNY: 'cny', EUR: 'eur', GBP: 'gbp',
  IDR: 'idr', INR: 'inr', JPY: 'jpy', KRW: 'krw', MYR: 'myr', PHP: 'php',
  SGD: 'sgd', THB: 'thb', TWD: 'twd', USD: 'usd', ZAR: 'zar',
};
const CENSTATD_RATE_FIELDS: Record<string, string> = {
  AUD: 'FC_AUD', CAD: 'FC_CAD', CHF: 'FC_CHF', CNY: 'FC_CNY', EUR: 'FC_EUR',
  GBP: 'FC_GBP', INR: 'FC_INR', JPY: 'FC_JPY', KRW: 'FC_WON', MYR: 'FC_MYR',
  PHP: 'FC_PHP', SGD: 'FC_SGD', THB: 'FC_THB', TWD: 'FC_TWD', USD: 'FC_USD',
  ZAR: 'FC_ZAR',
};

export const RATE_SOURCES: RateSourceOption[] = [
  {
    id: 'all',
    label: 'All sources',
    description: 'Compare the available sources. Frankfurter is used for the reference amount when available.',
    url: '',
    historyLabel: 'Frankfurter 30-day',
  },
  {
    id: 'frankfurter',
    label: 'Frankfurter',
    description: 'Broad currency coverage with daily historical rates.',
    url: 'https://frankfurter.dev',
    historyLabel: '30-day',
  },
  {
    id: 'hkma',
    label: 'Hong Kong Monetary Authority (HKMA)',
    description: 'Official HKD cross rates, published daily for selected currencies.',
    url: 'https://apidocs.hkma.gov.hk/documentation/market-data-and-statistics/monthly-statistical-bulletin/er-ir/er-eeri-daily/',
    historyLabel: '30-day',
  },
  {
    id: 'censtatd',
    label: 'Census and Statistics Department (C&SD)',
    description: 'Official monthly-average HKD cross rates for reporting and reference.',
    url: 'https://www.censtatd.gov.hk/api/get.php?id=340-46001&lang=en&full_series=1',
    historyLabel: '30-month',
  },
];

type HkdRateMap = Record<string, number>;

interface HkmaRateRecord extends Record<string, number | string | null> {
  end_of_day: string;
}

interface HkmaRateResponse {
  result?: { records?: HkmaRateRecord[] };
}

interface CenstatdRateRecord {
  freq: string;
  period: string;
  sv: string;
  figure: number;
}

interface CenstatdRateResponse {
  dataSet?: CenstatdRateRecord[];
}

function rateThroughHkd(rates: HkdRateMap, fromCurrency: string, toCurrency: string) {
  const fromRate = fromCurrency === 'HKD' ? 1 : rates[fromCurrency];
  const toRate = toCurrency === 'HKD' ? 1 : rates[toCurrency];

  if (!fromRate || !toRate) {
    throw new Error(`No published HKD cross rate is available for ${fromCurrency}/${toCurrency}.`);
  }

  return fromRate / toRate;
}

function availableCrossRate(rates: HkdRateMap, fromCurrency: string, toCurrency: string) {
  try {
    return rateThroughHkd(rates, fromCurrency, toCurrency);
  } catch {
    return null;
  }
}

function hkmaHkdRates(record: HkmaRateRecord): HkdRateMap {
  const rates: HkdRateMap = { HKD: 1 };

  Object.entries(HKMA_RATE_FIELDS).forEach(([currency, field]) => {
    const value = record[field];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) rates[currency] = value;
  });

  return rates;
}

function censtatdHkdRates(records: CenstatdRateRecord[]): HkdRateMap {
  const rates: HkdRateMap = { HKD: 1 };
  const recordByField = new Map(records.map(record => [record.sv, record.figure]));

  Object.entries(CENSTATD_RATE_FIELDS).forEach(([currency, field]) => {
    const value = recordByField.get(field);
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) rates[currency] = value;
  });

  return rates;
}

function formatMonthlyPeriod(period: string) {
  return `${period.slice(0, 4)}-${period.slice(4, 6)}`;
}

function currenciesForSource(source: RateSource) {
  if (source === 'hkma') return HKMA_CURRENCIES;
  if (source === 'censtatd') return CENSTATD_CURRENCIES;
  return null;
}

interface ResolvedSourceRate extends SourceRateResult {
  rate: number;
  date: string;
  history: HistoricalRateResponse[];
  providers: ExchangeRateProvider[];
}

function sourceLabel(source: IndividualRateSource) {
  return RATE_SOURCES.find(option => option.id === source)?.label ?? source;
}

async function fetchSourceRate(
  source: IndividualRateSource,
  fromCurrency: string,
  toCurrency: string,
  controller: AbortController,
  fromDateParam: string,
  toDateParam: string,
  censtatdCache: { current: CenstatdRateResponse | null },
): Promise<ResolvedSourceRate> {
  if (source === 'frankfurter') {
    const response = await fetch(`${FRANKFURTER_API_BASE}/rate/${fromCurrency}/${toCurrency}?expand=providers`, { signal: controller.signal });
    if (!response.ok) throw new Error('Frankfurter rate request failed');
    const data = await response.json() as ExchangeRateResponse;
    let history: HistoricalRateResponse[] = [];

    try {
      const historyResponse = await fetch(`${FRANKFURTER_API_BASE}/rates?base=${fromCurrency}&quotes=${toCurrency}&from=${fromDateParam}&to=${toDateParam}`, { signal: controller.signal });
      if (historyResponse.ok) history = await historyResponse.json() as HistoricalRateResponse[];
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }

    return {
      source,
      label: sourceLabel(source),
      rate: data.rate,
      date: data.date,
      history,
      providers: data.providers ?? [],
    };
  }

  if (source === 'hkma') {
    const response = await fetch(HKMA_DAILY_RATES_URL, { signal: controller.signal });
    if (!response.ok) throw new Error('HKMA rate request failed');
    const data = await response.json() as HkmaRateResponse;
    const history = (data.result?.records ?? [])
      .flatMap(record => {
        const recordRate = availableCrossRate(hkmaHkdRates(record), fromCurrency, toCurrency);
        return recordRate === null ? [] : [{ base: fromCurrency, quote: toCurrency, date: record.end_of_day, rate: recordRate }];
      })
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-30);
    const latest = history.at(-1);
    if (!latest) throw new Error(`No HKMA rate is available for ${fromCurrency}/${toCurrency}.`);

    return {
      source,
      label: sourceLabel(source),
      rate: latest.rate,
      date: latest.date,
      history,
      providers: [{ key: 'HKMA', rate: latest.rate }],
    };
  }

  if (!CENSTATD_RATES_URL) {
    throw new Error('C&SD needs a configured same-origin proxy in this deployment.');
  }
  let data = censtatdCache.current;
  if (!data) {
    const response = await fetch(CENSTATD_RATES_URL, { signal: controller.signal });
    if (!response.ok) throw new Error('C&SD rate request failed');
    data = await response.json() as CenstatdRateResponse;
    censtatdCache.current = data;
  }
  const recordsByPeriod = new Map<string, CenstatdRateRecord[]>();
  data.dataSet
    ?.filter(record => record.freq === 'M' && record.period.length === 6)
    .forEach(record => {
      const periodRecords = recordsByPeriod.get(record.period) ?? [];
      periodRecords.push(record);
      recordsByPeriod.set(record.period, periodRecords);
    });
  const history = [...recordsByPeriod.entries()]
    .flatMap(([period, periodRecords]) => {
      const periodRate = availableCrossRate(censtatdHkdRates(periodRecords), fromCurrency, toCurrency);
      return periodRate === null ? [] : [{ base: fromCurrency, quote: toCurrency, date: formatMonthlyPeriod(period), rate: periodRate }];
    })
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-30);
  const latest = history.at(-1);
  if (!latest) throw new Error(`No C&SD monthly rate is available for ${fromCurrency}/${toCurrency}.`);

  return {
    source,
    label: sourceLabel(source),
    rate: latest.rate,
    date: `${latest.date} monthly average`,
    history,
    providers: [{ key: 'CENSTATD', rate: latest.rate }],
  };
}

export function useExchangeRates() {
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [rateSource, setRateSource] = useState<RateSource>(() => {
    const savedSource = localStorage.getItem('rateSource');
    return savedSource === 'all' || savedSource === 'hkma' || savedSource === 'censtatd' ? savedSource : 'frankfurter';
  });
  const [fromCurrency, setFromCurrency] = useState<string>(() => localStorage.getItem('fromCurrency') ?? 'USD');
  const [toCurrency, setToCurrency] = useState<string>(() => localStorage.getItem('toCurrency') ?? 'HKD');
  const [amount, setAmount] = useState<string>('1');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [providers, setProviders] = useState<ExchangeRateProvider[]>([]);
  const [providerNamesByKey, setProviderNamesByKey] = useState<Record<string, string>>({});
  const [historicalRates, setHistoricalRates] = useState<HistoricalRateResponse[]>([]);
  const [sourceRates, setSourceRates] = useState<SourceRateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const censtatdDataRef = useRef<CenstatdRateResponse | null>(null);

  useEffect(() => {
    const localCurrencies = currenciesForSource(rateSource);
    if (localCurrencies) {
      setCurrencies(localCurrencies);
      return;
    }

    const controller = new AbortController();
    fetch(`${FRANKFURTER_API_BASE}/currencies`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Currency list request failed');
        return response.json() as Promise<CurrencyResponse[]>;
      })
      .then(data => setCurrencies(data.map(currency => currency.iso_code).sort()))
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setCurrencies(FALLBACK_CURRENCIES);
        setError('Failed to load live currency list. Showing common currencies.');
      });

    return () => controller.abort();
  }, [rateSource]);

  useEffect(() => {
    if (rateSource === 'all') {
      setProviderNamesByKey({});
      return;
    }

    if (rateSource !== 'frankfurter') {
      const sourceKey = rateSource.toUpperCase();
      const sourceName = rateSource === 'hkma' ? 'Hong Kong Monetary Authority' : 'Census and Statistics Department';
      setProviderNamesByKey({ [sourceKey]: sourceName });
      return;
    }

    const controller = new AbortController();
    fetch(`${FRANKFURTER_API_BASE}/providers`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Provider list request failed');
        return response.json() as Promise<ProviderResponse[]>;
      })
      .then(data => setProviderNamesByKey(Object.fromEntries(data.map(provider => [provider.key, provider.name]))))
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setProviderNamesByKey({});
      });

    return () => controller.abort();
  }, [rateSource]);

  useEffect(() => { localStorage.setItem('fromCurrency', fromCurrency); }, [fromCurrency]);
  useEffect(() => { localStorage.setItem('toCurrency', toCurrency); }, [toCurrency]);
  useEffect(() => { localStorage.setItem('rateSource', rateSource); }, [rateSource]);

  const setSource = useCallback((nextSource: RateSource) => {
    const supportedCurrencies = currenciesForSource(nextSource);
    if (!supportedCurrencies) {
      setRateSource(nextSource);
      return;
    }
    const nextFrom = supportedCurrencies?.includes(fromCurrency) ? fromCurrency : 'USD';
    const nextTo = supportedCurrencies?.includes(toCurrency) && toCurrency !== nextFrom
      ? toCurrency
      : nextFrom === 'HKD' ? 'USD' : 'HKD';

    setRateSource(nextSource);
    setFromCurrency(nextFrom);
    setToCurrency(nextTo);
  }, [fromCurrency, toCurrency]);

  const convert = useCallback(async () => {
    const numAmount = parseFloat(amount);
    abortRef.current?.abort();
    abortRef.current = null;

    if (!numAmount || Number.isNaN(numAmount) || fromCurrency === toCurrency) {
      setConvertedAmount(null);
      setRate(null);
      setRateDate(null);
      setProviders([]);
      setHistoricalRates([]);
      setSourceRates([]);
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

    try {
      const requestedSources: IndividualRateSource[] = rateSource === 'all'
        ? ['frankfurter', 'hkma', 'censtatd']
        : [rateSource];
      const settled = await Promise.allSettled(
        requestedSources.map(source => fetchSourceRate(
          source,
          fromCurrency,
          toCurrency,
          controller,
          fromDateParam,
          toDateParam,
          censtatdDataRef,
        )),
      );
      const successfulRates = settled
        .filter((result): result is PromiseFulfilledResult<ResolvedSourceRate> => result.status === 'fulfilled')
        .map(result => result.value);
      const comparisonRates: SourceRateResult[] = settled.map((result, index) => {
        const source = requestedSources[index];
        if (result.status === 'fulfilled') {
          return { source, label: result.value.label, rate: result.value.rate, date: result.value.date };
        }
        return {
          source,
          label: sourceLabel(source),
          error: result.reason instanceof Error ? result.reason.message : 'Source request failed.',
        };
      });
      if (controller.signal.aborted) return;
      const referenceRate = successfulRates.find(result => result.source === 'frankfurter') ?? successfulRates[0];
      if (!referenceRate) throw new Error('No selected rate source returned a conversion.');

      if (abortRef.current !== controller) return;
      setConvertedAmount(numAmount * referenceRate.rate);
      setRate(referenceRate.rate);
      setRateDate(rateSource === 'all' ? `${referenceRate.label}: ${referenceRate.date}` : referenceRate.date);
      setProviders(rateSource === 'all' ? [] : referenceRate.providers);
      setHistoricalRates(referenceRate.history);
      setSourceRates(rateSource === 'all' ? comparisonRates : []);
      setError(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setError(error instanceof Error ? error.message : 'Failed to fetch exchange rate.');
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, [amount, fromCurrency, rateSource, toCurrency]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void convert(); }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [convert]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return {
    currencies,
    rateSource,
    rateSources: RATE_SOURCES,
    setRateSource: setSource,
    fromCurrency, setFromCurrency,
    toCurrency, setToCurrency,
    amount, setAmount,
    convertedAmount,
    rate,
    rateDate,
    providers,
    providerNamesByKey,
    historicalRates,
    sourceRates,
    loading,
    error,
    swapCurrencies,
  };
}
