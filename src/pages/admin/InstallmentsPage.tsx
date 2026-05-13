import { useState, useEffect, useMemo } from 'react'
import api from '@/lib/api'
import { fmtPrice, fmtDate } from '@/lib/format'
import { useApiData } from '@/hooks/useApiData'
import {
    AdminTable, Column, PageHeader, FilterBar,
    Modal, ModalBody, filterSelectCls, inputCls,
} from '@/components/admin'

/* ─── Types ─── */
interface ScheduleItem {
    id: number
    contractId: number
    installmentNumber: number
    amount: number
    dueDate: string
    isPaid: boolean
    transactionId: number | null
    notes: string | null
    createdAt: string
}

interface ContractRow {
    id: number
    contractNumber: string
    buyerName: string
    totalPrice: number
    notes: string | null
    status: string
    createdAt: string
}

interface ScheduleStats {
    contractId: number
    totalPayments: number
    paidPayments: number
    unpaidPayments: number
    totalPaidAmount: number
    overduePaymentsCount: number
}

type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'CUSTOM'

interface CustomRow {
    dueDate: string
    amount: string
    notes: string
}

const PERIOD_OPTIONS: { value: PeriodType; label: string; description: string }[] = [
    { value: 'MONTHLY', label: '📅 Ежемесячно', description: 'Равные платежи каждый месяц' },
    { value: 'QUARTERLY', label: '🗓 Ежеквартально', description: 'Равные платежи раз в 3 месяца' },
    { value: 'SEMIANNUAL', label: '📆 Полугодовые', description: 'Равные платежи раз в 6 месяцев' },
    { value: 'CUSTOM', label: '✏️ Индивидуальный', description: 'Любые суммы и даты вручную' },
]

