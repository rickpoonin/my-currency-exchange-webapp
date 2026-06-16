import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/useTheme';
import { Sun, Moon } from 'lucide-react';

export function AppBar() {
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="app-bar">
      <div className="app-bar-left">
        <div className="app-bar-logo">💱</div>
        <div className="app-bar-title">
          <h1>Currency Exchange</h1>
          <span className="app-bar-subtitle">Live Rates · frankfurter.dev</span>
        </div>
      </div>
      <div className="app-bar-right">
        <div className="app-bar-clock">
          <span className="clock-time">{formattedTime}</span>
          <span className="clock-date">{formattedDate}</span>
        </div>
        <button
          id="theme-toggle-btn"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}
