import { useState, useMemo, useEffect } from 'react'
import { fmtPrice } from '@/lib/format'
import { PARKING_STATUS_MAP } from '@/lib/statusMaps'
import { useApiData } from '@/hooks/useApiData'
import api from '@/lib/api'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge, filterSelectCls,
    Modal, ModalBody
} from '@/components/admin'

interface ParkingRow {
    id: number
    number: string
    level: string
    area: number
    price: number
    status: string
    notes: string
    buildingId: number
    contractId: number | null
}

const STATUS_MAP = PARKING_STATUS_MAP

/* ─── Цветовые классы ячеек шахматки по статусу ─── */
const CHESS_CELL_COLORS: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/35 text-emerald-300',
    BOOKED:    'bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/35 text-orange-300',
    SOLD:      'bg-gray-700/60 border-gray-600/40 hover:bg-gray-700/80 text-gray-500',
}

const CHESS_LEGEND = [
    { status: 'AVAILABLE', label: 'Свободна' },
    { status: 'BOOKED',    label: 'Забронирована' },
    { status: 'SOLD',      label: 'Продана' },
]

function ChessCell({ space, onClick }: { space: ParkingRow; onClick: () => void }) {
    const colorCls = CHESS_CELL_COLORS[space.status] ?? 'bg-gray-800 border-gray-700 text-gray-400'
    return (
        <button
            onClick={onClick}
            title={`№${space.number} · ${space.level} ур. · ${fmtPrice(space.price)} сом`}
            className={`
                relative border rounded-md cursor-pointer transition-all duration-150
                flex flex-col items-center justify-center gap-0.5
                w-16 h-12 min-w-[64px] text-center select-none
                ${colorCls}
            `}
        >
            <span className="text-xs font-bold leading-tight">{space.number}</span>
            <span className="text-[10px] leading-tight opacity-70">{fmtPrice(space.price)} с</span>
        </button>
    )
}

