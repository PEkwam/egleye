export function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  // Smart formatting: billions for large values, millions for smaller
  if (Math.abs(value) >= 1_000_000_000) {
    const inBillions = value / 1_000_000_000;
    return `₵${inBillions.toFixed(2)}B`;
  }
  const inMillions = value / 1_000_000;
  return `₵${inMillions.toFixed(1)}M`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  // Database stores as decimal (0.28 = 28%), convert to percentage display
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value: number | null, suffix = ''): string {
  if (value === null) return 'N/A';
  return `${value}${suffix}`;
}

export function formatRating(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}/5`;
}

export function formatYears(value: number | null): string {
  return value ? `${value} years` : 'N/A';
}

export function formatContributors(value: number | null): string {
  return value ? value.toLocaleString() : 'N/A';
}
