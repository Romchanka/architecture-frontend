import { useState, useRef } from 'react'
import { lawyerApi } from '@/lib/api/lawyerApi'
import { fmtPrice, fmtDate } from '@/lib/format'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import { useToast, ToastContainer } from '@/components/Toast'
import { ContractResponse } from '@/types/admin'
import {
    AdminTable, Column, PageHeader, StatusBadge,
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    FormField, inputCls
} from '@/components/admin'
import { CONTRACT_STATUS_MAP } from '@/lib/statusMaps'

export default function LawyerOverduePage() {
    const { data: contracts, loading, reload } = useApiData<ContractResponse[]>('/lawyers/contracts/overdue?size=200', [])
    const [exec, actionState] = useApiAction()
    const { toasts, show: showToast } = useToast()

    const [terminateContract, setTerminateContract] = useState<ContractResponse | null>(null)
    const [terminateReason, setTerminateReason] = useState('Нарушение условий оплаты по графику рассрочки')

    const [uploadContract, setUploadContract] = useState<ContractResponse | null>(null)
    const [uploadTitle, setUploadTitle] = useState('')
    const [uploadNotes, setUploadNotes] = useState('')
    const docFileRef = useRef<HTMLInputElement>(null)

    const handleTerminate = () => {
        if (!terminateContract) return
        exec(() => lawyerApi.terminateContract(terminateContract.id, terminateReason), {
            errorFallback: 'Ошибка расторжения',
            onSuccess: () => {
                showToast('Договор расторгнут', 'success')
                setTerminateContract(null)
                reload()
            }
        })
    }

    const handleUpload = async (file: File) => {
        if (!uploadContract) return
        if (!uploadTitle) {
            alert('Введите название документа')
            return
        }

        exec(() => lawyerApi.uploadLegalDocument(uploadContract.id, file, uploadTitle, uploadNotes), {
            errorFallback: 'Ошибка загрузки документа',
            onSuccess: () => {
                showToast('Документ успешно загружен', 'success')
                setUploadContract(null)
                setUploadTitle('')
                setUploadNotes('')
            }
        })
    }

    const columns: Column<ContractResponse>[] = [
        { header: 'Номер договора', render: (c) => <span className="text-sm text-white font-medium">{c.contractNumber}</span> },
        { header: 'Покупатель', render: (c) => <span className="text-sm text-gray-400">{c.buyerName}</span> },
        { header: 'Итого', render: (c) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(c.totalPrice)} сом</span> },
        { header: 'Статус', render: (c) => <StatusBadge status={c.status} colorMap={CONTRACT_STATUS_MAP} /> },
        { header: 'Дата', render: (c) => <span className="text-sm text-gray-500">{fmtDate(c.createdAt)}</span> },
        {
            header: 'Действия', render: (c) => (
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setUploadContract(c); setUploadTitle('Претензия') }}
                        className="text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 px-2 py-1 rounded transition-colors">
                        📎 Прикрепить документ
                    </button>
                    <button onClick={() => setTerminateContract(c)}
                        className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-2 py-1 rounded transition-colors">
                        ⚖️ Расторгнуть
                    </button>
                </div>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Просроченные договоры" count={contracts.length} />

            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <h3 className="text-red-400 font-bold mb-1 flex items-center gap-2">
                    <span>⚠️</span> Внимание юристам
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                    Здесь отображаются только договоры, по которым имеется просроченная задолженность согласно графику платежей.
                    Вы можете прикрепить юридические документы (претензии, иски) или расторгнуть договор за нарушение условий оплаты.
                    Расторжение приведет к освобождению квартиры в шахматке.
                </p>
            </div>

            <AdminTable columns={columns} data={contracts} loading={loading} rowKey={(c) => c.id} emptyText="Нет просроченных договоров" />

            {/* Модалка Расторжения */}
            <Modal open={terminateContract !== null} onClose={() => setTerminateContract(null)} title="⚖️ Расторжение договора" width="max-w-md">
                <ModalBody>
                    <ModalError message={actionState.error} />
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                        <h4 className="text-red-400 font-bold mb-2">Необратимая операция</h4>
                        <p className="text-sm text-gray-300">
                            Договор <b className="text-white">{terminateContract?.contractNumber}</b> с клиентом <b className="text-white">{terminateContract?.buyerName}</b> будет переведен в статус <b>Расторгнут</b>.
                            Квартира будет автоматически освобождена для новой продажи.
                        </p>
                    </div>
                    <FormField label="Причина расторжения">
                        <textarea
                            value={terminateReason}
                            onChange={(e) => setTerminateReason(e.target.value)}
                            className={inputCls}
                            rows={3}
                            placeholder="Опишите причину"
                        />
                    </FormField>
                </ModalBody>
                <ModalFooter>
                    <button onClick={() => setTerminateContract(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Отмена</button>
                    <SubmitButton onClick={handleTerminate} loading={actionState.loading} disabled={!terminateReason} label="Расторгнуть договор" />
                </ModalFooter>
            </Modal>

            {/* Модалка Загрузки Документа */}
            <Modal open={uploadContract !== null} onClose={() => setUploadContract(null)} title="📎 Прикрепить юридический документ" width="max-w-md">
                <ModalBody>
                    <ModalError message={actionState.error} />
                    <p className="text-sm text-gray-400 mb-4">К договору: <b className="text-white">{uploadContract?.contractNumber}</b></p>
                    
                    <FormField label="Название документа (например: Претензия от 15.05.2026) *">
                        <input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className={inputCls} placeholder="Претензия" />
                    </FormField>
                    <FormField label="Заметки / Описание">
                        <textarea value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} className={inputCls} rows={2} placeholder="Дополнительная информация" />
                    </FormField>
                    
                    <div className="mt-4">
                        <button
                            onClick={() => docFileRef.current?.click()}
                            disabled={actionState.loading}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 border-dashed rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                            {actionState.loading ? '⏳ Загрузка...' : '📁 Выбрать файл (PDF, Картинка)'}
                        </button>
                        <input
                            ref={docFileRef}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUpload(file)
                                e.target.value = ''
                            }}
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <button onClick={() => setUploadContract(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Отмена</button>
                </ModalFooter>
            </Modal>

            <ToastContainer toasts={toasts} />
        </div>
    )
}
