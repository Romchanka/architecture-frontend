import { useState, useMemo } from 'react'
import { fmtPrice, fmtDate } from '@/lib/format'
import { CONTRACT_STATUS_MAP } from '@/lib/statusMaps'
import { contractApi } from '@/lib/api/contractApi'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import { useEventSource } from '@/hooks/useEventSource'
import { useToast, ToastContainer } from '@/components/Toast'
import { useAdmin } from '@/components/AdminGuard'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge,
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    FormField, inputCls, filterSelectCls,
} from '@/components/admin'
import SignaturePadModal from '@/components/admin/SignaturePadModal'

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
    buyerSignatureUrl: string | null
    companySignatureUrl: string | null
    createdAt: string
    notes: string | null
}

const STATUS_MAP = CONTRACT_STATUS_MAP

export default function ContractsPage() {
    const employee = useAdmin()
    const isReadOnly = employee.userType === 'ACCOUNTANT'
    const canSign = employee.userType === 'CONSULTANT' || employee.userType === 'SUPER_USER' || employee.userType === 'ADMIN'
    const { data: contracts, loading, reload } = useApiData<ContractRow[]>('/contracts?size=200&sort=createdAt,desc', [])
    const [exec, createState] = useApiAction()
    const { toasts, show: showToast } = useToast()

    // SSE: подписка на real-time уведомления о договорах
    useEventSource({
        eventTypes: ['contract_created', 'contract_sent_for_signature', 'contract_buyer_signed', 'contract_signed'],
        onEvent: (event) => {
            const d = event.data as Record<string, string>
            const labels: Record<string, string> = {
                contract_created: '📄 Новый договор',
                contract_sent_for_signature: '✉️ Отправлен на подпись',
                contract_buyer_signed: '✍️ Покупатель подписал',
                contract_signed: '✅ Договор подписан',
            }
            const label = labels[event.type] || 'Обновление договора'
            showToast(`${label}: №${d.contractNumber || '?'} — ${d.buyerName || 'Покупатель'}`,
                event.type === 'contract_buyer_signed' ? 'warning' : 'info')
            reload()
        },
    })

    const [statusFilter, setStatusFilter] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [createBookingId, setCreateBookingId] = useState('')
    const [signContractId, setSignContractId] = useState<number | null>(null)

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

    const handleSendForSignature = (id: number) => exec(
        () => contractApi.sendForSignature(id),
        { confirm: 'Отправить договор покупателю на подпись?', onSuccess: reload }
    )

    const handleCompanySign = (signatureBlob: Blob) => {
        if (!signContractId) return
        exec(
            () => contractApi.signByCompany(signContractId, employee.fullName || 'Представитель', signatureBlob),
            { onSuccess: () => { setSignContractId(null); reload() } }
        )
    }

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
        { header: 'Итого', render: (c) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(c.totalPrice)} сом</span> },
        {
            header: 'Тип', render: (c) => {
                const isInstallment = c.notes?.toLowerCase().includes('рассрочка')
                return (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isInstallment
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                        {isInstallment ? '📅 Рассрочка' : '💰 Покупка'}
                    </span>
                )
            },
        },
        { header: 'Статус', render: (c) => <StatusBadge status={c.status} colorMap={STATUS_MAP} /> },
        {
            header: 'Подписи', render: (c) => (
                <div className="flex gap-1">
                    {c.buyerSignatureUrl ? <span title="Покупатель подписал">✅👤</span> : <span title="Покупатель не подписал">⬜👤</span>}
                    {c.companySignatureUrl ? <span title="Компания подписала">✅🏢</span> : <span title="Компания не подписала">⬜🏢</span>}
                </div>
            ),
        },
        { header: 'Дата', render: (c) => <span className="text-sm text-gray-500">{fmtDate(c.signedDate || c.createdAt)}</span> },
        {
            header: 'Действия', render: (c) => (
                <div className="flex gap-2 flex-wrap">
                    {/* Отправить на подпись (DRAFT → PENDING_BUYER) */}
                    {canSign && c.status === 'DRAFT' && (
                        <button onClick={(e) => { e.stopPropagation(); handleSendForSignature(c.id) }}
                            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                            ✉️ На подпись
                        </button>
                    )}
                    {/* Подписать от компании (PENDING_COMPANY → SIGNED) */}
                    {canSign && c.status === 'PENDING_COMPANY_SIGNATURE' && (
                        <button onClick={(e) => { e.stopPropagation(); setSignContractId(c.id) }}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                            ✍️ Подписать
                        </button>
                    )}
                    {/* Подтвердить оплату */}
                    {c.status !== 'PAID' && c.status !== 'COMPLETED' && c.status !== 'CANCELLED' && (
                        <button onClick={(e) => { e.stopPropagation(); exec(() => contractApi.confirmPayment(c.id), { confirm: 'Подтвердить оплату? Квартира будет помечена как проданная.', onSuccess: reload }) }}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
                            💰 Оплата
                        </button>
                    )}
                    {/* Отмена */}
                    {!isReadOnly && c.status !== 'CANCELLED' && c.status !== 'COMPLETED' && (
                        <button onClick={(e) => { e.stopPropagation(); exec(() => contractApi.cancel(c.id), { confirm: 'Отменить договор?', onSuccess: reload }) }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors">
                            Отмена
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(c.id) }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        PDF
                    </button>
                </div>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Договоры" count={filtered.length} actionLabel={isReadOnly ? undefined : '+ Создать из бронирования'} onAction={isReadOnly ? undefined : () => setShowCreate(true)} />

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

            <SignaturePadModal
                isOpen={signContractId !== null}
                onClose={() => setSignContractId(null)}
                onSign={handleCompanySign}
                title="Подпись от имени компании"
                signerLabel="Нарисуйте подпись представителя компании"
            />

            <ToastContainer toasts={toasts} />
        </div>
    )
}
