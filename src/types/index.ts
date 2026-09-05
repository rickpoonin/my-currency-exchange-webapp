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
  providers?: ExchangeRateProvider[];
}

export interface ExchangeRateProvider {
  key: string;
  rate: number;
}

export interface ProviderResponse {
  key: string;
  name: string;
  country_code: string | null;
  rate_type: string | null;
}

export interface HistoricalRateResponse {
  base: string;
  quote: string;
  date: string;
  rate: number;
}

export type RateSource = 'all' | 'frankfurter' | 'hkma' | 'censtatd';
export type IndividualRateSource = Exclude<RateSource, 'all'>;

export interface RateSourceOption {
  id: RateSource;
  label: string;
  description: string;
  url: string;
  historyLabel: string;
}

export interface SourceRateResult {
  source: IndividualRateSource;
  label: string;
  rate?: number;
  date?: string;
  error?: string;
}

export type Theme = 'light' | 'dark';
