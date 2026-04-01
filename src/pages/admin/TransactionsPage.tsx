import { useState, useMemo } from 'react'
import api from '@/lib/api'
import { fmtPrice, fmtDate } from '@/lib/format'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge,
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    filterSelectCls,
} from '@/components/admin'

/* ─── Types ─── */
interface ContractRow {
    id: number
    contractNumber: string
    buyerName: string
    totalPrice: number
    notes: string | null
    status: string
    createdAt: string
    apartmentNumber?: string
    consultantName?: string
}

const CONTRACT_STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Черновик', color: 'bg-gray-500/15 text-gray-400' },
    PENDING_BUYER_SIGNATURE: { label: 'Ждёт подпись покупателя', color: 'bg-yellow-500/15 text-yellow-400' },
    PENDING_COMPANY_SIGNATURE: { label: 'Ждёт подпись компании', color: 'bg-orange-500/15 text-orange-400' },
    SIGNED: { label: 'Подписан', color: 'bg-blue-500/15 text-blue-400' },
    IN_PAYMENT: { label: 'Ожидает оплаты', color: 'bg-amber-500/15 text-amber-400' },
    PAID: { label: 'Оплачен', color: 'bg-emerald-500/15 text-emerald-400' },
    COMPLETED: { label: 'Завершён', color: 'bg-green-500/15 text-green-400' },
    CANCELLED: { label: 'Отменён', color: 'bg-red-500/15 text-red-400' },
}

/* ─── Component ─── */
export default function TransactionsPage() {
    const { data: allContracts, loading, reload } = useApiData<ContractRow[]>(
        '/contracts?size=500&sort=createdAt,desc', []
    )
    const [exec, actionState] = useApiAction()

    const [statusFilter, setStatusFilter] = useState('')
    const [confirmingId, setConfirmingId] = useState<number | null>(null)

    // Filter: only FULL PURCHASE contracts (not installment)
    const fullPurchaseContracts = useMemo(
        () => allContracts.filter(c => !c.notes?.toLowerCase().includes('рассрочка')),
        [allContracts]
    )

    // Apply status filter
    const filtered = useMemo(
        () => fullPurchaseContracts.filter(c => !statusFilter || c.status === statusFilter),
        [fullPurchaseContracts, statusFilter]
    )

    // Summary stats
    const awaitingPayment = useMemo(
        () => fullPurchaseContracts.filter(c =>
            c.status === 'SIGNED' || c.status === 'IN_PAYMENT' ||
            c.status === 'PENDING_BUYER_SIGNATURE' || c.status === 'PENDING_COMPANY_SIGNATURE'
        ),
        [fullPurchaseContracts]
    )
    const totalAwaitingAmount = useMemo(
        () => awaitingPayment.reduce((s, c) => s + c.totalPrice, 0),
        [awaitingPayment]
    )
    const paidContracts = useMemo(
        () => fullPurchaseContracts.filter(c => c.status === 'PAID' || c.status === 'COMPLETED'),
        [fullPurchaseContracts]
    )
    const totalPaidAmount = useMemo(
        () => paidContracts.reduce((s, c) => s + c.totalPrice, 0),
        [paidContracts]
    )

    // Confirm full payment
    const handleConfirmPayment = (contract: ContractRow) => {
        setConfirmingId(contract.id)
        exec(
            () => api.put(`/contracts/${contract.id}/confirm-payment`),
            {
                confirm: `Подтвердить полную оплату ${fmtPrice(contract.totalPrice)} сом за договор ${contract.contractNumber}?`,
                errorFallback: 'Ошибка подтверждения оплаты',
                onSuccess: () => {
                    setConfirmingId(null)
                    reload()
                },
            }
        )
    }

    // Can confirm payment for these statuses
    const canConfirm = (status: string) =>
        status === 'SIGNED' || status === 'IN_PAYMENT' ||
        status === 'PENDING_BUYER_SIGNATURE' || status === 'PENDING_COMPANY_SIGNATURE'

    const columns: Column<ContractRow>[] = [
        { header: 'Договор', render: (c) => <span className="text-sm text-white font-medium">{c.contractNumber}</span> },
        { header: 'Покупатель', render: (c) => <span className="text-sm text-gray-300">{c.buyerName}</span> },
        {
            header: 'Квартира', render: (c) => (
                <span className="text-sm text-gray-400">{c.apartmentNumber ? `№${c.apartmentNumber}` : `—`}</span>
            ),
        },
        {
            header: 'Сумма', render: (c) => (
                <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(c.totalPrice)} сом</span>
            ),
        },
        { header: 'Статус', render: (c) => <StatusBadge status={c.status} colorMap={CONTRACT_STATUS_MAP} /> },
        { header: 'Дата', render: (c) => <span className="text-sm text-gray-500">{fmtDate(c.createdAt)}</span> },
        {
            header: 'Действия', render: (c) => (
                <div className="flex gap-2">
                    {canConfirm(c.status) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleConfirmPayment(c) }}
                            disabled={confirmingId === c.id}
                            className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-50"
                        >
                            {confirmingId === c.id ? '⏳' : '✅'} Подтвердить оплату
                        </button>
                    )}
                    {c.status === 'PAID' && (
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">✅ Оплачен</span>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div>
            <PageHeader
                title="Полные покупки"
                count={filtered.length}
                countLabel="договоров"
            />

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Ожидают оплаты</div>
                    <div className="text-2xl font-bold text-yellow-400 mt-1">{awaitingPayment.length}</div>
                    <div className="text-xs text-gray-500 mt-1">{fmtPrice(totalAwaitingAmount)} сом</div>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Оплачено</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{paidContracts.length}</div>
                    <div className="text-xs text-gray-500 mt-1">{fmtPrice(totalPaidAmount)} сом</div>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Всего полных покупок</div>
                    <div className="text-2xl font-bold text-white mt-1">{fullPurchaseContracts.length}</div>
                </div>
            </div>

            <FilterBar>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все статусы</option>
                    {Object.entries(CONTRACT_STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>
            </FilterBar>

            <AdminTable columns={columns} data={filtered} loading={loading} rowKey={(c) => c.id} emptyText="Договоров на полную покупку нет" />
        </div>
    )
}
