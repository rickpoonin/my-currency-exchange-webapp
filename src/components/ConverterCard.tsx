import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import type { ExchangeRateProvider, HistoricalRateResponse, RateSource, RateSourceOption, SourceRateResult } from '../types';

const CURRENCY_FLAG_CODES: Record<string, string> = {
  AUD: 'au',
  BGN: 'bg',
  BRL: 'br',
  CAD: 'ca',
  CHF: 'ch',
  CNY: 'cn',
  CZK: 'cz',
  DKK: 'dk',
  EUR: 'eu',
  GBP: 'gb',
  HKD: 'hk',
  HUF: 'hu',
  IDR: 'id',
  ILS: 'il',
  INR: 'in',
  ISK: 'is',
  JPY: 'jp',
  KRW: 'kr',
  MXN: 'mx',
  MYR: 'my',
  NOK: 'no',
  NZD: 'nz',
  PHP: 'ph',
  PLN: 'pl',
  RON: 'ro',
  SEK: 'se',
  SGD: 'sg',
  THB: 'th',
  TRY: 'tr',
  USD: 'us',
  ZAR: 'za',
};

function getFlagSrc(currency: string) {
  const flagCode = CURRENCY_FLAG_CODES[currency];
  return flagCode ? `/flags/${flagCode}.png` : undefined;
}

function CurrencyFlag({ currency }: { currency: string }) {
  const flagSrc = getFlagSrc(currency);

  if (!flagSrc) {
    return <span className="currency-flag-fallback" aria-hidden="true">{currency.slice(0, 2)}</span>;
  }

  return <img className="currency-flag" src={flagSrc} alt="" aria-hidden="true" />;
}

interface CurrencySelectProps {
  id: string;
  label: string;
  currencies: string[];
  value: string;
  onChange: (v: string) => void;
}

