import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { ConversionHistory } from '../types';

interface Props {
  history: ConversionHistory[];
  onClear: () => void;
}

export function HistoryPanel({ history, onClear }: Props) {
  return (
    <section className="card history-panel" aria-label="Conversion History">
      <div className="history-header">
        <h2 className="card-title">History</h2>
        {history.length > 0 && (
          <button
            id="clear-history-btn"
            className="clear-btn"
            onClick={onClear}
            aria-label="Clear history"
            title="Clear all history"
          >
            <Trash2 size={15} />
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="history-empty">No conversions yet. Your history will appear here.</p>
      ) : (
        <ul className="history-list">
          {history.map(entry => (
            <li key={entry.id} className="history-item">
              <div className="history-item-main">
                <span className="history-from">
                  {entry.fromAmount.toLocaleString()} {entry.fromCurrency}
                </span>
                <span className="history-arrow">→</span>
                <span className="history-to">
                  {entry.toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {entry.toCurrency}
                </span>
              </div>
              <div className="history-item-meta">
                <span className="history-rate">@ {entry.rate.toFixed(6)}</span>
                <span className="history-time">
                  {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm:ss')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