function ChessBoard({ spaces, onSelect }: { spaces: ParkingRow[]; onSelect: (s: ParkingRow) => void }) {
    // Группируем по уровням
    const byLevel = useMemo(() => {
        const map = new Map<string, ParkingRow[]>()
        spaces.forEach(s => {
            const lvl = s.level || '—'
            if (!map.has(lvl)) map.set(lvl, [])
            map.get(lvl)!.push(s)
        })
        // Сортируем места на уровне по номеру
        map.forEach((sps, lvl) => {
            map.set(lvl, [...sps].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })))
        })
        // Уровни
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    }, [spaces])

    if (byLevel.length === 0) {
        return <div className="text-center text-gray-600 py-16 text-sm">Парковочные места не найдены</div>
    }

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
                <div className="space-y-3">
                    {byLevel.map(([level, sps]) => (
                        <div key={level} className="flex items-start gap-3">
                            <div className="w-16 flex-shrink-0 text-right pt-2">
                                <span className="text-xs font-semibold text-gray-500 bg-gray-900 px-2 py-1 rounded">
                                    Ур. {level}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {sps.map(s => (
                                    <ChessCell key={s.id} space={s} onClick={() => onSelect(s)} />
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

export default function ParkingPage() {
    const { data: spaces, loading } = useApiData<ParkingRow[]>('/parking-spaces?size=200', [])
    const [statusFilter, setStatusFilter] = useState('')
    const [viewMode, setViewMode] = useState<'table' | 'chess'>('chess')
    const [selected, setSelected] = useState<ParkingRow | null>(null)
    const [occupant, setOccupant] = useState<any>(null)
    const [occupantLoading, setOccupantLoading] = useState(false)

    useEffect(() => {
        if (!selected) {
            setOccupant(null)
            return
        }
        
        if (selected.status === 'SOLD' && selected.contractId) {
            setOccupantLoading(true)
            api.get(`/contracts/${selected.contractId}`)
                .then(r => setOccupant({ ...r.data, sourceType: 'CONTRACT' }))
                .catch(() => setOccupant(null))
                .finally(() => setOccupantLoading(false))
        } else if (selected.status === 'BOOKED' || selected.status === 'PREBOOKED') {
            setOccupantLoading(true)
            api.get(`/bookings?size=500&status=ACTIVE`)
                .then(r => {
                    const booking = r.data.content.find((b: any) => b.parkingSpaceId === selected.id)
                    if (booking) {
                        setOccupant({
                            ...booking,
                            sourceType: 'BOOKING',
                            buyer: { firstName: booking.userName || '', lastName: '', phone: booking.userPhone },
                            consultant: { firstName: booking.consultantName || '', lastName: '' }
                        })
                    } else {
                        setOccupant(null)
                    }
                })
                .catch(() => setOccupant(null))
                .finally(() => setOccupantLoading(false))
        } else {
            setOccupant(null)
        }
    }, [selected])

    const filtered = useMemo(() =>
        statusFilter ? spaces.filter((s) => s.status === statusFilter) : spaces,
        [spaces, statusFilter]
    )

    const columns: Column<ParkingRow>[] = [
        { header: 'Номер', render: (s) => <span className="text-sm text-white font-medium">{s.number}</span> },
        { header: 'Уровень', render: (s) => <span className="text-sm text-gray-400">{s.level || '—'}</span> },
        { header: 'Заметка', render: (s) => <span className="text-sm text-gray-400">{s.notes || '—'}</span> },
        { header: 'Цена', render: (s) => <span className="text-sm text-amber-400 font-mono font-bold">{fmtPrice(s.price)} сом</span> },
        { header: 'Статус', render: (s) => <StatusBadge status={s.status} colorMap={STATUS_MAP} /> },
        { header: 'Договор', render: (s) => <span className="text-sm text-gray-500">{s.contractId ? `#${s.contractId}` : '—'}</span> },
    ]

    return (
        <div>
            <PageHeader title="Парковочные места" count={filtered.length} countLabel={`из ${spaces.length} мест`} />

            <FilterBar className="flex gap-4">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls + " w-48"}>
                    <option value="">Все статусы</option>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>
                <div className="flex-1" />
                <div className="flex border border-gray-700 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setViewMode('table')}
                        title="Таблица"
                        className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'table' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        ☰
                    </button>
                    <button
                        onClick={() => setViewMode('chess')}
                        title="Шахматка"
                        className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'chess' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        ⊞
                    </button>
                </div>
            </FilterBar>

            {viewMode === 'table' ? (
                <AdminTable columns={columns} data={filtered} loading={loading} rowKey={(s) => s.id} onRowClick={(s) => setSelected(s)} emptyText="Парковочных мест не найдено" />
            ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                    {loading ? (
                        <div className="text-center py-16 text-gray-600 text-sm">Загрузка...</div>
                    ) : (
                        <ChessBoard spaces={filtered} onSelect={(s) => setSelected(s)} />
                    )}
                </div>
            )}

            {/* Detail Modal */}
            <Modal open={!!selected} onClose={() => setSelected(null)} title={`Парковка №${selected?.number || ''}`} width="max-w-md">
                {selected && (
                    <>
                        <ModalBody>
                            <div className="flex items-center gap-2 mb-4">
                                <StatusBadge status={selected.status} colorMap={STATUS_MAP} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <div className="text-xs text-gray-500">Уровень</div>
                                    <div className="text-lg text-white font-bold">{selected.level}</div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <div className="text-xs text-gray-500">Площадь</div>
                                    <div className="text-lg text-white font-bold">{selected.area} м²</div>
                                </div>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                <div className="text-xs text-amber-400">Стоимость</div>
                                <div className="text-2xl text-amber-400 font-bold">{fmtPrice(selected.price)} сом</div>
                            </div>
                        </ModalBody>

                        {/* Occupant contact card — for booked/sold */}
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
                                                    {occupant.sourceType === 'CONTRACT' ? `Договор #${occupant.contractNumber || selected.contractId}` : `Бронь #${occupant.id}`} от {new Date(occupant.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {occupant.buyer ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-white font-medium">{occupant.buyer.lastName} {occupant.buyer.firstName}</span>
                                                    {occupant.buyer.phone && (
                                                        <a
                                                            href={`tel:${occupant.buyer.phone}`}
                                                            className="text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors"
                                                        >
                                                            📞 {occupant.buyer.phone}
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
                                            {occupant.consultant ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-white font-medium">{occupant.consultant.lastName} {occupant.consultant.firstName}</span>
                                                    {occupant.consultant.phone && (
                                                        <a
                                                            href={`tel:${occupant.consultant.phone}`}
                                                            className="text-xs text-purple-400 hover:text-purple-300 font-mono transition-colors"
                                                        >
                                                            📞 {occupant.consultant.phone}
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">Не назначен / Системный</span>
                                            )}
                                        </div>
                                    </div>
                                ) : !occupantLoading ? (
                                    <div className="text-xs text-gray-600 text-center py-2">Данные договора не найдены</div>
                                ) : null}
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    )
}
