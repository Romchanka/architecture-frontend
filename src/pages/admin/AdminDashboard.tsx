import { useEffect, useState } from 'react'
import { useAdmin } from '@/components/AdminGuard'
import { ROLE_LABELS } from '@/types/admin'
import { BOOKING_STATUS_MAP, BOOKING_TYPE_MAP, TRANSACTION_STATUS_MAP } from '@/lib/statusMaps'
import { reportApi } from '@/lib/api/reportApi'
import { bookingApi } from '@/lib/api/bookingApi'
import { transactionApi } from '@/lib/api/transactionApi'
import { fmtDate, fmtPrice } from '@/lib/format'
import { AdminTable, Column, StatusBadge } from '@/components/admin'

interface StatCard {
    label: string
    value: number | string
    icon: string
    color: string
    bgColor: string
}

interface RecentBooking {
    id: number
    apartmentNumber: string
    userName: string | null
    bookingType: string
    status: string
    createdAt: string
}

interface RecentTransaction {
    id: number
    contractId: number
    contractNumber?: string
    amount: number
    paymentType: string
    status: string
    paymentDate: string | null
    createdAt: string
}

export default function AdminDashboard() {
    const employee = useAdmin()
    const [stats, setStats] = useState<any>(null)
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
    const [loading, setLoading] = useState(true)

    const isAccountant = employee.userType === 'ACCOUNTANT'
    const isConsultant = employee.userType === 'CONSULTANT'

    useEffect(() => {
        ; (async () => {
            try {
                const promises: Promise<any>[] = [
                    reportApi.companyStatistics().catch(() => ({ data: null })),
                ]

                if (isAccountant) {
                    // Accountant: load recent transactions
                    promises.push(
                        transactionApi.list(5, 'createdAt,desc').catch(() => ({ data: { content: [] } }))
                    )
                } else {
                    // Admin/Consultant/SuperUser: load recent bookings
                    promises.push(
                        bookingApi.listRecent(5).catch(() => ({ data: { content: [] } }))
                    )
                }

                const results = await Promise.all(promises)
                setStats(results[0].data)

                if (isAccountant) {
                    setRecentTransactions(results[1].data?.content || [])
                } else {
                    setRecentBookings(results[1].data?.content || [])
                }
            } catch (err) {
                console.error('Dashboard load error:', err)
            } finally {
                setLoading(false)
            }
        })()
    }, [isAccountant])

    // --- Role-specific stat cards ---
    const getStatCards = (): StatCard[] => {
        if (!stats) return []

        if (isAccountant) {
            return [
                { label: 'Общая выручка', value: fmtPrice(stats.totalRevenue ?? 0), icon: '💰', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Получено платежей', value: fmtPrice(stats.receivedPayments ?? 0), icon: '✅', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
                { label: 'Всего договоров', value: stats.totalContracts ?? 0, icon: '📄', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
                { label: 'Подписано', value: stats.signedContracts ?? 0, icon: '✍️', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
            ]
        }

        if (isConsultant) {
            return [
                { label: 'Всего квартир', value: stats.totalApartments ?? 0, icon: '🏠', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'Свободно', value: stats.availableApartments ?? 0, icon: '✅', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Забронировано', value: stats.bookedApartments ?? 0, icon: '📋', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Продано', value: stats.soldApartments ?? 0, icon: '💰', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
            ]
        }

        // ADMIN / SUPER_USER — full stats
        return [
            { label: 'Всего квартир', value: stats.totalApartments ?? stats.apartmentStats?.total ?? 0, icon: '🏠', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Свободно', value: stats.availableApartments ?? stats.apartmentStats?.available ?? 0, icon: '✅', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Забронировано', value: stats.bookedApartments ?? stats.apartmentStats?.booked ?? 0, icon: '📋', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Продано', value: stats.soldApartments ?? stats.apartmentStats?.sold ?? 0, icon: '💰', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
            { label: 'Активных бронирований', value: stats.activeBookings ?? stats.bookingStats?.active ?? 0, icon: '🔥', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
            { label: 'Договоров', value: stats.totalContracts ?? stats.contractStats?.total ?? 0, icon: '📄', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
        ]
    }

    // --- Columns ---
    const bookingColumns: Column<RecentBooking>[] = [
        { header: 'ID', render: (b) => <span className="text-sm text-gray-300">#{b.id}</span> },
        { header: 'Квартира', render: (b) => <span className="text-sm text-white font-medium">№{b.apartmentNumber}</span> },
        { header: 'Покупатель', render: (b) => <span className="text-sm text-gray-400">{b.userName || '—'}</span> },
        { header: 'Тип', render: (b) => <StatusBadge status={b.bookingType} colorMap={BOOKING_TYPE_MAP} /> },
        { header: 'Статус', render: (b) => <StatusBadge status={b.status} colorMap={BOOKING_STATUS_MAP} /> },
        { header: 'Дата', render: (b) => <span className="text-sm text-gray-500">{fmtDate(b.createdAt)}</span> },
    ]

    const transactionColumns: Column<RecentTransaction>[] = [
        { header: 'ID', render: (t) => <span className="text-sm text-gray-300">#{t.id}</span> },
        { header: 'Договор', render: (t) => <span className="text-sm text-white font-medium">{t.contractNumber || `#${t.contractId}`}</span> },
        { header: 'Сумма', render: (t) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(t.amount)} сом</span> },
        { header: 'Тип', render: (t) => <span className="text-sm text-gray-400">{t.paymentType}</span> },
        { header: 'Статус', render: (t) => <StatusBadge status={t.status} colorMap={TRANSACTION_STATUS_MAP} /> },
        { header: 'Дата', render: (t) => <span className="text-sm text-gray-500">{fmtDate(t.paymentDate || t.createdAt)}</span> },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const statCards = getStatCards()

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">
                    Добро пожаловать, {employee.fullName || 'Сотрудник'}
                </h1>
                <p className="text-gray-500 mt-1">
                    {ROLE_LABELS[employee.userType]} • {new Date().toLocaleDateString('ru-RU', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                </p>
            </div>

            {/* Stats Grid */}
            {statCards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {statCards.map((card) => (
                        <div key={card.label} className={`rounded-xl border p-5 ${card.bgColor} transition-all hover:scale-[1.02]`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</p>
                                    <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                                </div>
                                <span className="text-3xl opacity-60">{card.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Recent data — role-specific */}
            {isAccountant ? (
                <>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 px-6 py-4 mb-0 rounded-b-none border-b-0 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Последние платежи</h2>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                            Ожидают подтверждения
                        </span>
                    </div>
                    <AdminTable columns={transactionColumns} data={recentTransactions} loading={false} rowKey={(t) => t.id} emptyText="Транзакций пока нет" />
                </>
            ) : (
                <>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 px-6 py-4 mb-0 rounded-b-none border-b-0 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Последние бронирования</h2>
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20">
                            Новые с маркетплейса
                        </span>
                    </div>
                    <AdminTable columns={bookingColumns} data={recentBookings} loading={false} rowKey={(b) => b.id} emptyText="Бронирований пока нет" />
                </>
            )}
        </div>
    )
}
