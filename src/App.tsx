import { useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { useExchangeRates } from './hooks/useExchangeRates';
import { useHistory } from './hooks/useHistory';
import { AppBar } from './components/AppBar';
import { ConverterCard } from './components/ConverterCard';
import { HistoryPanel } from './components/HistoryPanel';
import './index.css';

function CurrencyApp() {
  const {
    currencies,
    rateSource,
    rateSources,
    setRateSource,
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
  } = useExchangeRates();
  const activeSource = rateSources.find(source => source.id === rateSource) ?? rateSources[0];
  const referenceSource = sourceRates.find(sourceRate => sourceRate.rate !== undefined);
  const referenceHistoryLabel = referenceSource
    ? rateSources.find(source => source.id === referenceSource.source)?.historyLabel
    : undefined;
  const historyLabel = rateSource === 'all' && referenceSource && referenceHistoryLabel
    ? `${referenceSource.label} ${referenceHistoryLabel}`
    : activeSource.historyLabel;

  const { history, addEntry, clearHistory } = useHistory();

  const handleSaveToHistory = useCallback(() => {
    if (convertedAmount === null || rate === null) return;
    addEntry({
      fromCurrency,
      toCurrency,
      fromAmount: parseFloat(amount) || 0,
      toAmount: convertedAmount,
      rate,
    });
  }, [convertedAmount, rate, fromCurrency, toCurrency, amount, addEntry]);

  return (
    <div className="app-wrapper">
      <AppBar sourceLabel={activeSource.label} />
      <main className="main-content">
        <ConverterCard
          currencies={currencies}
          rateSource={rateSource}
          rateSources={rateSources}
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
          amount={amount}
          convertedAmount={convertedAmount}
          rate={rate}
          rateDate={rateDate}
          providers={providers}
          providerNamesByKey={providerNamesByKey}
          historicalRates={historicalRates}
          sourceRates={sourceRates}
          historyLabel={historyLabel}
          loading={loading}
          error={error}
          onFromChange={setFromCurrency}
          onToChange={setToCurrency}
          onRateSourceChange={setRateSource}
          onAmountChange={setAmount}
          onSwap={swapCurrencies}
          onAddToHistory={handleSaveToHistory}
        />
        <HistoryPanel history={history} onClear={clearHistory} />
      </main>
      <footer className="app-footer">
        Currency Exchange App · {rateSource === 'all' ? 'Comparing available rate sources' : <>Rates provided by{' '}<a href={activeSource.url} target="_blank" rel="noopener noreferrer">{activeSource.label}</a></>}{' '}
        · For informational purposes only
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CurrencyApp />
    </ThemeProvider>
  );
}
