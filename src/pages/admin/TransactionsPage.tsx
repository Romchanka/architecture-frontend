import { useState, useMemo } from 'react'
import api from '@/lib/api'
import { fmtPrice, fmtDate } from '@/lib/format'
import { TRANSACTION_STATUS_MAP } from '@/lib/statusMaps'
import { transactionApi } from '@/lib/api/transactionApi'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge,
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    FormField, inputCls, textareaCls, filterSelectCls, filterInputCls,
} from '@/components/admin'

interface TransactionRow {
    id: number
    contractId: number
    contractNumber?: string
    amount: number
    paymentType: string
    status: string
    paymentDate: string | null
    description: string | null
    createdAt: string
}

const STATUS_MAP = TRANSACTION_STATUS_MAP

export default function TransactionsPage() {
    const { data: transactions, loading, reload } = useApiData<TransactionRow[]>('/transactions?size=200&sort=createdAt,desc', [])
    const [exec, createState] = useApiAction()

    const [statusFilter, setStatusFilter] = useState('')
    const [searchPhone, setSearchPhone] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [createForm, setCreateForm] = useState({
        contractId: '', amount: '', paymentType: 'CASH', description: '',
    })

    const filtered = useMemo(() =>
        transactions.filter((t) => !statusFilter || t.status === statusFilter),
        [transactions, statusFilter]
    )

    const totalPending = useMemo(() =>
        transactions.filter(t => t.status === 'PENDING').reduce((s, t) => s + t.amount, 0),
        [transactions]
    )
    const totalCompleted = useMemo(() =>
        transactions.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0),
        [transactions]
    )

    const handleCreate = () => exec(
        () => transactionApi.create({
            contractId: Number(createForm.contractId),
            amount: Number(createForm.amount),
            paymentType: createForm.paymentType,
            description: createForm.description || null,
        }),
        {
            errorFallback: 'Ошибка создания платежа',
            onSuccess: () => {
                setShowCreate(false)
                setCreateForm({ contractId: '', amount: '', paymentType: 'CASH', description: '' })
                reload()
            },
        }
    )

    const handleSearchByPhone = async () => {
        if (!searchPhone.trim()) { reload(); return }
        try {
            const { data: users } = await api.get(`/users/search?phone=${encodeURIComponent(searchPhone)}`)
            if (users?.content?.length > 0 || users?.length > 0) {
                const userId = (users.content || users)[0]?.id
                if (userId) {
                    // This will re-filter via reload, but for phone search we need custom URL
                    // For now, just reload all
                    reload()
                }
            }
        } catch {
            reload()
        }
    }

    const columns: Column<TransactionRow>[] = [
        { header: 'ID', render: (t) => <span className="text-sm text-gray-400">#{t.id}</span> },
        { header: 'Договор', render: (t) => <span className="text-sm text-white font-medium">{t.contractNumber || `#${t.contractId}`}</span> },
        { header: 'Сумма', render: (t) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(t.amount)} сом</span> },
        { header: 'Тип оплаты', render: (t) => <span className="text-sm text-gray-400">{t.paymentType}</span> },
        { header: 'Статус', render: (t) => <StatusBadge status={t.status} colorMap={STATUS_MAP} /> },
        { header: 'Дата оплаты', render: (t) => <span className="text-sm text-gray-500">{fmtDate(t.paymentDate)}</span> },
        { header: 'Описание', render: (t) => <span className="text-sm text-gray-500 max-w-[200px] truncate block">{t.description || '—'}</span> },
        {
            header: 'Действия', render: (t) => (
                <div className="flex gap-2">
                    {t.status === 'PENDING' && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); exec(() => transactionApi.complete(t.id), { confirm: 'Подтвердить оплату?', onSuccess: reload }) }} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">✓ Оплачен</button>
                            <button onClick={(e) => { e.stopPropagation(); exec(() => transactionApi.cancel(t.id), { confirm: 'Отменить транзакцию?', onSuccess: reload }) }} className="text-xs text-red-400 hover:text-red-300 transition-colors">Отмена</button>
                        </>
                    )}
                </div>
            ),
        },
    ]

    const set = (k: string, v: string) => setCreateForm((f) => ({ ...f, [k]: v }))

    return (
        <div>
            <PageHeader title="Платежи" count={filtered.length} countLabel="транзакций" actionLabel="+ Внести платёж" onAction={() => setShowCreate(true)} />

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Ожидают оплаты</div>
                    <div className="text-2xl font-bold text-yellow-400 mt-1">{fmtPrice(totalPending)} сом</div>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Оплачено</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{fmtPrice(totalCompleted)} сом</div>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Всего транзакций</div>
                    <div className="text-2xl font-bold text-white mt-1">{transactions.length}</div>
                </div>
            </div>

            <FilterBar>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все статусы</option>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <input type="tel" placeholder="Поиск по телефону..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className={filterInputCls} />
                    <button onClick={handleSearchByPhone} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-amber-400 hover:bg-gray-700 transition-colors">Найти</button>
                </div>
            </FilterBar>

            <AdminTable columns={columns} data={filtered} loading={loading} rowKey={(t) => t.id} emptyText="Транзакций не найдено" />

            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Внести платёж">
                <ModalBody>
                    <ModalError message={createState.error} />
                    <FormField label="ID договора *">
                        <input type="number" value={createForm.contractId} onChange={(e) => set('contractId', e.target.value)} className={inputCls} placeholder="ID договора" />
                    </FormField>
                    <FormField label="Сумма (сом) *">
                        <input type="number" value={createForm.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} placeholder="Сумма" />
                    </FormField>
                    <FormField label="Тип оплаты">
                        <select value={createForm.paymentType} onChange={(e) => set('paymentType', e.target.value)} className={inputCls}>
                            <option value="CASH">Наличные</option>
                            <option value="BANK_TRANSFER">Банковский перевод</option>
                            <option value="INSTALLMENT">Рассрочка</option>
                        </select>
                    </FormField>
                    <FormField label="Описание">
                        <textarea value={createForm.description} onChange={(e) => set('description', e.target.value)} className={textareaCls} rows={2} placeholder="Описание платежа..." />
                    </FormField>
                </ModalBody>
                <ModalFooter>
                    <SubmitButton onClick={handleCreate} disabled={!createForm.contractId || !createForm.amount} loading={createState.loading} label="Внести платёж" loadingLabel="Создание..." />
                </ModalFooter>
            </Modal>
        </div>
    )
}
