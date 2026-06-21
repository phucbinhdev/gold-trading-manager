export function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: number | null | undefined, suffix = '') {
  const amount = Number(value ?? 0);

  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}${suffix}`;
}
