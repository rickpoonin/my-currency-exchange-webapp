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
    fromCurrency, setFromCurrency,
    toCurrency, setToCurrency,
    amount, setAmount,
    convertedAmount,
    rate,
    loading,
    error,
    swapCurrencies,
  } = useExchangeRates();

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
      <AppBar />
      <main className="main-content">
        <ConverterCard
          currencies={currencies}
          fromCurrency={fromCurrency}
          toCurrency={toCurrency}
          amount={amount}
          convertedAmount={convertedAmount}
          rate={rate}
          loading={loading}
          error={error}
          onFromChange={setFromCurrency}
          onToChange={setToCurrency}
          onAmountChange={setAmount}
          onSwap={swapCurrencies}
          onAddToHistory={handleSaveToHistory}
        />
        <HistoryPanel history={history} onClear={clearHistory} />
      </main>
      <footer className="app-footer">
        Currency Exchange App · Rates provided by{' '}
        <a href="https://www.frankfurter.app" target="_blank" rel="noopener noreferrer">
          frankfurter.app
        </a>{' '}
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
