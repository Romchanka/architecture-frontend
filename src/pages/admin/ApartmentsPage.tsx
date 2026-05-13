import { useState, useMemo, useRef, useEffect } from 'react'
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

interface OccupantInfo {
    apartmentId: number
    status: string
    buyerFullName: string | null
    buyerPhone: string | null
    consultantFullName: string | null
    consultantPhone: string | null
    sourceType: 'BOOKING' | 'CONTRACT' | 'UNKNOWN'
}

const STATUS_MAP = APARTMENT_STATUS_MAP

/* ─── Цветовые классы ячеек шахматки по статусу ─── */
const CHESS_CELL_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/35 text-emerald-300',
    PREBOOKED: 'bg-yellow-500/20 border-yellow-500/40 hover:bg-yellow-500/35 text-yellow-300',
    BOOKED:    'bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/35 text-orange-300',
    SOLD:      'bg-gray-700/60 border-gray-600/40 hover:bg-gray-700/80 text-gray-500',
}

const CHESS_LEGEND = [
    { status: 'AVAILABLE', label: 'Свободна' },
    { status: 'PREBOOKED', label: 'Предбронь' },
    { status: 'BOOKED',    label: 'Забронирована' },
    { status: 'SOLD',      label: 'Продана' },
]

/* ─── Chess cell component ─── */
function ChessCell({ apt, onClick }: { apt: ApartmentRow; onClick: () => void }) {
    const colorCls = CHESS_CELL_COLORS[apt.status] ?? 'bg-gray-800 border-gray-700 text-gray-400'
    return (
        <button
            onClick={onClick}
            title={`№${apt.apartmentNumber} · ${apt.rooms}к · ${apt.areaTotal}м² · ${fmtPrice(apt.totalPrice)} сом`}
            className={`
                relative border rounded-md cursor-pointer transition-all duration-150
                flex flex-col items-center justify-center gap-0.5
                w-14 h-12 min-w-[56px] text-center select-none
                ${colorCls}
            `}
        >
            <span className="text-xs font-bold leading-tight">{apt.apartmentNumber}</span>
            <span className="text-[10px] leading-tight opacity-70">{apt.rooms}к · {apt.areaTotal}м²</span>
        </button>
    )
}

