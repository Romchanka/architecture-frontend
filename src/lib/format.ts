/**
 * Форматирование чисел и дат — единое место вместо дублирования fmt() в каждой странице.
 */

/** Форматирование цены/суммы: 1234567 → "1 234 567" */
export const fmtPrice = (n: number | null | undefined): string =>
    n != null ? n.toLocaleString('ru-RU') : '0'

/** Форматирование даты ISO → "16.02.2026" */
export const fmtDate = (s: string | null | undefined): string =>
    s ? new Date(s).toLocaleDateString('ru-RU') : '—'

/** Форматирование даты и времени ISO → "16.02.2026, 19:30" */
export const fmtDateTime = (s: string | null | undefined): string =>
    s ? new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
