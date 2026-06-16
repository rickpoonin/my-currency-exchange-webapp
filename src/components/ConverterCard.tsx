import { ArrowLeftRight, Loader2 } from 'lucide-react';

interface Props {
  currencies: string[];
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  convertedAmount: number | null;
  rate: number | null;
  loading: boolean;
  error: string | null;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onSwap: () => void;
  onAddToHistory: () => void;
}

export function ConverterCard({
  currencies, fromCurrency, toCurrency, amount, convertedAmount, rate,
  loading, error, onFromChange, onToChange, onAmountChange, onSwap, onAddToHistory,
}: Props) {
  const numAmount = parseFloat(amount) || 0;

  const handleConvert = () => {
    if (convertedAmount !== null) onAddToHistory();
  };

  return (
    <section className="card converter-card" aria-label="Currency Converter">
      <h2 className="card-title">Convert Currency</h2>

      <div className="converter-row">
        {/* From */}
        <div className="currency-group">
          <label htmlFor="from-currency-select" className="field-label">From</label>
          <select
            id="from-currency-select"
            className="currency-select"
            value={fromCurrency}
            onChange={e => onFromChange(e.target.value)}
          >
            {currencies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

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

        {/* To */}
        <div className="currency-group">
          <label htmlFor="to-currency-select" className="field-label">To</label>
          <select
            id="to-currency-select"
            className="currency-select"
            value={toCurrency}
            onChange={e => onToChange(e.target.value)}
          >
            {currencies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
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
          </>
        ) : (
          <p className="result-placeholder">Enter an amount to see the conversion</p>
        )}
      </div>

      <button
        id="save-conversion-btn"
        className="save-btn"
        onClick={handleConvert}
        disabled={convertedAmount === null || loading}
      >
        Save to History
      </button>

      <p className="disclaimer">
        ⚠️ Rates are for informational purposes only. Source: frankfurter.app
      </p>
    </section>
  );
}
