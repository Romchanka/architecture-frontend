import { useState, useMemo } from 'react'
import { fmtPrice, fmtDate } from '@/lib/format'
import { CONTRACT_STATUS_MAP } from '@/lib/statusMaps'
import { contractApi } from '@/lib/api/contractApi'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge,
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    FormField, inputCls, filterSelectCls,
} from '@/components/admin'

interface ContractRow {
    id: number
    contractNumber: string
    apartmentId: number
    apartmentNumber?: string
    buyerId: number
    buyerName: string
    consultantId: number
    consultantName: string
    apartmentPrice: number
    parkingPrice: number
    discount: number
    totalPrice: number
    status: string
    signedDate: string | null
    documentUrl: string | null
    createdAt: string
}

const STATUS_MAP = CONTRACT_STATUS_MAP

export default function ContractsPage() {
    const { data: contracts, loading, reload } = useApiData<ContractRow[]>('/contracts?size=200&sort=createdAt,desc', [])
    const [exec, createState] = useApiAction()

    const [statusFilter, setStatusFilter] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [createBookingId, setCreateBookingId] = useState('')

    const filtered = useMemo(() =>
        statusFilter ? contracts.filter((c) => c.status === statusFilter) : contracts,
        [contracts, statusFilter]
    )

    const handleCreate = () => exec(
        () => contractApi.createFromBooking(createBookingId),
        {
            errorFallback: 'Ошибка создания договора',
            onSuccess: () => { setShowCreate(false); setCreateBookingId(''); reload() },
        }
    )

    const handleDownload = async (id: number) => {
        try {
            const response = await contractApi.downloadPdf(id)
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const a = document.createElement('a')
            a.href = url
            a.download = `contract_${id}.pdf`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (err: any) {
            alert(err.response?.data?.message || 'Ошибка скачивания')
        }
    }

    const columns: Column<ContractRow>[] = [
        { header: 'Номер договора', render: (c) => <span className="text-sm text-white font-medium">{c.contractNumber}</span> },
        { header: 'Покупатель', render: (c) => <span className="text-sm text-gray-400">{c.buyerName}</span> },
        { header: 'Консультант', render: (c) => <span className="text-sm text-gray-400">{c.consultantName}</span> },
        { header: 'Стоимость', render: (c) => <span className="text-sm text-gray-300 font-mono">{fmtPrice(c.apartmentPrice)}</span> },
        { header: 'Скидка', render: (c) => <span className="text-sm text-orange-400 font-mono">{c.discount > 0 ? '-' + fmtPrice(c.discount) : '—'}</span> },
        { header: 'Итого', render: (c) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(c.totalPrice)} сом</span> },
        { header: 'Статус', render: (c) => <StatusBadge status={c.status} colorMap={STATUS_MAP} /> },
        { header: 'Подписан', render: (c) => <span className="text-sm text-gray-500">{fmtDate(c.signedDate)}</span> },
        {
            header: 'Действия', render: (c) => (
                <div className="flex gap-2">
                    {(c.status === 'DRAFT' || c.status === 'PENDING_SIGNATURE') && (
                        <button onClick={(e) => { e.stopPropagation(); exec(() => contractApi.sign(c.id), { confirm: 'Подписать договор?', onSuccess: reload }) }} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Подписать</button>
                    )}
                    {c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (
                        <button onClick={(e) => { e.stopPropagation(); exec(() => contractApi.cancel(c.id), { confirm: 'Отменить договор?', onSuccess: reload }) }} className="text-xs text-red-400 hover:text-red-300 transition-colors">Отмена</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(c.id) }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">PDF</button>
                </div>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Договоры" count={filtered.length} actionLabel="+ Создать из бронирования" onAction={() => setShowCreate(true)} />

            <FilterBar>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все статусы</option>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>
            </FilterBar>

            <AdminTable columns={columns} data={filtered} loading={loading} rowKey={(c) => c.id} emptyText="Договоров не найдено" />

            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Создать договор" width="max-w-sm">
                <ModalBody>
                    <ModalError message={createState.error} />
                    <FormField label="ID бронирования *">
                        <input type="number" value={createBookingId} onChange={(e) => setCreateBookingId(e.target.value)} className={inputCls} placeholder="ID бронирования" />
                    </FormField>
                </ModalBody>
                <ModalFooter>
                    <SubmitButton onClick={handleCreate} disabled={!createBookingId} loading={createState.loading} label="Создать договор" loadingLabel="Создание..." />
                </ModalFooter>
            </Modal>
        </div>
    )
}
