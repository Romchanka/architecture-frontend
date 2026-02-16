import { useState, useMemo } from 'react'
import { fmtPrice } from '@/lib/format'
import { PARKING_STATUS_MAP } from '@/lib/statusMaps'
import { useApiData } from '@/hooks/useApiData'
import {
    AdminTable, Column, PageHeader, FilterBar, StatusBadge, filterSelectCls,
} from '@/components/admin'

interface ParkingRow {
    id: number
    spaceNumber: string
    floor: number
    area: number
    price: number
    status: string
    type: string
    buildingId: number
    contractId: number | null
}

const STATUS_MAP = PARKING_STATUS_MAP

export default function ParkingPage() {
    const { data: spaces, loading } = useApiData<ParkingRow[]>('/parking-spaces?size=200', [])
    const [statusFilter, setStatusFilter] = useState('')

    const filtered = useMemo(() =>
        statusFilter ? spaces.filter((s) => s.status === statusFilter) : spaces,
        [spaces, statusFilter]
    )

    const columns: Column<ParkingRow>[] = [
        { header: 'Номер', render: (s) => <span className="text-sm text-white font-medium">{s.spaceNumber}</span> },
        { header: 'Этаж', render: (s) => <span className="text-sm text-gray-400">{s.floor}</span> },
        { header: 'Тип', render: (s) => <span className="text-sm text-gray-400">{s.type || '—'}</span> },
        { header: 'Цена', render: (s) => <span className="text-sm text-amber-400 font-mono font-bold">{fmtPrice(s.price)} сом</span> },
        { header: 'Статус', render: (s) => <StatusBadge status={s.status} colorMap={STATUS_MAP} /> },
        { header: 'Договор', render: (s) => <span className="text-sm text-gray-500">{s.contractId ? `#${s.contractId}` : '—'}</span> },
    ]

    return (
        <div>
            <PageHeader title="Парковочные места" count={filtered.length} countLabel="мест" />

            <FilterBar>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls}>
                    <option value="">Все статусы</option>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>
            </FilterBar>

            <AdminTable columns={columns} data={filtered} loading={loading} rowKey={(s) => s.id} emptyText="Парковочных мест не найдено" />
        </div>
    )
}
