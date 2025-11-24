export function formatCurrency(
  value: number | string,
  locale: string = 'en-US',
  currencySymbol: string = '$'
): string {
  const num = typeof value === 'string' ? Number(value) : value
  const safe = Number.isFinite(num) ? Math.round(num) : 0
  const formatted = new Intl.NumberFormat(locale).format(safe)
  return `${currencySymbol}${formatted}`
}
