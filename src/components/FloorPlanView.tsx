import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Apartment, Building } from '@/types'
import api from '@/lib/api'
import FloorPlanSVG from './FloorPlanSVG'

interface FloorPlanViewProps {
    apartments: Apartment[]
    buildings: Building[]
    companyId: number | null
    onApartmentClick?: (apartment: Apartment) => void
}

// Цвета статусов
const STATUS_COLORS: Record<string, { fill: string; fillHover: string; stroke: string; label: string; bg: string; text: string }> = {
    AVAILABLE: { fill: 'rgba(34, 197, 94, 0.25)', fillHover: 'rgba(34, 197, 94, 0.5)', stroke: '#22c55e', label: 'Свободна', bg: 'bg-green-500', text: '#4ade80' },
    PREBOOKED: { fill: 'rgba(245, 158, 11, 0.3)', fillHover: 'rgba(245, 158, 11, 0.55)', stroke: '#f59e0b', label: 'Предбронь', bg: 'bg-amber-500', text: '#fbbf24' },
    BOOKED: { fill: 'rgba(245, 158, 11, 0.3)', fillHover: 'rgba(245, 158, 11, 0.55)', stroke: '#f59e0b', label: 'Забронирована', bg: 'bg-amber-500', text: '#fbbf24' },
    INSTALLMENT: { fill: 'rgba(168, 85, 247, 0.3)', fillHover: 'rgba(168, 85, 247, 0.55)', stroke: '#a855f7', label: 'Рассрочка', bg: 'bg-purple-500', text: '#c084fc' },
    SOLD: { fill: 'rgba(239, 68, 68, 0.3)', fillHover: 'rgba(239, 68, 68, 0.55)', stroke: '#ef4444', label: 'Продана', bg: 'bg-red-500', text: '#f87171' },
}

// CDN URL планировок по типу квартиры (отдельная квартира наверху)
const LAYOUT_IMAGES: Record<number, string> = {
    1: 'https://static.tildacdn.one/tild6530-3966-4461-b963-316165353837/1_.webp',
    2: 'https://static.tildacdn.one/tild3435-6636-4230-b463-666661636236/2_.webp',
    3: 'https://static.tildacdn.one/tild3739-6435-4035-b466-373138303938/3_.webp',
}


