import { useState, useEffect } from 'react'
import { bookingApi } from '@/lib/api/bookingApi'
import { apartmentApi } from '@/lib/api/apartmentApi'
import { fmtDate } from '@/lib/format'
import { BOOKING_STATUS_MAP, APARTMENT_STATUS_MAP } from '@/lib/statusMaps'
import { useApiAction } from '@/hooks/useApiAction'
import {
    Modal, ModalBody, ModalFooter, StatusBadge,
} from '@/components/admin'

interface BookingRow {
    id: number
    apartmentId: number
    apartmentNumber: string
    userId: number | null
    userName: string | null
    userPhone: string | null
    userPassportNumber: string | null
    consultantId: number | null
    consultantName: string | null
    bookingType: 'PREBOOKING' | 'BOOKING'
    status: string
    expiryDate: string
    notes: string | null
    active: boolean
    expired: boolean
    createdAt: string
    updatedAt: string
}

interface ApartmentDetail {
    id: number
    apartmentNumber: string
    rooms: number
    floor: number
    areaTotal: number
    areaLiving: number | null
    areaKitchen: number | null
    totalPrice: number
    pricePerSqm: number
    status: string
}

function InfoRow({ label, value, badge }: { label: string; value?: string | null; badge?: React.ReactNode }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            {badge || <span className="text-sm text-white font-medium">{value || '—'}</span>}
        </div>
    )
}

function fmtPrice(n: number | null | undefined) {
    if (n == null) return '—'
    return n.toLocaleString('ru-RU') + ' сом'
}

interface Props {
    booking: BookingRow | null
    onClose: () => void
    onBuy: (booking: BookingRow) => void
    reload: () => void
}

export default function BookingDetailModal({ booking, onClose, onBuy, reload }: Props) {
    const [exec] = useApiAction()
    const [apartmentDetail, setApartmentDetail] = useState<ApartmentDetail | null>(null)
    const [loadingApt, setLoadingApt] = useState(false)

    useEffect(() => {
        if (!booking) { setApartmentDetail(null); return }
        setLoadingApt(true)
        apartmentApi.getById(booking.apartmentId)
            .then((res) => setApartmentDetail(res.data))
            .catch(() => setApartmentDetail(null))
            .finally(() => setLoadingApt(false))
    }, [booking])

    return (
        <Modal open={!!booking} onClose={onClose} title={`Бронирование #${booking?.id ?? ''}`}>
            <ModalBody>
                {booking && (
                    <div className="space-y-5">
                        {/* Booking Info */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Данные бронирования</h3>
                            <div className="bg-gray-900/50 rounded-lg px-4">
                                <InfoRow label="Тип" badge={
                                    <span className={`text-xs px-2 py-1 rounded-full ${booking.bookingType === 'PREBOOKING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {booking.bookingType === 'PREBOOKING' ? 'Предбронирование' : 'Полное бронирование'}
                                    </span>
                                } />
                                <InfoRow label="Статус" badge={<StatusBadge status={booking.status} colorMap={BOOKING_STATUS_MAP} />} />
                                <InfoRow label="Дата создания" value={fmtDate(booking.createdAt)} />
                                <InfoRow label="Истекает" value={fmtDate(booking.expiryDate)} />
                                {booking.notes && <InfoRow label="Заметки" value={booking.notes} />}
                            </div>
                        </div>

                        {/* Buyer Info */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Покупатель</h3>
                            <div className="bg-gray-900/50 rounded-lg px-4">
                                <InfoRow label="ФИО" value={booking.userName} />
                                <InfoRow label="Телефон" value={booking.userPhone} />
                                <InfoRow label="ID покупателя" value={booking.userId ? `#${booking.userId}` : null} />
                                <InfoRow label="Консультант" value={booking.consultantName} />
                            </div>
                        </div>

                        {/* Apartment Info */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Квартира</h3>
                            <div className="bg-gray-900/50 rounded-lg px-4">
                                {loadingApt ? (
                                    <div className="py-4 text-center text-sm text-gray-500">Загрузка данных квартиры...</div>
                                ) : apartmentDetail ? (
                                    <>
                                        <InfoRow label="Номер" value={`№${apartmentDetail.apartmentNumber}`} />
                                        <InfoRow label="Комнат" value={String(apartmentDetail.rooms)} />
                                        <InfoRow label="Этаж" value={String(apartmentDetail.floor)} />
                                        <InfoRow label="Площадь общая" value={`${apartmentDetail.areaTotal} м²`} />
                                        {apartmentDetail.areaLiving && <InfoRow label="Площадь жилая" value={`${apartmentDetail.areaLiving} м²`} />}
                                        {apartmentDetail.areaKitchen && <InfoRow label="Площадь кухни" value={`${apartmentDetail.areaKitchen} м²`} />}
                                        <InfoRow label="Цена" value={fmtPrice(apartmentDetail.totalPrice)} />
                                        <InfoRow label="Цена за м²" value={fmtPrice(apartmentDetail.pricePerSqm)} />
                                        <InfoRow label="Статус квартиры" badge={<StatusBadge status={apartmentDetail.status} colorMap={APARTMENT_STATUS_MAP} />} />
                                    </>
                                ) : (
                                    <InfoRow label="Номер" value={`№${booking.apartmentNumber}`} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </ModalBody>
            {booking?.status === 'ACTIVE' && (
                <ModalFooter>
                    <div className="flex gap-3 w-full">
                        {booking.bookingType === 'PREBOOKING' && (
                            <button
                                onClick={() => exec(() => bookingApi.convert(booking.id), {
                                    confirm: 'Конвертировать предбронирование в полное бронирование?',
                                    onSuccess: () => { onClose(); reload() },
                                })}
                                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Конвертировать в Бронь
                            </button>
                        )}
                        {booking.bookingType === 'BOOKING' && (
                            <button
                                onClick={() => { onClose(); onBuy(booking) }}
                                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Купить
                            </button>
                        )}
                        <button
                            onClick={() => exec(() => bookingApi.cancel(booking.id), {
                                confirm: 'Отменить бронирование?',
                                onSuccess: () => { onClose(); reload() },
                            })}
                            className="flex-1 py-2 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-600/30"
                        >
                            Отменить бронирование
                        </button>
                    </div>
                </ModalFooter>
            )}
        </Modal>
    )
}
