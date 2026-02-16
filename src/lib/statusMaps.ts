/** Shared status → label + CSS class maps for all admin pages */

export type StatusEntry = { label: string; cls: string }
export type StatusMap = Record<string, StatusEntry>

// ── Booking ──
export const BOOKING_STATUS_MAP: StatusMap = {
    ACTIVE: { label: 'Активно', cls: 'bg-emerald-500/10 text-emerald-400' },
    CANCELLED: { label: 'Отменено', cls: 'bg-red-500/10 text-red-400' },
    EXPIRED: { label: 'Истекло', cls: 'bg-gray-500/10 text-gray-400' },
    CONVERTED: { label: 'Конвертировано', cls: 'bg-blue-500/10 text-blue-400' },
    COMPLETED: { label: 'Продано', cls: 'bg-purple-500/10 text-purple-400' },
}

export const BOOKING_TYPE_MAP: StatusMap = {
    PREBOOKING: { label: 'Предбронь', cls: 'bg-yellow-500/10 text-yellow-400' },
    BOOKING: { label: 'Бронь', cls: 'bg-blue-500/10 text-blue-400' },
}

// ── Apartment ──
export const APARTMENT_STATUS_MAP: StatusMap = {
    AVAILABLE: { label: 'Свободна', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PREBOOKED: { label: 'Предбронь', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    BOOKED: { label: 'Бронь', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    SOLD: { label: 'Продано', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    INSTALLMENT: { label: 'Рассрочка', cls: 'bg-purple-500/10 text-purple-400' },
}

// ── Contract ──
export const CONTRACT_STATUS_MAP: StatusMap = {
    DRAFT: { label: 'Черновик', cls: 'bg-gray-500/10 text-gray-400' },
    PENDING_SIGNATURE: { label: 'На подписание', cls: 'bg-yellow-500/10 text-yellow-400' },
    SIGNED: { label: 'Подписан', cls: 'bg-emerald-500/10 text-emerald-400' },
    IN_PAYMENT: { label: 'Оплата', cls: 'bg-blue-500/10 text-blue-400' },
    PAID: { label: 'Оплачен', cls: 'bg-purple-500/10 text-purple-400' },
    CANCELLED: { label: 'Отменён', cls: 'bg-red-500/10 text-red-400' },
    COMPLETED: { label: 'Завершён', cls: 'bg-teal-500/10 text-teal-400' },
}

// ── Transaction ──
export const TRANSACTION_STATUS_MAP: StatusMap = {
    PENDING: { label: 'Ожидает', cls: 'bg-yellow-500/10 text-yellow-400' },
    COMPLETED: { label: 'Завершён', cls: 'bg-emerald-500/10 text-emerald-400' },
    CANCELLED: { label: 'Отменён', cls: 'bg-red-500/10 text-red-400' },
    REFUNDED: { label: 'Возврат', cls: 'bg-purple-500/10 text-purple-400' },
}

// ── Parking ──
export const PARKING_STATUS_MAP: StatusMap = {
    AVAILABLE: { label: 'Свободно', cls: 'bg-emerald-500/10 text-emerald-400' },
    RESERVED: { label: 'Зарезервировано', cls: 'bg-yellow-500/10 text-yellow-400' },
    SOLD: { label: 'Продано', cls: 'bg-purple-500/10 text-purple-400' },
}