/* ─── Component ─── */
export default function InstallmentsPage() {
    // 1) All overdue payments
    const { data: overduePayments, loading: overdueLoading } = useApiData<ScheduleItem[]>(
        '/transactions/payment-schedule/overdue', []
    )

    // 2) All contracts (filter installment ones)
    const { data: allContracts, loading: contractsLoading } = useApiData<ContractRow[]>(
        '/contracts?size=500&sort=createdAt,desc', []
    )

    const installmentContracts = useMemo(
        () => allContracts.filter(c => c.notes?.toLowerCase().includes('рассрочка')),
        [allContracts]
    )

    // 3) Per-contract statistics (loaded on demand)
    const [statsMap, setStatsMap] = useState<Record<number, ScheduleStats>>({})
    const [statsLoading, setStatsLoading] = useState(false)

    useEffect(() => {
        if (installmentContracts.length === 0) return
        setStatsLoading(true)
        const loadStats = async () => {
            const map: Record<number, ScheduleStats> = {}
            await Promise.allSettled(
                installmentContracts.map(async (c) => {
                    try {
                        const { data } = await api.get(`/transactions/payment-schedule/statistics/${c.id}`)
                        map[c.id] = data
                    } catch { /* skip */ }
                })
            )
            setStatsMap(map)
            setStatsLoading(false)
        }
        loadStats()
    }, [installmentContracts])

    // 4) Modal: payment schedule for selected contract
    const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null)
    const [schedule, setSchedule] = useState<ScheduleItem[]>([])
    const [scheduleLoading, setScheduleLoading] = useState(false)

    const openSchedule = async (contract: ContractRow) => {
        setSelectedContract(contract)
        setScheduleLoading(true)
        try {
            const { data } = await api.get(`/transactions/payment-schedule/by-contract/${contract.id}`)
            setSchedule(data)
        } catch {
            setSchedule([])
        }
        setScheduleLoading(false)
    }

    // 6) Payment recording
    const [payingId, setPayingId] = useState<number | null>(null)
    const [payAmount, setPayAmount] = useState('')
    const [payType, setPayType] = useState('CASH')
    const [payLoading, setPayLoading] = useState(false)

    // 7) Notes editing
    const [editingNotesId, setEditingNotesId] = useState<number | null>(null)
    const [editingNotesText, setEditingNotesText] = useState('')
    const [notesLoading, setNotesLoading] = useState(false)

    const handleSaveNotes = async (scheduleItem: ScheduleItem) => {
        setNotesLoading(true)
        try {
            await api.patch(`/transactions/payment-schedule/${scheduleItem.id}/notes`, {
                notes: editingNotesText,
            })
            // Обновить локально
            setSchedule(prev => prev.map(s =>
                s.id === scheduleItem.id ? { ...s, notes: editingNotesText } : s
            ))
            setEditingNotesId(null)
            setEditingNotesText('')
        } catch (err: any) {
            alert(err.response?.data?.message || 'Ошибка сохранения примечания')
        }
        setNotesLoading(false)
    }

    const handleRecordPayment = async (scheduleItem: ScheduleItem) => {
        const amount = payAmount ? Number(payAmount) : scheduleItem.amount
        if (!amount || amount <= 0) return
        if (!confirm(`Записать оплату ${amount.toLocaleString()} сом?`)) return

        setPayLoading(true)
        try {
            await api.put(
                `/transactions/payment-schedule/${scheduleItem.id}/record-payment?amount=${amount}&paymentType=${payType}`
            )
            if (selectedContract) {
                const { data } = await api.get(`/transactions/payment-schedule/by-contract/${selectedContract.id}`)
                setSchedule(data)
                try {
                    const { data: newStats } = await api.get(`/transactions/payment-schedule/statistics/${selectedContract.id}`)
                    setStatsMap(prev => ({ ...prev, [selectedContract.id]: newStats }))
                } catch { /* skip */ }
            }
            setPayingId(null)
            setPayAmount('')
        } catch (err: any) {
            alert(err.response?.data?.message || 'Ошибка записи оплаты')
        }
        setPayLoading(false)
    }

    // 5) Filter
    const [filter, setFilter] = useState<'all' | 'overdue' | 'active'>('all')
    const filtered = useMemo(() => {
        if (filter === 'overdue') return installmentContracts.filter(c => (statsMap[c.id]?.overduePaymentsCount || 0) > 0)
        if (filter === 'active') return installmentContracts.filter(c => (statsMap[c.id]?.unpaidPayments || 0) > 0)
        return installmentContracts
    }, [installmentContracts, statsMap, filter])

    // ─── Schedule Builder ───
    const [showBuilder, setShowBuilder] = useState(false)
    const [builderContractId, setBuilderContractId] = useState('')
    const [periodType, setPeriodType] = useState<PeriodType>('MONTHLY')
    const [installmentCount, setInstallmentCount] = useState('12')
    const [firstPaymentDate, setFirstPaymentDate] = useState('')
    const [builderNotes, setBuilderNotes] = useState('')
    const [customRows, setCustomRows] = useState<CustomRow[]>([
        { dueDate: '', amount: '', notes: '' },
    ])
    const [builderLoading, setBuilderLoading] = useState(false)
    const [builderError, setBuilderError] = useState('')

    // Выбранный договор для конструктора (для отображения общей суммы)
    const builderContract = allContracts.find(c => c.id === Number(builderContractId))

    // Счётчик остатка для CUSTOM
    const customTotal = customRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const customRemaining = (builderContract?.totalPrice ?? 0) - customTotal

    const addCustomRow = () => setCustomRows(prev => [...prev, { dueDate: '', amount: '', notes: '' }])
    const removeCustomRow = (i: number) => setCustomRows(prev => prev.filter((_, idx) => idx !== i))
    const updateCustomRow = (i: number, field: keyof CustomRow, value: string) =>
        setCustomRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

    const handleCreateSchedule = async () => {
        setBuilderError('')
        if (!builderContractId) { setBuilderError('Выберите договор'); return }

        const body: Record<string, any> = {
            contractId: Number(builderContractId),
            periodType,
            notes: builderNotes || undefined,
        }

        if (periodType === 'CUSTOM') {
            if (customRows.some(r => !r.dueDate || !r.amount)) {
                setBuilderError('Заполните все строки индивидуального графика')
                return
            }
            body.customInstallments = customRows.map(r => ({
                dueDate: r.dueDate,
                amount: Number(r.amount),
                notes: r.notes || undefined,
            }))
        } else {
            if (!installmentCount || Number(installmentCount) < 1) {
                setBuilderError('Укажите количество платежей')
                return
            }
            if (!firstPaymentDate) { setBuilderError('Укажите дату первого платежа'); return }
            body.installmentCount = Number(installmentCount)
            body.firstPaymentDate = firstPaymentDate
        }

        setBuilderLoading(true)
        try {
            await api.post('/transactions/payment-schedule', body)
            setShowBuilder(false)
            // Обновить статистику для данного договора
            const { data: newStats } = await api.get(`/transactions/payment-schedule/statistics/${builderContractId}`)
            setStatsMap(prev => ({ ...prev, [Number(builderContractId)]: newStats }))
            // Если этот договор открыт — обновить его расписание
            if (selectedContract?.id === Number(builderContractId)) {
                const { data } = await api.get(`/transactions/payment-schedule/by-contract/${builderContractId}`)
                setSchedule(data)
            }
        } catch (err: any) {
            setBuilderError(err.response?.data?.message || 'Ошибка создания графика')
        }
        setBuilderLoading(false)
    }

    // Summary cards
    const totalOverdue = overduePayments.length
    const totalOverdueAmount = overduePayments.reduce((s, p) => s + p.amount, 0)
    const totalInstallmentContracts = installmentContracts.length

    // Contract table columns
    const columns: Column<ContractRow>[] = [
        { header: '№ Договора', render: (c) => <span className="text-sm text-white font-medium">{c.contractNumber}</span> },
        { header: 'Покупатель', render: (c) => <span className="text-sm text-gray-400">{c.buyerName}</span> },
        { header: 'Сумма', render: (c) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(c.totalPrice)} сом</span> },
        {
            header: 'Оплачено / Остаток', render: (c) => {
                const s = statsMap[c.id]
                if (!s) return <span className="text-xs text-gray-600">⏳</span>
                const paid = s.totalPaidAmount || 0
                const remaining = c.totalPrice - paid
                const pct = c.totalPrice > 0 ? Math.round((paid / c.totalPrice) * 100) : 0
                return (
                    <div className="min-w-[160px]">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-400">{fmtPrice(paid)}</span>
                            <span className="text-gray-500">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            Остаток: <span className="text-white font-medium">{fmtPrice(Math.max(remaining, 0))} сом</span>
                        </div>
                    </div>
                )
            },
        },
        {
            header: 'Платежи', render: (c) => {
                const s = statsMap[c.id]
                if (!s) return <span className="text-xs text-gray-600">⏳</span>
                return (
                    <div className="text-xs">
                        <span className="text-emerald-400">{s.paidPayments}</span>
                        <span className="text-gray-600"> / </span>
                        <span className="text-white">{s.totalPayments}</span>
                    </div>
                )
            },
        },
        {
            header: 'Просрочки', render: (c) => {
                const s = statsMap[c.id]
                if (!s) return <span className="text-xs text-gray-600">⏳</span>
                if (s.overduePaymentsCount === 0) return <span className="text-xs text-emerald-400">✓ В срок</span>
                return (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium animate-pulse">
                        ⚠️ {s.overduePaymentsCount} просрочено
                    </span>
                )
            },
        },
        {
            header: '', render: (c) => (
                <button
                    onClick={(e) => { e.stopPropagation(); openSchedule(c) }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
                >
                    📅 График
                </button>
            ),
        },
    ]

    // Schedule modal columns
    const scheduleColumns: Column<ScheduleItem>[] = [
        { header: '№', render: (s) => <span className="text-sm text-gray-400">{s.installmentNumber}</span> },
        {
            header: 'Дата', render: (s) => {
                const isOverdue = !s.isPaid && new Date(s.dueDate) < new Date()
                return <span className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>{fmtDate(s.dueDate)}</span>
            }
        },
        { header: 'Сумма', render: (s) => <span className="text-sm text-amber-400 font-mono">{fmtPrice(s.amount)} сом</span> },
        {
            header: 'Статус', render: (s) => {
                if (s.isPaid) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✅ Оплачен</span>
                const isOverdue = new Date(s.dueDate) < new Date()
                if (isOverdue) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">⚠️ Просрочен</span>
                return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">⏳ Ожидает</span>
            }
        },
        {
            header: 'Примечание', render: (s) => {
                const isOverdue = !s.isPaid && new Date(s.dueDate) < new Date()
                // Inline editing mode
                if (editingNotesId === s.id) {
                    return (
                        <div className="flex flex-col gap-1 min-w-[160px]">
                            <textarea
                                value={editingNotesText}
                                onChange={(e) => setEditingNotesText(e.target.value)}
                                className={`${inputCls} !py-1 !text-xs !min-h-[48px] resize-none`}
                                placeholder="Причина просрочки..."
                                autoFocus
                            />
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleSaveNotes(s)}
                                    disabled={notesLoading}
                                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                                >
                                    {notesLoading ? '⏳...' : '✓ Сохранить'}
                                </button>
                                <button
                                    onClick={() => { setEditingNotesId(null); setEditingNotesText('') }}
                                    className="text-xs text-gray-400 hover:text-gray-300 px-2 py-0.5"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )
                }
                // Display mode
                if (s.notes) {
                    return (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditingNotesId(s.id); setEditingNotesText(s.notes || '') }}
                            className="text-xs text-gray-400 hover:text-blue-400 transition-colors text-left max-w-[160px] truncate"
                            title={`${s.notes} (нажмите для редактирования)`}
                        >
                            💬 {s.notes}
                        </button>
                    )
                }
                // No notes — show add button for overdue, dash for others
                if (isOverdue) {
                    return (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditingNotesId(s.id); setEditingNotesText('') }}
                            className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors animate-pulse"
                        >
                            ✏️ Добавить комментарий
                        </button>
                    )
                }
                return <span className="text-xs text-gray-600">—</span>
            }
        },
        {
            header: 'Действие', render: (s) => {
                if (s.isPaid) return <span className="text-xs text-emerald-400">✅ {fmtPrice(s.amount)} сом</span>
                if (payingId === s.id) {
                    return (
                        <div className="flex flex-col gap-1.5 min-w-[180px]">
                            <input
                                type="number"
                                placeholder={String(s.amount)}
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className={`${inputCls} !py-1 !text-xs`}
                            />
                            <select value={payType} onChange={(e) => setPayType(e.target.value)} className={`${inputCls} !py-1 !text-xs`}>
                                <option value="CASH">Наличные</option>
                                <option value="BANK_TRANSFER">Перевод</option>
                            </select>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleRecordPayment(s)}
                                    disabled={payLoading}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                >
                                    {payLoading ? '⏳...' : '✓ Записать'}
                                </button>
                                <button
                                    onClick={() => { setPayingId(null); setPayAmount('') }}
                                    className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )
                }
                return (
                    <button
                        onClick={(e) => { e.stopPropagation(); setPayingId(s.id); setPayAmount(String(s.amount)) }}
                        className="text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 px-3 py-1 rounded-lg border border-amber-600/30 transition-colors font-medium"
                    >
                        💰 Оплатил
                    </button>
                )
            },
        },
    ]

    const loading = overdueLoading || contractsLoading || statsLoading

    return (
        <div>
            <PageHeader
                title="Рассрочки"
                count={totalInstallmentContracts}
                countLabel="договоров в рассрочке"
                actionLabel="+ Создать график"
                onAction={() => {
                    setBuilderError('')
                    setBuilderContractId('')
                    setPeriodType('MONTHLY')
                    setInstallmentCount('12')
                    setFirstPaymentDate('')
                    setBuilderNotes('')
                    setCustomRows([{ dueDate: '', amount: '', notes: '' }])
                    setShowBuilder(true)
                }}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Договоров в рассрочке</div>
                    <div className="text-2xl font-bold text-purple-400 mt-1">{totalInstallmentContracts}</div>
                </div>
                <div className={`rounded-xl border p-4 ${totalOverdue > 0 ? 'bg-red-950/30 border-red-800/50' : 'bg-gray-900 border-gray-800'}`}>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Просроченных платежей</div>
                    <div className={`text-2xl font-bold mt-1 ${totalOverdue > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                        {totalOverdue > 0 ? `⚠️ ${totalOverdue}` : '✓ 0'}
                    </div>
                </div>
                <div className={`rounded-xl border p-4 ${totalOverdueAmount > 0 ? 'bg-red-950/30 border-red-800/50' : 'bg-gray-900 border-gray-800'}`}>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Сумма просрочки</div>
                    <div className={`text-2xl font-bold mt-1 ${totalOverdueAmount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fmtPrice(totalOverdueAmount)} сом
                    </div>
                </div>
            </div>

            {/* Overdue Alert Banner */}
            {totalOverdue > 0 && (
                <div className="mb-6 bg-red-950/40 border border-red-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🔔</span>
                        <span className="text-sm font-semibold text-red-400">Просроченные платежи требуют внимания!</span>
                    </div>
                    <div className="space-y-1">
                        {overduePayments.slice(0, 5).map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs bg-red-950/30 rounded-lg px-3 py-2 border border-red-900/30">
                                <span className="text-gray-400">
                                    Договор <span className="text-white font-medium">#{p.contractId}</span> — Платёж #{p.installmentNumber}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-red-400 font-mono font-bold">{fmtPrice(p.amount)} сом</span>
                                    <span className="text-red-500">просрочен с {fmtDate(p.dueDate)}</span>
                                </div>
                            </div>
                        ))}
                        {overduePayments.length > 5 && (
                            <div className="text-xs text-gray-500 text-center mt-1">
                                ...и ещё {overduePayments.length - 5} просроченных платежей
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Filter */}
            <FilterBar>
                <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={filterSelectCls}>
                    <option value="all">Все рассрочки</option>
                    <option value="overdue">С просрочками</option>
                    <option value="active">Активные (неоплаченные)</option>
                </select>
            </FilterBar>

            <AdminTable
                columns={columns}
                data={filtered}
                loading={loading}
                rowKey={(c) => c.id}
                emptyText="Нет договоров в рассрочке"
                onRowClick={openSchedule}
            />

            {/* ─── Schedule Builder Modal ─── */}
            <Modal
                open={showBuilder}
                onClose={() => setShowBuilder(false)}
                title="📅 Конструктор графика платежей"
                width="max-w-2xl"
            >
                <ModalBody>
                    {builderError && (
                        <div className="mb-4 bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-2 text-sm text-red-400">
                            {builderError}
                        </div>
                    )}

                    {/* Contract selection */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">Договор *</label>
                        <select
                            value={builderContractId}
                            onChange={(e) => setBuilderContractId(e.target.value)}
                            className={inputCls}
                        >
                            <option value="">— выберите договор —</option>
                            {allContracts.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.contractNumber} — {c.buyerName} ({fmtPrice(c.totalPrice)} сом)
                                </option>
                            ))}
                        </select>
                        {builderContract && (
                            <div className="mt-1 text-xs text-amber-400">
                                Общая сумма договора: <strong>{fmtPrice(builderContract.totalPrice)} сом</strong>
                            </div>
                        )}
                    </div>

                    {/* Period type selector */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-2">Тип периодичности *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setPeriodType(opt.value)}
                                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${periodType === opt.value
                                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="font-medium">{opt.label}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Template mode fields */}
                    {periodType !== 'CUSTOM' && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Количество платежей *</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={installmentCount}
                                    onChange={(e) => setInstallmentCount(e.target.value)}
                                    className={inputCls}
                                    placeholder="12"
                                />
                                {builderContract && installmentCount && (
                                    <div className="mt-1 text-xs text-gray-500">
                                        ≈ {fmtPrice(builderContract.totalPrice / Number(installmentCount))} сом / платёж
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Дата первого платежа *</label>
                                <input
                                    type="date"
                                    value={firstPaymentDate}
                                    onChange={(e) => setFirstPaymentDate(e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    )}

                    {/* Custom mode — dynamic rows */}
                    {periodType === 'CUSTOM' && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-gray-500">Индивидуальные строки *</label>
                                {builderContract && (
                                    <span className={`text-xs font-medium ${Math.abs(customRemaining) < 1 ? 'text-emerald-400' : customRemaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                        {Math.abs(customRemaining) < 1
                                            ? '✅ Сумма совпадает'
                                            : customRemaining > 0
                                                ? `Остаток: ${fmtPrice(customRemaining)} сом`
                                                : `Превышение: ${fmtPrice(-customRemaining)} сом`}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 mb-3">
                                {customRows.map((row, i) => (
                                    <div key={i} className="grid grid-cols-[32px_1fr_1fr_1fr_32px] gap-2 items-center">
                                        <span className="text-xs text-gray-600 text-center">#{i + 1}</span>
                                        <input
                                            type="date"
                                            value={row.dueDate}
                                            onChange={(e) => updateCustomRow(i, 'dueDate', e.target.value)}
                                            className={`${inputCls} !py-1.5 !text-xs`}
                                            title="Дата платежа"
                                        />
                                        <input
                                            type="number"
                                            value={row.amount}
                                            onChange={(e) => updateCustomRow(i, 'amount', e.target.value)}
                                            className={`${inputCls} !py-1.5 !text-xs`}
                                            placeholder="Сумма (сом)"
                                            title="Сумма платежа"
                                        />
                                        <input
                                            type="text"
                                            value={row.notes}
                                            onChange={(e) => updateCustomRow(i, 'notes', e.target.value)}
                                            className={`${inputCls} !py-1.5 !text-xs`}
                                            placeholder="Примечание"
                                            title="Примечание к платежу"
                                        />
                                        <button
                                            onClick={() => removeCustomRow(i)}
                                            disabled={customRows.length === 1}
                                            className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 text-sm"
                                            title="Удалить строку"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addCustomRow}
                                className="w-full border border-dashed border-gray-700 hover:border-amber-500/50 rounded-lg py-2 text-xs text-gray-500 hover:text-amber-400 transition-colors"
                            >
                                + Добавить платёж
                            </button>

                            {/* Custom total bar */}
                            {builderContract && customTotal > 0 && (
                                <div className="mt-3 bg-gray-800/60 rounded-lg p-3">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Итого по графику</span>
                                        <span className="text-white font-bold">{fmtPrice(customTotal)} сом</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${customTotal > builderContract.totalPrice ? 'bg-red-500' : 'bg-amber-500'}`}
                                            style={{ width: `${Math.min((customTotal / builderContract.totalPrice) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Примечания к графику</label>
                        <input
                            type="text"
                            value={builderNotes}
                            onChange={(e) => setBuilderNotes(e.target.value)}
                            className={inputCls}
                            placeholder="Рассрочка на 12 месяцев..."
                        />
                    </div>
                </ModalBody>

                <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
                    <button
                        onClick={() => setShowBuilder(false)}
                        className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleCreateSchedule}
                        disabled={builderLoading}
                        className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold transition-colors text-sm disabled:opacity-50"
                    >
                        {builderLoading ? '⏳ Создание...' : '✅ Создать график'}
                    </button>
                </div>
            </Modal>

            {/* Payment Schedule Modal */}
            <Modal
                open={selectedContract !== null}
                onClose={() => setSelectedContract(null)}
                title={`📅 График платежей — ${selectedContract?.contractNumber || ''}`}
                width="max-w-3xl"
            >
                <ModalBody>
                    {selectedContract && statsMap[selectedContract.id] && (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500">Общая сумма</div>
                                <div className="text-sm font-bold text-amber-400 mt-1">{fmtPrice(selectedContract.totalPrice)} сом</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500">Оплачено</div>
                                <div className="text-sm font-bold text-emerald-400 mt-1">{fmtPrice(statsMap[selectedContract.id].totalPaidAmount || 0)} сом</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <div className="text-xs text-gray-500">Остаток</div>
                                <div className="text-sm font-bold text-white mt-1">
                                    {fmtPrice(Math.max(selectedContract.totalPrice - (statsMap[selectedContract.id].totalPaidAmount || 0), 0))} сом
                                </div>
                            </div>
                        </div>
                    )}
                    <AdminTable
                        columns={scheduleColumns}
                        data={schedule}
                        loading={scheduleLoading}
                        rowKey={(s) => s.id}
                        emptyText="График платежей не создан"
                    />
                </ModalBody>
            </Modal>
        </div>
    )
}