function CurrencySelect({ id, label, currencies, value, onChange }: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const normalizedSearch = searchTerm.trim().toUpperCase();
  const filteredCurrencies = normalizedSearch
    ? currencies.filter(currency => currency.includes(normalizedSearch))
    : currencies;

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearchTerm('');
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeDropdown, open]);

  useEffect(() => {
    if (!open) return;

    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  const handleSelect = (currency: string) => {
    onChange(currency);
    closeDropdown();
  };

  return (
    <div className="currency-group" ref={rootRef}>
      <span id={`${id}-label`} className="field-label">{label}</span>
      <button
        id={id}
        type="button"
        className="currency-select-button"
        aria-labelledby={`${id}-label ${id}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        onKeyDown={event => {
          if (event.key === 'Escape') closeDropdown();
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
          if (/^[a-z0-9]$/i.test(event.key)) {
            event.preventDefault();
            setSearchTerm(event.key.toUpperCase());
            setOpen(true);
          }
        }}
      >
        <CurrencyFlag currency={value} />
        <span>{value}</span>
      </button>
      {open && (
        <div className="currency-options-panel">
          <input
            ref={searchRef}
            className="currency-search"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value.toUpperCase())}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                closeDropdown();
              }
              if (event.key === 'Enter' && filteredCurrencies.length > 0) {
                handleSelect(filteredCurrencies[0]);
              }
            }}
            placeholder="Search currency"
            aria-label={`Search ${label.toLowerCase()} currency`}
          />
          <div className="currency-options" role="listbox" aria-labelledby={`${id}-label`}>
            {filteredCurrencies.map(currency => (
              <button
                key={currency}
                type="button"
                className="currency-option"
                role="option"
                aria-selected={currency === value}
                onClick={() => handleSelect(currency)}
              >
                <CurrencyFlag currency={currency} />
                <span>{currency}</span>
              </button>
            ))}
            {filteredCurrencies.length === 0 && (
              <div className="currency-option-empty">No matching currency</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildHistoryPath(points: HistoricalRateResponse[]) {
  if (points.length === 0) return '';

  const rates = points.map(point => point.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const range = maxRate - minRate || 1;
  const width = 300;
  const height = 90;
  const xStep = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * xStep;
      const y = height - ((point.rate - minRate) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function RateHistoryChart({
  historicalRates,
  fromCurrency,
  toCurrency,
  historyLabel,
}: {
  historicalRates: HistoricalRateResponse[];
  fromCurrency: string;
  toCurrency: string;
  historyLabel: string;
}) {
  if (historicalRates.length < 2) return null;

  const firstRate = historicalRates[0].rate;
  const lastRate = historicalRates[historicalRates.length - 1].rate;
  const variance = ((lastRate - firstRate) / firstRate) * 100;
  const lowPoint = historicalRates.reduce((lowest, point) => point.rate < lowest.rate ? point : lowest);
  const highPoint = historicalRates.reduce((highest, point) => point.rate > highest.rate ? point : highest);
  const path = buildHistoryPath(historicalRates);

  return (
    <div className="rate-chart" aria-label={`${historyLabel} ${fromCurrency} to ${toCurrency} variance chart`}>
      <div className="rate-chart-header">
        <span>{historyLabel} variance</span>
        <strong className={variance >= 0 ? 'variance-positive' : 'variance-negative'}>
          {variance >= 0 ? '+' : ''}{variance.toFixed(2)}%
        </strong>
      </div>
      <svg className="rate-chart-svg" viewBox="0 0 300 90" preserveAspectRatio="none" role="img">
        <title>{`${fromCurrency} to ${toCurrency} rate over the last ${historyLabel}`}</title>
        <path className="rate-chart-grid" d="M 0 15 H 300 M 0 45 H 300 M 0 75 H 300" />
        <path className="rate-chart-line" d={path} />
      </svg>
      <div className="rate-chart-meta">
        <span>Low {lowPoint.rate.toFixed(4)} on {lowPoint.date}</span>
        <span>High {highPoint.rate.toFixed(4)} on {highPoint.date}</span>
      </div>
    </div>
  );
}

function ProviderTable({
  providers,
  providerNamesByKey,
}: {
  providers: ExchangeRateProvider[];
  providerNamesByKey: Record<string, string>;
}) {
  if (providers.length === 0) {
    return <p className="provider-empty">Providers: Not reported</p>;
  }

  return (
    <div className="provider-table-wrap" aria-label="Rate providers">
      <table className="provider-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Code</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {providers.map(provider => (
            <tr key={provider.key}>
              <td>{providerNamesByKey[provider.key] ?? provider.key}</td>
              <td>{provider.key}</td>
              <td>{provider.rate.toFixed(6)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceComparison({ sourceRates }: { sourceRates: SourceRateResult[] }) {
  if (sourceRates.length === 0) return null;

  return (
    <div className="source-comparison" aria-label="Rate-source comparison">
      <p className="source-comparison-title">Source comparison</p>
      <table className="source-comparison-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Rate</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {sourceRates.map(sourceRate => (
            <tr key={sourceRate.source}>
              <td>{sourceRate.label}</td>
              {sourceRate.rate === undefined ? (
                <td colSpan={2} className="source-comparison-unavailable">Unavailable: {sourceRate.error}</td>
              ) : (
                <>
                  <td>{sourceRate.rate.toFixed(6)}</td>
                  <td>{sourceRate.date}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  currencies: string[];
  rateSource: RateSource;
  rateSources: RateSourceOption[];
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  convertedAmount: number | null;
  rate: number | null;
  rateDate: string | null;
  providers: ExchangeRateProvider[];
  providerNamesByKey: Record<string, string>;
  historicalRates: HistoricalRateResponse[];
  sourceRates: SourceRateResult[];
  historyLabel: string;
  loading: boolean;
  error: string | null;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onRateSourceChange: (source: RateSource) => void;
  onAmountChange: (v: string) => void;
  onSwap: () => void;
  onAddToHistory: () => void;
}

export function ConverterCard({
  currencies, rateSource, rateSources, fromCurrency, toCurrency, amount, convertedAmount, rate,
  rateDate, providers, providerNamesByKey, historicalRates, sourceRates, historyLabel, loading, error,
  onFromChange, onToChange, onRateSourceChange, onAmountChange, onSwap, onAddToHistory,
}: Props) {
  const numAmount = parseFloat(amount) || 0;
  const activeSource = rateSources.find(source => source.id === rateSource) ?? rateSources[0];

  const handleConvert = () => {
    if (convertedAmount !== null) onAddToHistory();
  };

  return (
    <section className="card converter-card" aria-label="Currency Converter">
      <h2 className="card-title">Convert Currency</h2>

      <div className="source-group">
        <label className="field-label" htmlFor="rate-source-select">Rate source</label>
        <select
          id="rate-source-select"
          className="rate-source-select"
          value={rateSource}
          onChange={event => onRateSourceChange(event.target.value as RateSource)}
        >
          {rateSources.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}
        </select>
        <p className="source-description">{activeSource.description}</p>
      </div>

      <div className="converter-row">
        <CurrencySelect
          id="from-currency-select"
          label="From"
          currencies={currencies}
          value={fromCurrency}
          onChange={onFromChange}
        />

        {/* Swap */}
        <button
          id="swap-currencies-btn"
          className="swap-btn"
          onClick={onSwap}
          aria-label="Swap currencies"
          title="Swap currencies"
        >
          <ArrowLeftRight size={18} />
        </button>

        <CurrencySelect
          id="to-currency-select"
          label="To"
          currencies={currencies}
          value={toCurrency}
          onChange={onToChange}
        />
      </div>

      {/* Amount */}
      <div className="amount-group">
        <label htmlFor="amount-input" className="field-label">Amount</label>
        <input
          id="amount-input"
          className="amount-input"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          placeholder="Enter amount"
        />
      </div>

      {/* Result */}
      <div className="result-box">
        {loading ? (
          <div className="result-loading">
            <Loader2 size={20} className="spin" />
            <span>Fetching rate…</span>
          </div>
        ) : error ? (
          <p className="result-error">{error}</p>
        ) : convertedAmount !== null ? (
          <>
            <p className="result-value">
              {numAmount.toLocaleString()} {fromCurrency}
              <span className="result-equals"> = </span>
              <strong>{convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {toCurrency}</strong>
            </p>
            {rate !== null && (
              <p className="result-rate">
                1 {fromCurrency} = {rate.toFixed(6)} {toCurrency}
              </p>
            )}
            <p className="result-provider">
              {rateSource === 'all' ? 'Reference amount: ' : 'Rate date: '}{rateDate ?? 'n/a'}
            </p>
            {rateSource === 'all'
              ? <SourceComparison sourceRates={sourceRates} />
              : <ProviderTable providers={providers} providerNamesByKey={providerNamesByKey} />}
          </>
        ) : (
          <p className="result-placeholder">Enter an amount to see the conversion</p>
        )}
      </div>

      <RateHistoryChart
        historicalRates={historicalRates}
        fromCurrency={fromCurrency}
        toCurrency={toCurrency}
        historyLabel={historyLabel}
      />

      <button
        id="save-conversion-btn"
        className="save-btn"
        onClick={handleConvert}
        disabled={convertedAmount === null || loading}
      >
        Save to History
      </button>

      <p className="disclaimer">
        Rates are for informational purposes only. {rateSource === 'all' ? 'All available sources are shown.' : `Source: ${activeSource.label}`}
      </p>
    </section>
  );
}
