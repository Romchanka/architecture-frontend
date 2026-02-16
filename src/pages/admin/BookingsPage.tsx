import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fmtDate } from '@/lib/format'
import { BOOKING_STATUS_MAP } from '@/lib/statusMaps'
import { bookingApi } from '@/lib/api/bookingApi'
import { useApiData } from '@/hooks/useApiData'
import { useApiAction } from '@/hooks/useApiAction'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge,
    Modal, ModalBody, ModalFooter, SubmitButton, ModalError,
    FormField, inputCls, textareaCls, filterSelectCls,
} from '@/components/admin'
import BookingDetailModal from '@/components/admin/BookingDetailModal'
import ContractCreateModal from '@/components/admin/ContractCreateModal'

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

const STATUS_MAP = BOOKING_STATUS_MAP

export default function BookingsPage() {
    const [searchParams] = useSearchParams()
    const preselectedApartmentId = searchParams.get('apartmentId')

    const { data: bookings, loading, reload } = useApiData<BookingRow[]>('/bookings?size=200&sort=createdAt,desc', [], { pollingInterval: 10_000 })
    const [exec, createState] = useApiAction()

    const [statusFilter, setStatusFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [showCreate, setShowCreate] = useState(!!preselectedApartmentId)
    const [selected, setSelected] = useState<BookingRow | null>(null)
    const [contractBooking, setContractBooking] = useState<BookingRow | null>(null)
    const [createForm, setCreateForm] = useState({
        apartmentId: preselectedApartmentId || '',
        userId: '',
        bookingType: 'PREBOOKING' as 'PREBOOKING' | 'BOOKING',
        notes: '',
        durationDays: '7',
    })

    const filtered = useMemo(() =>
        bookings.filter((b) => {
            if (statusFilter && b.status !== statusFilter) return false
            if (typeFilter && b.bookingType !== typeFilter) return false
            return true
        }),
        [bookings, statusFilter, typeFilter]
    )

    const handleCreate = () => exec(
        () => bookingApi.create({
            apartmentId: Number(createForm.apartmentId),
            userId: createForm.userId ? Number(createForm.userId) : null,
            bookingType: createForm.bookingType,
            notes: createForm.notes || null,
            durationDays: Number(createForm.durationDays),
        }),
        {
            errorFallback: 'Ошибка создания бронирования',
            onSuccess: () => {
                setShowCreate(false)
                setCreateForm({ apartmentId: '', userId: '', bookingType: 'PREBOOKING', notes: '', durationDays: '7' })
                reload()
            },
        }
    )

    const columns: Column<BookingRow>[] = [
        { header: 'ID', render: (b) => <span className="text-sm text-gray-400">#{b.id}</span> },
        { header: 'Квартира', render: (b) => <span className="text-sm text-white font-medium">№{b.apartmentNumber}</span> },
        { header: 'Покупатель', render: (b) => <span className="text-sm text-gray-400">{b.userName || '—'}</span> },
        { header: 'Консультант', render: (b) => <span className="text-sm text-gray-400">{b.consultantName || '—'}</span> },
        {
            header: 'Тип', render: (b) => (
                <span className={`text-xs px-2 py-1 rounded-full ${b.bookingType === 'PREBOOKING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {b.bookingType === 'PREBOOKING' ? 'Предбронь' : 'Бронь'}
                </span>
            ),
        },
        { header: 'Статус', render: (b) => <StatusBadge status={b.status} colorMap={STATUS_MAP} /> },
        { header: 'Истекает', render: (b) => <span className="text-sm text-gray-500">{fmtDate(b.expiryDate)}</span> },
        { header: 'Дата', render: (b) => <span className="text-sm text-gray-500">{fmtDate(b.createdAt)}</span> },
        {
            header: 'Действия', render: (b) => (
                <div className="flex gap-2">
                    {b.status === 'ACTIVE' && b.bookingType === 'PREBOOKING' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); exec(() => bookingApi.convert(b.id), { confirm: 'Конвертировать предбронирование в полное бронирование?', onSuccess: () => reload() }) }}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >Бронь →</button>
                    )}
                    {b.status === 'ACTIVE' && b.bookingType === 'BOOKING' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setContractBooking(b) }}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >Купить</button>
                    )}
                    {b.status === 'ACTIVE' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); exec(() => bookingApi.cancel(b.id), { confirm: 'Отменить бронирование?', onSuccess: () => reload() }) }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >Отмена</button>
                    )}
                </div>
            ),
        },
    ]

    const set = (k: string, v: string) => setCreateForm((f) => ({ ...f, [k]: v }))

    return (
        <div>
            <PageHeader title="Бронирования" count={filtered.length} actionLabel="+ Новое бронирование" onAction={() => setShowCreate(true)} />

            <FilterBar>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все статусы</option>
                    <option value="ACTIVE">Активные</option>
                    <option value="CANCELLED">Отменённые</option>
                    <option value="EXPIRED">Истёкшие</option>
                    <option value="CONVERTED">Конвертированные</option>
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все типы</option>
                    <option value="PREBOOKING">Предбронь</option>
                    <option value="BOOKING">Бронь</option>
                </select>
            </FilterBar>

            <AdminTable columns={columns} data={filtered} loading={loading} rowKey={(b) => b.id} emptyText="Бронирований не найдено" onRowClick={setSelected} />

            {/* Detail Modal */}
            <BookingDetailModal
                booking={selected}
                onClose={() => setSelected(null)}
                onBuy={(b) => { setSelected(null); setContractBooking(b) }}
                reload={reload}
            />

            {/* Contract Create Modal */}
            <ContractCreateModal
                booking={contractBooking}
                onClose={() => setContractBooking(null)}
                reload={reload}
            />

            {/* Create Booking Modal */}
            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новое бронирование">
                <ModalBody>
                    <ModalError message={createState.error} />
                    <FormField label="ID квартиры *">
                        <input type="number" value={createForm.apartmentId} onChange={(e) => set('apartmentId', e.target.value)} className={inputCls} placeholder="ID квартиры" />
                    </FormField>
                    <FormField label="ID покупателя (опционально)">
                        <input type="number" value={createForm.userId} onChange={(e) => set('userId', e.target.value)} className={inputCls} placeholder="ID покупателя" />
                    </FormField>
                    <FormField label="Тип бронирования">
                        <select value={createForm.bookingType} onChange={(e) => set('bookingType', e.target.value)} className={inputCls}>
                            <option value="PREBOOKING">Предбронирование</option>
                            <option value="BOOKING">Полное бронирование</option>
                        </select>
                    </FormField>
                    <FormField label="Срок (дней)">
                        <input type="number" value={createForm.durationDays} onChange={(e) => set('durationDays', e.target.value)} className={inputCls} />
                    </FormField>
                    <FormField label="Заметки">
                        <textarea value={createForm.notes} onChange={(e) => set('notes', e.target.value)} className={textareaCls} rows={3} placeholder="Комментарий..." />
                    </FormField>
                </ModalBody>
                <ModalFooter>
                    <SubmitButton onClick={handleCreate} disabled={!createForm.apartmentId} loading={createState.loading} label="Создать бронирование" loadingLabel="Создание..." />
                </ModalFooter>
            </Modal>
        </div>
    )
}