/* ─── Chess board view ─── */
function ChessBoard({ apartments, onSelect }: { apartments: ApartmentRow[]; onSelect: (a: ApartmentRow) => void }) {
    // Группируем по этажам, убывая сверху вниз
    const byFloor = useMemo(() => {
        const map = new Map<number, ApartmentRow[]>()
        apartments.forEach(a => {
            if (!map.has(a.floor)) map.set(a.floor, [])
            map.get(a.floor)!.push(a)
        })
        // Сортируем квартиры на этаже по номеру
        map.forEach((apts, floor) => {
            map.set(floor, [...apts].sort((a, b) => a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true })))
        })
        // Этажи по убыванию
        return [...map.entries()].sort(([a], [b]) => b - a)
    }, [apartments])

    if (byFloor.length === 0) {
        return <div className="text-center text-gray-600 py-16 text-sm">Квартиры не найдены</div>
    }

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
                {/* Строки этажей */}
                <div className="space-y-1.5">
                    {byFloor.map(([floor, apts]) => (
                        <div key={floor} className="flex items-center gap-2">
                            {/* Метка этажа */}
                            <div className="w-12 flex-shrink-0 text-right">
                                <span className="text-xs font-semibold text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">
                                    {floor}эт
                                </span>
                            </div>
                            {/* Ячейки квартир */}
                            <div className="flex flex-wrap gap-1">
                                {apts.map(apt => (
                                    <ChessCell
                                        key={apt.id}
                                        apt={apt}
                                        onClick={() => onSelect(apt)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Легенда */}
                <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-800">
                    {CHESS_LEGEND.map(({ status, label }) => {
                        const colorCls = CHESS_CELL_COLORS[status] ?? ''
                        return (
                            <div key={status} className="flex items-center gap-1.5">
                                <div className={`w-4 h-4 rounded border ${colorCls}`} />
                                <span className="text-xs text-gray-500">{label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

/* ─── Main page ─── */
export default function ApartmentsPage() {
    const employee = useAdmin()
    const canUpload = employee.userType === 'ADMIN' || employee.userType === 'SUPER_USER'
    const { data: apartments, loading, reload } = useApiData<ApartmentRow[]>('/apartments?size=700', [])

    const [statusFilter, setStatusFilter] = useState('')
    const [roomsFilter, setRoomsFilter] = useState('')
    const [floorFilter, setFloorFilter] = useState('')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<ApartmentRow | null>(null)
    const [calcArea, setCalcArea] = useState('')
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    // Переключатель вида
    const [viewMode, setViewMode] = useState<'table' | 'chess'>('table')

    // Покупатель / консультант для занятой квартиры
    const [occupant, setOccupant] = useState<OccupantInfo | null>(null)
    const [occupantLoading, setOccupantLoading] = useState(false)

    useEffect(() => {
        if (!selected || selected.status === 'AVAILABLE') {
            setOccupant(null)
            return
        }
        setOccupant(null)
        setOccupantLoading(true)
        api.get(`/apartments/${selected.id}/occupant`)
            .then(r => setOccupant(r.data))
            .catch(() => setOccupant(null))
            .finally(() => setOccupantLoading(false))
    }, [selected])

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

    // Stats for chess view header
    const stats = useMemo(() => {
        const available = filtered.filter(a => a.status === 'AVAILABLE').length
        const booked = filtered.filter(a => a.status === 'BOOKED' || a.status === 'PREBOOKED').length
        const sold = filtered.filter(a => a.status === 'SOLD').length
        return { available, booked, sold }
    }, [filtered])

    const handleLayoutUpload = async (apartmentId: number, file: File) => {
        setUploading(true)
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await api.post(`/files/upload/apartment-layout/${apartmentId}`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
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

            {/* Stats strip (chess mode) */}
            {viewMode === 'chess' && (
                <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                        <div className="w-3 h-3 rounded bg-emerald-500/60" />
                        <span className="text-xs text-emerald-400 font-medium">{stats.available} свободно</span>
                    </div>
                    <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                        <div className="w-3 h-3 rounded bg-orange-500/60" />
                        <span className="text-xs text-orange-400 font-medium">{stats.booked} в бронировании</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-700/30 border border-gray-700/40 rounded-lg px-3 py-2">
                        <div className="w-3 h-3 rounded bg-gray-600" />
                        <span className="text-xs text-gray-500 font-medium">{stats.sold} продано</span>
                    </div>
                </div>
            )}

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
                <div className="flex gap-2 items-center">
                    <button onClick={() => { setStatusFilter(''); setRoomsFilter(''); setFloorFilter(''); setSearch('') }} className="text-sm text-gray-500 hover:text-white transition-colors flex-1">Сбросить</button>
                    {/* View toggle */}
                    <div className="flex border border-gray-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('table')}
                            title="Таблица"
                            className={`px-2 py-1 text-sm transition-colors ${viewMode === 'table' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            ☰
                        </button>
                        <button
                            onClick={() => setViewMode('chess')}
                            title="Шахматка"
                            className={`px-2 py-1 text-sm transition-colors ${viewMode === 'chess' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            ⊞
                        </button>
                    </div>
                </div>
            </FilterBar>

            {/* Table or Chess */}
            {viewMode === 'table' ? (
                <AdminTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    rowKey={(a) => a.id}
                    onRowClick={(apt) => { setSelected(apt); setCalcArea(String(apt.areaTotal)) }}
                    emptyText="Квартиры не найдены"
                />
            ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                    {loading ? (
                        <div className="text-center py-16 text-gray-600 text-sm">Загрузка...</div>
                    ) : (
                        <ChessBoard
                            apartments={filtered}
                            onSelect={(apt) => { setSelected(apt); setCalcArea(String(apt.areaTotal)) }}
                        />
                    )}
                </div>
            )}

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

                        {/* Occupant contact card — only for non-available apartments */}
                        {selected.status !== 'AVAILABLE' && (
                            <div className="px-6 py-4 border-t border-gray-800">
                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    👥 Участники сделки
                                    {occupantLoading && <span className="text-xs text-gray-500 animate-pulse">загрузка...</span>}
                                </h4>
                                {occupant && !occupantLoading ? (
                                    <div className="space-y-2">
                                        {/* Покупатель */}
                                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Покупатель</span>
                                                <span className="text-xs text-gray-600">
                                                    {occupant.sourceType === 'CONTRACT' ? '📃 Договор' : '📋 Бронь'}
                                                </span>
                                            </div>
                                            {occupant.buyerFullName ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-white font-medium">{occupant.buyerFullName}</span>
                                                    {occupant.buyerPhone && (
                                                        <a
                                                            href={`tel:${occupant.buyerPhone}`}
                                                            className="text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors"
                                                        >
                                                            📞 {occupant.buyerPhone}
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">Данные не указаны</span>
                                            )}
                                        </div>

                                        {/* Консультант */}
                                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                                            <div className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-1">Консультант</div>
                                            {occupant.consultantFullName ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-white font-medium">{occupant.consultantFullName}</span>
                                                    {occupant.consultantPhone && (
                                                        <a
                                                            href={`tel:${occupant.consultantPhone}`}
                                                            className="text-xs text-purple-400 hover:text-purple-300 font-mono transition-colors"
                                                        >
                                                            📞 {occupant.consultantPhone}
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">Не назначен</span>
                                            )}
                                        </div>
                                    </div>
                                ) : !occupantLoading ? (
                                    <div className="text-xs text-gray-600 text-center py-2">Данные не найдены</div>
                                ) : null}
                            </div>
                        )}

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
