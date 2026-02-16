import { useState } from 'react'
import { contractApi } from '@/lib/api/contractApi'
import { useApiAction } from '@/hooks/useApiAction'
import {
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    FormField, inputCls,
} from '@/components/admin'

interface BookingRow {
    id: number
    apartmentNumber: string
    userId: number | null
    userName: string | null
    userPhone: string | null
    userPassportNumber: string | null
    consultantId: number | null
    consultantName: string | null
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-white font-medium">{value || '—'}</span>
        </div>
    )
}

interface Props {
    booking: BookingRow | null
    onClose: () => void
    reload: () => void
}

export default function ContractCreateModal({ booking, onClose, reload }: Props) {
    const [exec, createState] = useApiAction()
    const [form, setForm] = useState({
        passportNumber: '',
        discountPercent: '',
        purchaseType: 'PURCHASE' as 'PURCHASE' | 'INSTALLMENT',
        installmentMonths: '',
        paymentDay: '15',
    })

    // Reset passport from booking data when it opens
    const handleOpen = () => {
        if (booking) {
            setForm(f => ({ ...f, passportNumber: booking.userPassportNumber || '' }))
        }
    }

    // We use useEffect-like pattern via key check
    const [prevBookingId, setPrevBookingId] = useState<number | null>(null)
    if (booking && booking.id !== prevBookingId) {
        setPrevBookingId(booking.id)
        handleOpen()
    }
    if (!booking && prevBookingId !== null) {
        setPrevBookingId(null)
    }

    const handleSubmit = () => {
        if (!booking) return
        exec(() => contractApi.create({
            bookingId: booking.id,
            buyerId: booking.userId,
            passportNumber: form.passportNumber,
            discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
            notes: form.purchaseType === 'INSTALLMENT' ? 'Рассрочка' : 'Покупка',
            installmentMonths: form.purchaseType === 'INSTALLMENT' ? Number(form.installmentMonths) : null,
            paymentDay: form.purchaseType === 'INSTALLMENT' ? Number(form.paymentDay) : null,
        }), {
            onSuccess: () => { onClose(); reload() },
        })
    }

    const canSubmit = form.passportNumber &&
        (form.purchaseType !== 'INSTALLMENT' || (form.installmentMonths && form.paymentDay))

    return (
        <Modal open={!!booking} onClose={onClose} title="Оформление договора">
            <ModalBody>
                {booking && (
                    <div className="space-y-5">
                        <ModalError message={createState.error} />

                        {/* Auto-populated buyer info */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Покупатель (автозаполнение)</h3>
                            <div className="bg-gray-900/50 rounded-lg px-4">
                                <InfoRow label="ФИО" value={booking.userName} />
                                <InfoRow label="Телефон" value={booking.userPhone} />
                                <InfoRow label="ID" value={booking.userId ? `#${booking.userId}` : null} />
                            </div>
                        </div>

                        {/* Auto-populated apartment info */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Квартира</h3>
                            <div className="bg-gray-900/50 rounded-lg px-4">
                                <InfoRow label="Номер" value={`№${booking.apartmentNumber}`} />
                                <InfoRow label="Бронирование" value={`#${booking.id}`} />
                            </div>
                        </div>

                        {/* Consultant info */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Консультант</h3>
                            <div className="bg-gray-900/50 rounded-lg px-4">
                                <InfoRow label="ФИО консультанта" value={booking.consultantName} />
                                <InfoRow label="ID" value={booking.consultantId ? `#${booking.consultantId}` : null} />
                            </div>
                        </div>

                        {/* Contract form */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Данные для договора</h3>
                            <div className="space-y-3">
                                <FormField label="Номер паспорта покупателя *">
                                    <input
                                        type="text"
                                        value={form.passportNumber}
                                        onChange={(e) => setForm(f => ({ ...f, passportNumber: e.target.value }))}
                                        className={inputCls}
                                        placeholder="ID 1234567"
                                    />
                                </FormField>
                                <FormField label="Тип оплаты *">
                                    <select
                                        value={form.purchaseType}
                                        onChange={(e) => setForm(f => ({ ...f, purchaseType: e.target.value as 'PURCHASE' | 'INSTALLMENT' }))}
                                        className={inputCls}
                                    >
                                        <option value="PURCHASE">Покупка (100%)</option>
                                        <option value="INSTALLMENT">Рассрочка</option>
                                    </select>
                                </FormField>
                                <FormField label="Скидка (%)">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={form.discountPercent}
                                        onChange={(e) => setForm(f => ({ ...f, discountPercent: e.target.value }))}
                                        className={inputCls}
                                        placeholder="0"
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* Installment settings */}
                        {form.purchaseType === 'INSTALLMENT' && (
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Параметры рассрочки *</h3>
                                <div className="space-y-3">
                                    <FormField label="Срок рассрочки (месяцев) *">
                                        <input
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={form.installmentMonths}
                                            onChange={(e) => setForm(f => ({ ...f, installmentMonths: e.target.value }))}
                                            className={inputCls}
                                            placeholder="Например: 12"
                                        />
                                    </FormField>
                                    <FormField label="День оплаты каждого месяца *">
                                        <input
                                            type="number"
                                            min="1"
                                            max="28"
                                            value={form.paymentDay}
                                            onChange={(e) => setForm(f => ({ ...f, paymentDay: e.target.value }))}
                                            className={inputCls}
                                            placeholder="15"
                                        />
                                    </FormField>
                                    {form.installmentMonths && (
                                        <p className="text-xs text-gray-400">
                                            Будет создано <span className="text-purple-400 font-medium">{form.installmentMonths}</span> платежей, каждое <span className="text-purple-400 font-medium">{form.paymentDay || '15'}</span>-е число месяца
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                    >
                        Отмена
                    </button>
                    <SubmitButton
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        loading={createState.loading}
                        label="Оформить договор"
                        loadingLabel="Оформление..."
                    />
                </div>
            </ModalFooter>
        </Modal>
    )
}
