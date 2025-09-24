// lib/format.ts
export const formatAUD = (v: number | string | null | undefined) => {
  const num = typeof v === 'string' ? Number(v) : v;
  if (num == null || Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(num);
};
