export interface CurrencyFormatOptions {
  compact?: boolean;
  showCents?: boolean;
  prefix?: string;
}

export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const { compact = false, showCents = false, prefix = "$" } = options;

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return `${prefix}0`;
  }

  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `${prefix}${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `${prefix}${(amount / 1000).toFixed(1)}K`;
    }
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  return `${prefix}${formatter.format(amount)}`;
}

export function formatPercentage(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${(value * 100).toFixed(decimals)}%`;
}
