import { useEffect, useState } from 'react'
import { reportApi } from '@/lib/api/reportApi'
import { fmtPrice } from '@/lib/format'
import { AdminTable, Column } from '@/components/admin'

interface ConsultantPerformance {
    consultantId: number
    consultantName: string
    totalBookings: number
    totalContracts: number
    totalRevenue: number
}

type TabId = 'overview' | 'consultants' | 'finance'

export default function ReportsPage() {
    const [companyStats, setCompanyStats] = useState<any>(null)
    const [consultants, setConsultants] = useState<ConsultantPerformance[]>([])
    const [financials, setFinancials] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabId>('overview')

    useEffect(() => {
        ; (async () => {
            try {
                const [statsRes, consultantsRes, financeRes] = await Promise.all([
                    reportApi.companyStatistics().catch(() => ({ data: null })),
                    reportApi.consultantPerformance().catch(() => ({ data: [] })),
                    reportApi.financial().catch(() => ({ data: null })),
                ])
                setCompanyStats(statsRes.data)
                setConsultants(consultantsRes.data || [])
                setFinancials(financeRes.data)
            } catch (err) {
                console.error('Error loading reports:', err)
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const tabs = [
        { id: 'overview' as const, label: 'Обзор', icon: '📊' },
        { id: 'consultants' as const, label: 'Консультанты', icon: '👥' },
        { id: 'finance' as const, label: 'Финансы', icon: '💰' },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const consultantColumns: Column<ConsultantPerformance>[] = [
        { header: '#', render: (_, i) => <span className="text-sm text-gray-500">{(i ?? 0) + 1}</span> },
        { header: 'Консультант', render: (c) => <span className="text-sm text-white font-medium">{c.consultantName}</span> },
        { header: 'Бронирований', render: (c) => <span className="text-sm text-gray-300">{c.totalBookings}</span> },
        { header: 'Договоров', render: (c) => <span className="text-sm text-gray-300">{c.totalContracts}</span> },
        { header: 'Выручка', render: (c) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(c.totalRevenue)} сом</span> },
    ]

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Отчёты</h1>
                <p className="text-gray-500 text-sm mt-1">Статистика компании и производительность</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'text-gray-400 hover:text-white bg-gray-800'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && companyStats && (() => {
                const apt = companyStats.apartmentsByStatus || {}
                const bk = companyStats.bookingsByStatus || {}
                const ct = companyStats.contractsByStatus || {}
                const totalApt = Object.values(apt).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0)
                const totalContracts = Object.values(ct).reduce((s: number, v: any) => s + (v?.count ?? 0), 0)
                const signedContracts = (ct.SIGNED?.count ?? 0) + (ct.PAID?.count ?? 0) + (ct.COMPLETED?.count ?? 0)
                return (
                    <div className="space-y-6">
                        <StatGrid cards={[
                            { label: 'Всего квартир', value: totalApt, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                            { label: 'Свободно', value: apt.AVAILABLE ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                            { label: 'Забронировано', value: apt.BOOKED ?? 0, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                            { label: 'Продано', value: apt.SOLD ?? 0, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                        ]} cols="lg:grid-cols-4" />
                        <StatGrid cards={[
                            { label: 'Активных бронирований', value: bk.ACTIVE ?? 0, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                            { label: 'Договоров', value: totalContracts, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                            { label: 'Подписанных', value: signedContracts, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
                        ]} cols="lg:grid-cols-3" />
                    </div>
                )
            })()}

            {/* Consultants Tab */}
            {activeTab === 'consultants' && (
                <div>
                    <div className="bg-gray-900 rounded-xl border border-gray-800 px-6 py-4 mb-0 rounded-b-none border-b-0">
                        <h2 className="text-lg font-semibold text-white">Производительность консультантов</h2>
                    </div>
                    <AdminTable columns={consultantColumns} data={consultants} loading={false} rowKey={(c) => c.consultantId} emptyText="Данных нет" />
                </div>
            )}

            {/* Finance Tab */}
            {activeTab === 'finance' && (
                financials ? (
                    <StatGrid cards={[
                        { label: 'Общая стоимость договоров', value: fmtPrice(financials.totalContractValue ?? 0) + ' сом', color: 'text-emerald-400', bg: 'bg-gray-900 border-emerald-500/20' },
                        { label: 'Получено', value: fmtPrice(financials.totalIncome ?? 0) + ' сом', color: 'text-blue-400', bg: 'bg-gray-900 border-blue-500/20' },
                        { label: 'Завершённых транзакций', value: financials.completedTransactions ?? 0, color: 'text-green-400', bg: 'bg-gray-900 border-green-500/20' },
                        { label: 'Ожидающих транзакций', value: financials.pendingTransactions ?? 0, color: 'text-yellow-400', bg: 'bg-gray-900 border-yellow-500/20' },
                    ]} cols="lg:grid-cols-2" />
                ) : (
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-600">
                        Финансовые данные недоступны
                    </div>
                )
            )}
        </div>
    )
}

/** Переиспользуемая сетка статистических карточек. */
function StatGrid({ cards, cols = 'lg:grid-cols-4' }: {
    cards: { label: string; value: any; color: string; bg: string }[]
    cols?: string
}) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${cols} gap-4`}>
            {cards.map((card) => (
                <div key={card.label} className={`rounded-xl border p-5 ${card.bg}`}>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value ?? 0}</p>
                </div>
            ))}
        </div>
    )
}