export default function FloorPlanView({ apartments, buildings, companyId, onApartmentClick }: FloorPlanViewProps) {
    const navigate = useNavigate()
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(
        buildings.length > 0 ? buildings[0].id : null
    )
    const [selectedFloor, setSelectedFloor] = useState(2)
    const [hoveredApartment, setHoveredApartment] = useState<Apartment | null>(null)
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
    const [detailApartment, setDetailApartment] = useState<Apartment | null>(null)
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [bookingError, setBookingError] = useState<string | null>(null)


    const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)
    const totalFloors = selectedBuilding?.totalFloors || 16

    const buildingApartments = useMemo(
        () => apartments.filter(a => a.buildingId === selectedBuildingId),
        [apartments, selectedBuildingId]
    )

    const floorApartments = useMemo(
        () => buildingApartments
            .filter(a => a.floor === selectedFloor)
            .sort((a, b) => {
                const numA = parseInt(a.apartmentNumber.split('-')[1] || '0')
                const numB = parseInt(b.apartmentNumber.split('-')[1] || '0')
                return numA - numB
            }),
        [buildingApartments, selectedFloor]
    )

    const stats = useMemo(() => ({
        total: floorApartments.length,
        available: floorApartments.filter(a => a.status === 'AVAILABLE').length,
        booked: floorApartments.filter(a => a.status === 'BOOKED' || a.status === 'PREBOOKED').length,
        sold: floorApartments.filter(a => a.status === 'SOLD').length,
    }), [floorApartments])

    const availableFloors = useMemo(() => {
        const floors = [...new Set(buildingApartments.map(a => a.floor))].sort((a, b) => a - b)
        return floors.length > 0 ? floors : Array.from({ length: totalFloors - 1 }, (_, i) => i + 2)
    }, [buildingApartments, totalFloors])

    const handleBuildingChange = (buildingId: number) => {
        setSelectedBuildingId(buildingId)
        setSelectedFloor(2)
    }

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        setTooltipPos({ x: e.clientX + 16, y: e.clientY - 10 })
    }, [])



    const handleApartmentClick = useCallback((apt: Apartment) => {
        setDetailApartment(apt)
        setBookingStatus('idle')
        setBookingError(null)
        onApartmentClick?.(apt)
    }, [onApartmentClick])

    return (
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
            {/* Верхняя панель: статистика + легенда */}
            <div className="bg-slate-800/80 border-b border-slate-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{stats.total}</div>
                            <div className="text-xs text-slate-400">Всего</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{stats.available}</div>
                            <div className="text-xs text-slate-400">Свободно</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-amber-400">{stats.booked}</div>
                            <div className="text-xs text-slate-400">Бронь</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-400">{stats.sold}</div>
                            <div className="text-xs text-slate-400">Продано</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'PREBOOKED').map(([key, color]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <div className={`w-3 h-3 rounded-sm ${color.bg}`} />
                                <span className="text-xs text-slate-300">{color.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex">
                {/* Левая боковая панель: выбор этажа */}
                <div className="w-16 bg-slate-800/50 border-r border-slate-700/30 flex flex-col items-center py-3">
                    <div className="text-xs text-slate-500 mb-2 font-medium">Этаж</div>
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px] scrollbar-thin">
                        {availableFloors.slice().reverse().map(floor => (
                            <button
                                key={floor}
                                onClick={() => setSelectedFloor(floor)}
                                className={`w-10 h-8 rounded-md text-sm font-medium transition-all ${selectedFloor === floor
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                            >
                                {floor}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Основная область: схема блокирования */}
                <div className="flex-1 p-6" onMouseMove={handleMouseMove}>
                    {/* Заголовок */}
                    <div className="text-center mb-4">
                        <h3 className="text-xl text-slate-200 tracking-[0.3em] font-light">
                            С х е м а  б л о к и р о в а н и я
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {selectedBuilding?.name || 'Корпус А'} • ЖК Montana • {selectedFloor} этаж
                        </p>
                    </div>

                    {/* Выбор здания (если несколько) */}
                    {buildings.length > 1 && (
                        <div className="flex items-center justify-center gap-2 mb-4">
                            {buildings.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => handleBuildingChange(b.id)}
                                    className={`px-4 py-1.5 rounded-md text-sm transition-all ${selectedBuildingId === b.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-700/50 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {b.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Схема блокирования */}
                    {floorApartments.length === 0 ? (
                        <div className="flex items-center justify-center h-[400px] bg-slate-800/30 rounded-lg border border-slate-700/30">
                            <p className="text-slate-500 text-lg">На этом этаже нет квартир</p>
                        </div>
                    ) : (
                        <div className="rounded-lg overflow-hidden border border-slate-600/30" onMouseMove={handleMouseMove}>
                            <FloorPlanSVG
                                apartments={floorApartments}
                                hoveredApartment={hoveredApartment}
                                onApartmentHover={setHoveredApartment}
                                onApartmentClick={handleApartmentClick}
                                statusColors={STATUS_COLORS}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Тултип при наведении */}
            {hoveredApartment && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: 'translateY(-100%)',
                    }}
                >
                    <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
                        style={{ minWidth: '280px' }}>
                        {/* Мини-превью планировки */}
                        <div className="h-36 bg-slate-900 flex items-center justify-center overflow-hidden">
                            <img
                                src={LAYOUT_IMAGES[hoveredApartment.rooms] || LAYOUT_IMAGES[1]}
                                alt="Планировка"
                                className="h-full w-full object-contain object-top"
                                style={{
                                    filter: 'brightness(1.1)',
                                    objectPosition: 'center 25%',
                                }}
                            />
                        </div>

                        <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-semibold text-sm">
                                    Кв. {hoveredApartment.apartmentNumber}
                                </span>
                                <span
                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                    style={{
                                        backgroundColor: (STATUS_COLORS[hoveredApartment.status] || STATUS_COLORS.AVAILABLE).fill,
                                        color: (STATUS_COLORS[hoveredApartment.status] || STATUS_COLORS.AVAILABLE).text,
                                    }}
                                >
                                    {(STATUS_COLORS[hoveredApartment.status] || STATUS_COLORS.AVAILABLE).label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div className="text-slate-400">Комнат</div>
                                <div className="text-white font-medium">{hoveredApartment.rooms}</div>
                                <div className="text-slate-400">Площадь</div>
                                <div className="text-white font-medium">{hoveredApartment.areaTotal} м²</div>
                                <div className="text-slate-400">Этаж</div>
                                <div className="text-white font-medium">{hoveredApartment.floor}</div>
                                <div className="text-slate-400">Цена</div>
                                <div className="text-amber-400 font-semibold">
                                    {hoveredApartment.totalPrice?.toLocaleString('ru-RU')} сом
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно — подробная планировка */}
            {detailApartment && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setDetailApartment(null)}
                >
                    <div
                        className="relative bg-slate-900 rounded-2xl shadow-2xl border border-slate-600/50 max-w-3xl w-full mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Шапка */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <span className="text-white font-semibold">
                                    Кв. {detailApartment.apartmentNumber}
                                </span>
                                <span className="text-slate-400 text-sm">
                                    {detailApartment.rooms}-комн. • {detailApartment.areaTotal} м²
                                </span>
                                <span
                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                    style={{
                                        backgroundColor: (STATUS_COLORS[detailApartment.status] || STATUS_COLORS.AVAILABLE).fill,
                                        color: (STATUS_COLORS[detailApartment.status] || STATUS_COLORS.AVAILABLE).text,
                                    }}
                                >
                                    {(STATUS_COLORS[detailApartment.status] || STATUS_COLORS.AVAILABLE).label}
                                </span>
                            </div>
                            <button
                                onClick={() => { setDetailApartment(null); setBookingStatus('idle'); setBookingError(null) }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Изображение планировки */}
                        <div className="p-4 flex justify-center">
                            <img
                                src={LAYOUT_IMAGES[detailApartment.rooms] || LAYOUT_IMAGES[1]}
                                alt={`Планировка ${detailApartment.rooms}-комн. кв.`}
                                className="max-h-[70vh] w-auto object-contain rounded-lg"
                            />
                        </div>

                        {/* Кнопка Купить */}
                        <div className="flex flex-col items-center px-5 py-3 gap-2">
                            {detailApartment.status === 'AVAILABLE' && bookingStatus !== 'success' && (
                                <button
                                    disabled={bookingStatus === 'loading'}
                                    onClick={async () => {
                                        const token = localStorage.getItem('token')
                                        if (!token) {
                                            navigate('/login', { state: { from: window.location.pathname } })
                                            return
                                        }
                                        if (!companyId || !detailApartment) return
                                        setBookingStatus('loading')
                                        setBookingError(null)
                                        try {
                                            await api.post(`/marketplace/book?companyId=${companyId}&apartmentId=${detailApartment.id}`)
                                            setBookingStatus('success')
                                        } catch (err: any) {
                                            setBookingStatus('error')
                                            setBookingError(err.response?.data?.message || 'Ошибка бронирования')
                                        }
                                    }}
                                    className={`px-10 py-3 font-bold text-lg rounded-xl transition-all
                                        ${bookingStatus === 'loading'
                                            ? 'bg-slate-600 text-slate-400 cursor-wait'
                                            : 'bg-amber-500 hover:bg-amber-400 text-slate-900 hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0'
                                        }`}
                                >
                                    {bookingStatus === 'loading' ? 'Бронируем...' : 'Купить'}
                                </button>
                            )}
                            {bookingStatus === 'success' && (
                                <div className="text-green-400 font-semibold text-lg">✓ Заявка отправлена!</div>
                            )}
                            {bookingStatus === 'error' && bookingError && (
                                <div className="text-red-400 text-sm">{bookingError}</div>
                            )}
                        </div>

                        {/* Нижняя панель с ценой */}
                        <div className="px-5 py-3 border-t border-slate-700/50 flex items-center justify-between">
                            <div className="text-sm text-slate-400">
                                Этаж {detailApartment.floor} • {selectedBuilding?.name || 'Корпус А'}
                            </div>
                            <div className="text-lg font-bold text-amber-400">
                                {detailApartment.totalPrice?.toLocaleString('ru-RU')} сом
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
