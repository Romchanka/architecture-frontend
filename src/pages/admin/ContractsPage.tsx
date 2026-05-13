import { useState, useMemo, useEffect, useRef } from 'react'
import api from '@/lib/api'
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
    const isSuperUser = employee.userType === 'SUPER_USER'
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

    // Double Check Popup state
    const [doubleCheckContract, setDoubleCheckContract] = useState<ContractRow | null>(null)
    const [doubleCheckInput, setDoubleCheckInput] = useState('')

    // SUPER_USER: buyer editing
    const [editBuyerContract, setEditBuyerContract] = useState<ContractRow | null>(null)
    const [buyerForm, setBuyerForm] = useState({ firstName: '', lastName: '', middleName: '', passportNumber: '', email: '', address: '' })
    const [buyerSaving, setBuyerSaving] = useState(false)
    const [buyerError, setBuyerError] = useState('')

    const openBuyerEdit = (c: ContractRow) => {
        setEditBuyerContract(c)
        setBuyerError('')
        // Parse buyerName -> "LastName FirstName MiddleName"
        const parts = (c.buyerName || '').split(' ')
        setBuyerForm({
            lastName: parts[0] || '',
            firstName: parts[1] || '',
            middleName: parts.slice(2).join(' ') || '',
            passportNumber: '',
            email: '',
            address: '',
        })
    }

    const handleSaveBuyerData = async () => {
        if (!editBuyerContract) return
        setBuyerSaving(true)
        setBuyerError('')
        try {
            await api.put(`/contracts/${editBuyerContract.id}/update-buyer-data`, buyerForm)
            setEditBuyerContract(null)
            reload()
            showToast('✅ Данные покупателя обновлены', 'info')
        } catch (err: any) {
            setBuyerError(err.response?.data?.message || 'Ошибка обновления данных')
        }
        setBuyerSaving(false)
    }

    // Documents state
    interface DocItem { id: number; documentType: string; title: string; fileUrl: string; uploadedAt: string; notes: string }
    const [buyerDocs, setBuyerDocs] = useState<DocItem[]>([])
    const [docsLoading, setDocsLoading] = useState(false)
    const [docUploading, setDocUploading] = useState(false)
    const docFileRef = useRef<HTMLInputElement>(null)
    const [docType, setDocType] = useState('PASSPORT_FRONT')

    // Load documents when modal opens
    useEffect(() => {
        if (!editBuyerContract) { setBuyerDocs([]); return }
        setDocsLoading(true)
        api.get(`/files/user-documents/${editBuyerContract.buyerId}`)
            .then(r => setBuyerDocs(r.data))
            .catch(() => setBuyerDocs([]))
            .finally(() => setDocsLoading(false))
    }, [editBuyerContract])

    const handleDocUpload = async (file: File) => {
        if (!editBuyerContract) return
        setDocUploading(true)
        try {
            const form = new FormData()
            form.append('file', file)
            form.append('documentType', docType)
            form.append('title', file.name)
            await api.post(`/files/upload/user-document/${editBuyerContract.buyerId}`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            // Reload docs
            const { data } = await api.get(`/files/user-documents/${editBuyerContract.buyerId}`)
            setBuyerDocs(data)
        } catch (err: any) {
            alert(err.response?.data?.message || 'Ошибка загрузки документа')
        }
        setDocUploading(false)
    }

    const handleDocDelete = async (docId: number) => {
        if (!confirm('Удалить документ?')) return
        try {
            await api.delete(`/files/user-documents/${docId}`)
            setBuyerDocs(prev => prev.filter(d => d.id !== docId))
        } catch (err: any) {
            alert(err.response?.data?.message || 'Ошибка удаления')
        }
    }

    const DOC_TYPE_LABELS: Record<string, string> = {
        PASSPORT_FRONT: '🆔 Паспорт (лицевая)',
        PASSPORT_BACK: '🆔 Паспорт (обратная)',
        CONTRACT_SCAN: '📄 Скан договора',
        CERTIFICATE: '🎓 Справка',
        OTHER: '📎 Другое',
    }

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

    const handleConfirmPayment = () => {
        if (!doubleCheckContract) return
        exec(() => contractApi.confirmPayment(doubleCheckContract.id), {
            errorFallback: 'Ошибка подтверждения оплаты',
            onSuccess: () => {
                setDoubleCheckContract(null)
                setDoubleCheckInput('')
                reload()
            }
        })
    }

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
                        <button onClick={(e) => {
                            e.stopPropagation();
                            setDoubleCheckContract(c);
                            setDoubleCheckInput('');
                        }}
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
                    {/* SUPER_USER: Edit buyer data */}
                    {isSuperUser && c.status !== 'CANCELLED' && (
                        <button onClick={(e) => { e.stopPropagation(); openBuyerEdit(c) }}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                            👤 Ред. покупателя
                        </button>
                    )}
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

            {/* SUPER_USER: Buyer Edit Modal */}
            <Modal open={editBuyerContract !== null} onClose={() => setEditBuyerContract(null)} title={`👤 Редактирование покупателя — ${editBuyerContract?.contractNumber || ''}`} width="max-w-md">
                <ModalBody>
                    {buyerError && <ModalError message={buyerError} />}
                    <div className="mb-3 bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                        <div className="text-xs text-purple-400 font-medium mb-1">⚠️ Только SUPER_USER</div>
                        <div className="text-xs text-gray-500">Все изменения автоматически логируются в системе аудита</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Фамилия">
                            <input value={buyerForm.lastName} onChange={(e) => setBuyerForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} placeholder="Иванов" />
                        </FormField>
                        <FormField label="Имя">
                            <input value={buyerForm.firstName} onChange={(e) => setBuyerForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} placeholder="Иван" />
                        </FormField>
                    </div>
                    <FormField label="Отчество">
                        <input value={buyerForm.middleName} onChange={(e) => setBuyerForm(f => ({ ...f, middleName: e.target.value }))} className={inputCls} placeholder="Иванович" />
                    </FormField>
                    <FormField label="Номер паспорта">
                        <input value={buyerForm.passportNumber} onChange={(e) => setBuyerForm(f => ({ ...f, passportNumber: e.target.value }))} className={inputCls} placeholder="ID 1234567" />
                    </FormField>
                    <FormField label="Email">
                        <input type="email" value={buyerForm.email} onChange={(e) => setBuyerForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="email@example.com" />
                    </FormField>
                    <FormField label="Адрес">
                        <input value={buyerForm.address} onChange={(e) => setBuyerForm(f => ({ ...f, address: e.target.value }))} className={inputCls} placeholder="г. Бишкек, ул. ..." />
                    </FormField>

                    {/* Documents section */}
                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            📁 Документы клиента
                            {docsLoading && <span className="text-xs text-gray-500 animate-pulse">загрузка...</span>}
                        </h4>

                        {/* Existing docs */}
                        {buyerDocs.length > 0 ? (
                            <div className="space-y-2 mb-3">
                                {buyerDocs.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs">{DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</span>
                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-[120px]" title={doc.title}>
                                                {doc.title || 'Файл'}
                                            </a>
                                            <span className="text-[10px] text-gray-600">{fmtDate(doc.uploadedAt)}</span>
                                        </div>
                                        <button onClick={() => handleDocDelete(doc.id)} className="text-xs text-red-400 hover:text-red-300 ml-2 flex-shrink-0">✕</button>
                                    </div>
                                ))}
                            </div>
                        ) : !docsLoading ? (
                            <div className="text-xs text-gray-600 mb-3 text-center py-2">Документы не загружены</div>
                        ) : null}

                        {/* Upload */}
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 block mb-1">Тип документа</label>
                                <select value={docType} onChange={(e) => setDocType(e.target.value)} className={`${inputCls} !py-1.5 !text-xs`}>
                                    {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => docFileRef.current?.click()}
                                disabled={docUploading}
                                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                {docUploading ? '⏳ Загрузка...' : '📤 Загрузить'}
                            </button>
                            <input
                                ref={docFileRef}
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleDocUpload(file)
                                    e.target.value = ''
                                }}
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <SubmitButton onClick={handleSaveBuyerData} disabled={!buyerForm.firstName && !buyerForm.lastName} loading={buyerSaving} label="💾 Сохранить изменения" loadingLabel="Сохранение..." />
                </ModalFooter>
            </Modal>

            {/* Double Check Popup */}
            <Modal open={doubleCheckContract !== null} onClose={() => setDoubleCheckContract(null)} title="🛡️ Контрольная сверка (Double Check)" width="max-w-md">
                <ModalBody>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                        <h4 className="text-amber-400 font-bold mb-2">Внимание! Необратимая операция</h4>
                        <p className="text-sm text-gray-300">
                            Вы собираетесь подтвердить полную оплату по договору. После этого:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-400 mt-2 space-y-1">
                            <li>Статус договора изменится на <b>Оплачен</b>.</li>
                            <li>Квартира будет переведена в статус <b>Продана</b> (недоступна для бронирования).</li>
                            <li>Финансовая статистика компании будет обновлена.</li>
                        </ul>
                    </div>

                    <div className="space-y-3 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Договор:</span>
                            <span className="font-mono text-white">{doubleCheckContract?.contractNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Покупатель:</span>
                            <span className="text-white font-medium">{doubleCheckContract?.buyerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Квартира (ID):</span>
                            <span className="text-white">{doubleCheckContract?.apartmentId}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                            <span className="text-gray-400 font-medium">Итого к оплате:</span>
                            <span className="text-amber-400 font-bold font-mono text-lg">{doubleCheckContract ? fmtPrice(doubleCheckContract.totalPrice) : ''} сом</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm text-gray-400 mb-2">Для подтверждения введите слово <b>ПОДТВЕРЖДАЮ</b>:</label>
                        <input
                            type="text"
                            value={doubleCheckInput}
                            onChange={(e) => setDoubleCheckInput(e.target.value)}
                            className={inputCls}
                            placeholder="ПОДТВЕРЖДАЮ"
                            autoComplete="off"
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <button
                        onClick={() => setDoubleCheckContract(null)}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Отмена
                    </button>
                    <SubmitButton
                        onClick={handleConfirmPayment}
                        disabled={doubleCheckInput !== 'ПОДТВЕРЖДАЮ'}
                        loading={createState.loading}
                        label="🛡️ Завершить сделку"
                        loadingLabel="Обработка..."
                    />
                </ModalFooter>
            </Modal>

            <ToastContainer toasts={toasts} />
        </div>
    )
}
