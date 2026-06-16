export interface ConversionHistory {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  timestamp: string; // ISO 8601
}

export interface CurrencyResponse {
  iso_code: string;
  iso_numeric: string;
  name: string;
  symbol: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ExchangeRateResponse {
  base: string;
  quote: string;
  date: string;
  rate: number;
}

export type Theme = 'light' | 'dark';
