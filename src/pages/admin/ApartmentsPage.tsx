import { useState, useMemo, useRef } from 'react'
import { fmtPrice } from '@/lib/format'
import { APARTMENT_STATUS_MAP } from '@/lib/statusMaps'
import { useApiData } from '@/hooks/useApiData'
import { useAdmin } from '@/components/AdminGuard'
import api from '@/lib/api'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge,
    Modal, ModalBody, ModalFooter, inputCls,
    filterSelectCls, filterInputCls,
} from '@/components/admin'

interface ApartmentRow {
    id: number
    apartmentNumber: string
    floor: number
    rooms: number
    areaTotal: number
    areaLiving: number | null
    areaKitchen: number | null
    pricePerSqm: number
    totalPrice: number
    status: string
    buildingName?: string
    complexName?: string
    layoutPlanUrl?: string
    notes?: string
}

const STATUS_MAP = APARTMENT_STATUS_MAP

export default function ApartmentsPage() {
    const employee = useAdmin()
    const canUpload = employee.userType === 'ADMIN' || employee.userType === 'SUPER_USER'
    const { data: apartments, loading, reload } = useApiData<ApartmentRow[]>('/apartments?size=200', [])

    const [statusFilter, setStatusFilter] = useState('')
    const [roomsFilter, setRoomsFilter] = useState('')
    const [floorFilter, setFloorFilter] = useState('')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<ApartmentRow | null>(null)
    const [calcArea, setCalcArea] = useState('')
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const filtered = useMemo(() =>
        apartments.filter((a) => {
            if (statusFilter && a.status !== statusFilter) return false
            if (roomsFilter && a.rooms !== Number(roomsFilter)) return false
            if (floorFilter && a.floor !== Number(floorFilter)) return false
            if (search && !a.apartmentNumber.toLowerCase().includes(search.toLowerCase())) return false
            return true
        }),
        [apartments, statusFilter, roomsFilter, floorFilter, search]
    )

    const floors = useMemo(() => [...new Set(apartments.map((a) => a.floor))].sort((a, b) => a - b), [apartments])
    const rooms = useMemo(() => [...new Set(apartments.map((a) => a.rooms))].sort((a, b) => a - b), [apartments])

    const handleLayoutUpload = async (apartmentId: number, file: File) => {
        setUploading(true)
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await api.post(`/files/upload/apartment-layout/${apartmentId}`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            // Update selected apartment with new URL
            if (selected) {
                setSelected({ ...selected, layoutPlanUrl: res.data.url })
            }
            reload()
        } catch (err: any) {
            alert(err.response?.data?.message || 'Ошибка загрузки планировки')
        } finally {
            setUploading(false)
        }
    }

    const columns: Column<ApartmentRow>[] = [
        { header: 'Номер', render: (a) => <span className="text-sm text-white font-medium">№{a.apartmentNumber}</span> },
        { header: 'Этаж', render: (a) => <span className="text-sm text-gray-400">{a.floor}</span> },
        { header: 'Комнаты', render: (a) => <span className="text-sm text-gray-400">{a.rooms}</span> },
        { header: 'Площадь (м²)', render: (a) => <span className="text-sm text-gray-300 font-mono">{a.areaTotal}</span> },
        { header: 'Цена за м²', render: (a) => <span className="text-sm text-gray-300 font-mono">{fmtPrice(a.pricePerSqm)} сом</span> },
        { header: 'Итого', render: (a) => <span className="text-sm text-amber-400 font-bold font-mono">{fmtPrice(a.totalPrice)} сом</span> },
        { header: 'Статус', render: (a) => <StatusBadge status={a.status} colorMap={STATUS_MAP} /> },
        {
            header: '', render: () => (
                <button className="text-gray-500 hover:text-amber-400 text-sm transition-colors">Открыть →</button>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Квартиры" count={filtered.length} countLabel={`из ${apartments.length} квартир`} />

            <FilterBar className="grid grid-cols-2 md:grid-cols-5">
                <input type="text" placeholder="Поиск по номеру..." value={search} onChange={(e) => setSearch(e.target.value)} className={filterInputCls} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все статусы</option>
                    <option value="AVAILABLE">Свободна</option>
                    <option value="PREBOOKED">Предбронь</option>
                    <option value="BOOKED">Бронь</option>
                    <option value="SOLD">Продано</option>
                </select>
                <select value={roomsFilter} onChange={(e) => setRoomsFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все комнаты</option>
                    {rooms.map((r) => <option key={r} value={r}>{r}-комн.</option>)}
                </select>
                <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все этажи</option>
                    {floors.map((f) => <option key={f} value={f}>{f} этаж</option>)}
                </select>
                <button onClick={() => { setStatusFilter(''); setRoomsFilter(''); setFloorFilter(''); setSearch('') }} className="text-sm text-gray-500 hover:text-white transition-colors">Сбросить</button>
            </FilterBar>

            <AdminTable
                columns={columns}
                data={filtered}
                loading={loading}
                rowKey={(a) => a.id}
                onRowClick={(apt) => { setSelected(apt); setCalcArea(String(apt.areaTotal)) }}
                emptyText="Квартиры не найдены"
            />

            {/* Detail Modal */}
            <Modal open={!!selected} onClose={() => setSelected(null)} title={`Квартира №${selected?.apartmentNumber || ''}`} width="max-w-lg">
                {selected && (
                    <>
                        <ModalBody>
                            <div className="flex items-center gap-2 mb-2">
                                <StatusBadge status={selected.status} colorMap={STATUS_MAP} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <div className="text-xs text-gray-500">Этаж</div>
                                    <div className="text-lg text-white font-bold">{selected.floor}</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <div className="text-xs text-gray-500">Комнат</div>
                                    <div className="text-lg text-white font-bold">{selected.rooms}</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <div className="text-xs text-gray-500">Общая площадь</div>
                                    <div className="text-lg text-white font-bold">{selected.areaTotal} м²</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <div className="text-xs text-gray-500">Жилая / Кухня</div>
                                    <div className="text-sm text-gray-300">{selected.areaLiving || '—'} / {selected.areaKitchen || '—'} м²</div>
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Цена за м²</div>
                                <div className="text-xl text-amber-400 font-bold">{fmtPrice(selected.pricePerSqm)} сом</div>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                <div className="text-xs text-amber-400">Стоимость квартиры</div>
                                <div className="text-2xl text-amber-400 font-bold">{fmtPrice(selected.totalPrice)} сом</div>
                            </div>
                        </ModalBody>

                        {/* Calculator */}
                        <div className="px-6 py-4 border-t border-gray-800">
                            <h4 className="text-sm font-semibold text-white mb-3">🧮 Калькулятор стоимости</h4>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Площадь (м²)</label>
                                    <input type="number" value={calcArea} onChange={(e) => setCalcArea(e.target.value)} className={inputCls} />
                                </div>
                                <div className="text-center text-gray-500 pb-2">×</div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Цена за м²</label>
                                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-amber-400 text-sm">{fmtPrice(selected.pricePerSqm)}</div>
                                </div>
                                <div className="text-center text-gray-500 pb-2">=</div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Итого</label>
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-400 font-bold text-sm">{fmtPrice(Number(calcArea || 0) * selected.pricePerSqm)} сом</div>
                                </div>
                            </div>
                        </div>

                        {/* Layout Plan Section — admin only */}
                        {canUpload && (
                            <div className="px-6 py-4 border-t border-gray-800">
                                <h4 className="text-sm font-semibold text-white mb-3">🏗 Планировка квартиры</h4>
                                {selected.layoutPlanUrl ? (
                                    <div className="space-y-3">
                                        <img
                                            src={selected.layoutPlanUrl}
                                            alt={`Планировка №${selected.apartmentNumber}`}
                                            className="w-full rounded-lg border border-gray-700 max-h-64 object-contain bg-gray-800"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-emerald-400">✅ Планировка загружена</span>
                                            <button
                                                onClick={() => fileRef.current?.click()}
                                                className="text-xs text-amber-400 hover:text-amber-300 transition-colors ml-auto"
                                                disabled={uploading}
                                            >
                                                {uploading ? 'Загрузка...' : 'Заменить'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="w-full border-2 border-dashed border-gray-700 hover:border-amber-500/50 rounded-lg p-6 text-center transition-colors group"
                                        disabled={uploading}
                                    >
                                        <div className="text-3xl mb-2 opacity-40 group-hover:opacity-70">📁</div>
                                        <div className="text-sm text-gray-500 group-hover:text-gray-400">
                                            {uploading ? 'Загрузка...' : 'Нажмите чтобы загрузить планировку'}
                                        </div>
                                    </button>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file && selected) {
                                            handleLayoutUpload(selected.id, file)
                                        }
                                        e.target.value = ''
                                    }}
                                />
                            </div>
                        )}

                        {/* Show layout for non-admins if it exists */}
                        {!canUpload && selected.layoutPlanUrl && (
                            <div className="px-6 py-4 border-t border-gray-800">
                                <h4 className="text-sm font-semibold text-white mb-3">🏗 Планировка квартиры</h4>
                                <img
                                    src={selected.layoutPlanUrl}
                                    alt={`Планировка №${selected.apartmentNumber}`}
                                    className="w-full rounded-lg border border-gray-700 max-h-64 object-contain bg-gray-800"
                                />
                            </div>
                        )}

                        {selected.status === 'AVAILABLE' && (
                            <ModalFooter>
                                <button
                                    onClick={() => window.location.href = `/admin/bookings?apartmentId=${selected.id}`}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2.5 rounded-lg transition-colors"
                                >Забронировать эту квартиру</button>
                            </ModalFooter>
                        )}
                    </>
                )}
            </Modal>
        </div>
    )
}
