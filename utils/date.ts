/** Data local de hoje no formato YYYY-MM-DD (sem UTC). */
export const todayLocalISODate = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * Formata YYYY-MM-DD para pt-BR (DD/MM/AAAA).
 * Evita o bug de fuso em que `new Date('YYYY-MM-DD')` usa UTC e mostra o dia anterior no Brasil.
 */
export const formatDateBR = (isoDate: string | undefined | null): string => {
  if (!isoDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
};
