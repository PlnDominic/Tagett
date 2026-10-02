// Exchange rates for deals abroad. Every total and the monthly goal stay in
// GHS (Deal.valueGHS); a foreign deal also keeps its own amount and currency
// (Deal.valueLocal / Deal.currency), converted to GHS when it is set.

/** ISO 4217 code per market. Market.currency is a display symbol ("kr" is
 *  three different currencies), so the code is looked up by country. */
export const CURRENCY_CODES: Record<string, string> = {
  'Ghana': 'GHS', 'Nigeria': 'NGN', 'Kenya': 'KES', 'South Africa': 'ZAR',
  'United Kingdom': 'GBP', 'Ireland': 'EUR', 'Germany': 'EUR', 'France': 'EUR',
  'Italy': 'EUR', 'Portugal': 'EUR', 'Netherlands': 'EUR', 'Belgium': 'EUR',
  'Spain': 'EUR', 'Austria': 'EUR', 'Switzerland': 'CHF', 'Sweden': 'SEK',
  'Norway': 'NOK', 'Denmark': 'DKK', 'Poland': 'PLN', 'United States': 'USD',
  'Canada': 'CAD', 'Mexico': 'MXN', 'Australia': 'AUD', 'New Zealand': 'NZD',
}

export function currencyCodeFor(country: string | undefined): string {
  return CURRENCY_CODES[country ?? ''] ?? 'GHS'
}

/** Rates as "units of each currency per 1 GHS" (open.er-api.com's shape with base GHS). */
export type GhsRates = Record<string, number>

/** Converts an amount in `code` to GHS, or null when the rate is unknown. */
export function toGHS(amount: number, code: string, rates: GhsRates | null | undefined): number | null {
  if (code === 'GHS') return Math.round(amount)
  const rate = rates?.[code]
  if (!rate || rate <= 0) return null
  return Math.round(amount / rate)
}
