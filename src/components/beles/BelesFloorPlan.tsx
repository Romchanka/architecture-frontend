import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react'
import { Apartment, Building } from '@/types'
import api from '@/lib/api'
import { useFloorPlanConfigs } from '@/hooks/useFloorPlanConfigs'
import AuthWarningModal from '../AuthWarningModal'
import './BelesFloorPlan.css'

// Zone interface — previously imported from belesGeometry.ts, now defined locally
export interface BelesZone {
    id: number
    points: string
    labelOffset: { x: number; y: number }
}

// ══════ Memoized Zone Polygon ══════
// Pure render — zero React state involvement on hover
interface ZonePolygonProps {
    zone: BelesZone
    apt: Apartment
    zoom: number
    onClick: (apt: Apartment) => void
}

const ZonePolygon = memo(function ZonePolygon({ zone, apt, zoom, onClick }: ZonePolygonProps) {
    const colors = STATUS_COLORS[apt.status] || STATUS_COLORS.AVAILABLE
    const isSoldOrInstallment = apt.status === 'SOLD' || (apt.status as string) === 'INSTALLMENT'

    return (
        <polygon
            className={`zone-polygon zone-${apt.status?.toLowerCase() || 'available'}`}
            data-zone-id={zone.id}
            data-apt-num={apt.apartmentNumber}
            data-apt-rooms={apt.rooms}
            data-apt-area={apt.areaTotal}
            data-apt-price={apt.totalPrice || ''}
            data-apt-status={apt.status}
            points={zone.points}
            fill={colors.fill}
            stroke={apt.status !== 'AVAILABLE' ? colors.stroke : 'rgba(255,255,255,0.12)'}
            strokeWidth={0.6 / zoom}
            strokeLinejoin="round"
            cursor={isSoldOrInstallment ? 'default' : 'pointer'}
            onClick={() => !isSoldOrInstallment && onClick(apt)}
        />
    )
})

// Floor plan backgrounds — default fallbacks (will be overridden by server config)
const FLOOR_BG_DEFAULT = '/floor-plan-typical.webp'

interface BelesFloorPlanProps {
    apartments: Apartment[]
    buildings: Building[]
    companyId: number | null
}

const STATUS_COLORS: Record<string, { fill: string; fillHover: string; stroke: string; label: string; text: string }> = {
    AVAILABLE:   { fill: 'rgba(34,197,94,0.22)',  fillHover: 'rgba(34,197,94,0.48)',  stroke: '#22c55e', label: 'Свободна',      text: '#4ade80' },
    PREBOOKED:   { fill: 'rgba(245,158,11,0.25)', fillHover: 'rgba(245,158,11,0.50)', stroke: '#f59e0b', label: 'Предбронь',     text: '#fbbf24' },
    BOOKED:      { fill: 'rgba(245,158,11,0.25)', fillHover: 'rgba(245,158,11,0.50)', stroke: '#f59e0b', label: 'Забронирована', text: '#fbbf24' },
    INSTALLMENT: { fill: 'rgba(168,85,247,0.25)',  fillHover: 'rgba(168,85,247,0.50)', stroke: '#a855f7', label: 'Рассрочка',     text: '#c084fc' },
    SOLD:        { fill: 'rgba(239,68,68,0.25)',   fillHover: 'rgba(239,68,68,0.50)',  stroke: '#ef4444', label: 'Продана',       text: '#f87171' },
}

const MIN_ZOOM = 1
const MAX_ZOOM = 6
const ZOOM_STEP = 0.15

export default function BelesFloorPlan({ apartments, buildings, companyId }: BelesFloorPlanProps) {
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(
        buildings.length > 0 ? buildings[0].id : null
    )
    const [selectedFloor, setSelectedFloor] = useState(2)
    const tooltipRef = useRef<HTMLDivElement>(null)
    const [detailApt, setDetailApt] = useState<Apartment | null>(null)
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [showAuthWarning, setShowAuthWarning] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const transformRef = useRef<HTMLDivElement>(null)

    // Pan/Zoom state
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const isPanning = useRef(false)
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

    const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)
    const totalFloors = selectedBuilding?.totalFloors || 23

    // ═══ Server-driven zones via useFloorPlanConfigs ═══
    const { getConfigForFloor } = useFloorPlanConfigs(
        companyId,
        selectedBuildingId
    )

    // Select zones, viewBox, and background based on floor — now from server
    const { floorZones, vbW, vbH, bgSrc } = useMemo(() => {
        const config = getConfigForFloor(selectedFloor)
        if (config && config.zones.length > 0) {
            return {
                floorZones: config.zones as BelesZone[],
                vbW: config.viewboxWidth,
                vbH: config.viewboxHeight,
                bgSrc: config.backgroundUrl || FLOOR_BG_DEFAULT,
            }
        }
        // No server config available — show empty (no hardcoded fallback)
        return { floorZones: [] as BelesZone[], vbW: 1615.75, vbH: 1162.2, bgSrc: FLOOR_BG_DEFAULT }
    }, [selectedFloor, getConfigForFloor])

    const floorApartments = useMemo(
        () => apartments
            .filter(a => a.buildingId === selectedBuildingId && a.floor === selectedFloor)
            .sort((a, b) => {
                // Extract sequence number: '201' → 1, '1234' → 34, 'X-01' → 1
                const getSeq = (s: string) => {
                    const dash = s.split('-')
                    if (dash.length > 1) return parseInt(dash[1] || '0')
                    // For format like '201': strip floor prefix, keep last 2 digits
                    return parseInt(s.slice(-2)) || 0
                }
                return getSeq(a.apartmentNumber) - getSeq(b.apartmentNumber)
            }),
        [apartments, selectedBuildingId, selectedFloor]
    )

    // Map zone index → apartment
    const zoneApartmentMap = useMemo(() => {
        const map = new Map<number, Apartment>()
        floorApartments.forEach((apt, idx) => {
            if (idx < floorZones.length) map.set(idx, apt)
        })
        return map
    }, [floorApartments, floorZones])

    // Stats
    const stats = useMemo(() => {
        const all = apartments.filter(a => a.buildingId === selectedBuildingId)
        return {
            total: all.length,
            available: all.filter(a => a.status === 'AVAILABLE').length,
            booked: all.filter(a => ['BOOKED', 'PREBOOKED'].includes(a.status)).length,
            sold: all.filter(a => a.status === 'SOLD' || (a.status as string) === 'INSTALLMENT').length,
        }
    }, [apartments, selectedBuildingId])

    // Tooltip element refs — pre-created, only textContent changes
    const tipNumRef = useRef<HTMLSpanElement>(null)
    const tipStatusRef = useRef<HTMLSpanElement>(null)
    const tipRoomsRef = useRef<HTMLSpanElement>(null)
    const tipAreaRef = useRef<HTMLSpanElement>(null)
    const tipPriceRef = useRef<HTMLSpanElement>(null)
    const tipPriceRowRef = useRef<HTMLDivElement>(null)

    // Show tooltip via DOM — zero React re-renders, zero DOM allocation
    const showTooltip = useCallback((el: SVGPolygonElement) => {
        const tip = tooltipRef.current
        if (!tip) return
        const status = el.dataset.aptStatus || 'AVAILABLE'
        const colors = STATUS_COLORS[status] || STATUS_COLORS.AVAILABLE
        if (tipNumRef.current) tipNumRef.current.textContent = `Кв. ${el.dataset.aptNum || ''}`
        if (tipStatusRef.current) {
            tipStatusRef.current.textContent = colors.label
            tipStatusRef.current.style.color = colors.text
        }
        if (tipRoomsRef.current) tipRoomsRef.current.textContent = el.dataset.aptRooms || ''
        if (tipAreaRef.current) tipAreaRef.current.textContent = `${el.dataset.aptArea || ''} м²`
        const price = el.dataset.aptPrice
        if (tipPriceRowRef.current) {
            tipPriceRowRef.current.style.display = price ? '' : 'none'
        }
        if (tipPriceRef.current && price) {
            tipPriceRef.current.textContent = `${Number(price).toLocaleString()} сом`
        }
        tip.style.display = 'block'
    }, [])

    const hideTooltip = useCallback(() => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none'
    }, [])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        // Update tooltip position via ref — no re-render!
        if (tooltipRef.current && tooltipRef.current.style.display === 'block') {
            tooltipRef.current.style.left = `${e.clientX + 16}px`
            tooltipRef.current.style.top = `${e.clientY - 10}px`
        }
        // Handle panning
        if (isPanning.current) {
            const dx = e.clientX - panStart.current.x
            const dy = e.clientY - panStart.current.y
            const container = containerRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            // Convert screen px to content units
            const scaleX = vbW / rect.width
            const scaleY = vbH / rect.height
            setPan({
                x: panStart.current.panX - dx * scaleX / zoom,
                y: panStart.current.panY - dy * scaleY / zoom
            })
        }
    }, [zoom, vbW, vbH])

    // Wheel zoom — zooms toward cursor position
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        // Cursor position as fraction of container
        const frac = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
        const curVbW = vbW / zoom
        const curVbH = vbH / zoom
        const cursorVB = { x: pan.x + frac.x * curVbW, y: pan.y + frac.y * curVbH }

        const delta = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 / (1 + ZOOM_STEP)
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta))
        const newVbW = vbW / newZoom
        const newVbH = vbH / newZoom
        // Keep cursor position fixed
        const newPanX = cursorVB.x - frac.x * newVbW
        const newPanY = cursorVB.y - frac.y * newVbH
        // Clamp pan
        setPan({
            x: Math.max(0, Math.min(vbW - newVbW, newPanX)),
            y: Math.max(0, Math.min(vbH - newVbH, newPanY))
        })
        setZoom(newZoom)
    }, [zoom, pan, vbW, vbH])

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return
        isPanning.current = true
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    }, [pan])

    const handleMouseUp = useCallback(() => {
        isPanning.current = false
    }, [])

    const handleResetZoom = useCallback(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [])

    const handleZoomIn = useCallback(() => {
        setZoom(z => Math.min(MAX_ZOOM, z * (1 + ZOOM_STEP * 2)))
    }, [])

    const handleZoomOut = useCallback(() => {
        const newZoom = Math.max(MIN_ZOOM, zoom / (1 + ZOOM_STEP * 2))
        const newVbW = vbW / newZoom
        const newVbH = vbH / newZoom
        setPan(p => ({
            x: Math.max(0, Math.min(vbW - newVbW, p.x)),
            y: Math.max(0, Math.min(vbH - newVbH, p.y))
        }))
        setZoom(newZoom)
    }, [zoom, vbW, vbH])

    // Compute CSS transform for GPU-accelerated zoom/pan
    const transformStyle = useMemo(() => {
        return {
            transform: `scale(${zoom}) translate(${-pan.x}px, ${-pan.y}px)`,
            transformOrigin: '0 0',
        } as React.CSSProperties
    }, [zoom, pan])

    const handleApartmentClick = useCallback((apt: Apartment) => {
        if (apt.status === 'SOLD' || (apt.status as string) === 'INSTALLMENT') return
        setDetailApt(apt)
        setBookingStatus('idle')
    }, [])

    const handleBook = async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            setShowAuthWarning(true)
            return
        }
        if (!detailApt || !companyId) return
        setBookingStatus('loading')
        try {
            await api.post(`/marketplace/companies/${companyId}/apartments/${detailApt.id}/book`)
            setBookingStatus('success')
        } catch {
            setBookingStatus('error')
        }
    }

    // Update building selection when buildings change
    useEffect(() => {
        if (buildings.length > 0 && !selectedBuildingId) {
            setSelectedBuildingId(buildings[0].id)
        }
    }, [buildings])

    // Reset zoom/pan when floor changes (different floors have different viewBox)
    useEffect(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [selectedFloor])

    // Native DOM event delegation for tooltip — ZERO React re-renders
    const overlayRef = useRef<SVGSVGElement>(null)
    useEffect(() => {
        const svg = overlayRef.current
        if (!svg) return
        const onOver = (e: MouseEvent) => {
            const poly = (e.target as Element).closest('polygon[data-apt-num]') as SVGPolygonElement | null
            if (poly) showTooltip(poly)
        }
        const onOut = (e: MouseEvent) => {
            const poly = (e.target as Element).closest('polygon[data-apt-num]') as SVGPolygonElement | null
            if (poly) {
                const related = (e as any).relatedTarget as Element | null
                if (!related || !poly.contains(related)) hideTooltip()
            }
        }
        svg.addEventListener('mouseover', onOver)
        svg.addEventListener('mouseout', onOut)
        return () => {
            svg.removeEventListener('mouseover', onOver)
            svg.removeEventListener('mouseout', onOut)
        }
    }, [showTooltip, hideTooltip])

    return (
        <div className="beles-floor-plan">
            {/* ═══ Header Stats ═══ */}
            <div className="beles-header">
                <div className="beles-title-row">
                    <h2>Схема блокирования</h2>
                    <span className="beles-subtitle">
                        Белес Резиденс • {selectedFloor} этаж • Типовой (2–{totalFloors})
                    </span>
                </div>
                <div className="beles-stats">
                    <div className="stat-item">
                        <span className="stat-num">{stats.total}</span>
                        <span className="stat-label">Всего</span>
                    </div>
                    <div className="stat-item available">
                        <span className="stat-dot" style={{ background: '#22c55e' }} />
                        <span className="stat-num">{stats.available}</span>
                        <span className="stat-label">Свободно</span>
                    </div>
                    <div className="stat-item booked">
                        <span className="stat-dot" style={{ background: '#f59e0b' }} />
                        <span className="stat-num">{stats.booked}</span>
                        <span className="stat-label">Бронь</span>
                    </div>
                    <div className="stat-item sold">
                        <span className="stat-dot" style={{ background: '#ef4444' }} />
                        <span className="stat-num">{stats.sold}</span>
                        <span className="stat-label">Продано</span>
                    </div>
                </div>
            </div>

            {/* ═══ Main Area: Floor Selector + Plan ═══ */}
            <div className="beles-main">
                {/* Floor selector */}
                <div className="beles-floor-selector">
                    <span className="floor-label">Этаж</span>
                    {Array.from({ length: totalFloors - 1 }, (_, i) => totalFloors - i).map(floor => (
                        <button
                            key={floor}
                            className={`floor-btn ${floor === selectedFloor ? 'active' : ''}`}
                            onClick={() => setSelectedFloor(floor)}
                        >
                            {floor}
                        </button>
                    ))}
                </div>

                {/* SVG Floor Plan */}
                <div
                    ref={containerRef}
                    className="beles-plan-container"
                    onMouseMove={handleMouseMove}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Zoom controls */}
                    <div className="beles-zoom-controls">
                        <button className="zoom-btn" onClick={handleZoomIn} title="Приблизить">+</button>
                        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                        <button className="zoom-btn" onClick={handleZoomOut} title="Отдалить">−</button>
                        <button className="zoom-btn zoom-reset" onClick={handleResetZoom} title="Сброс">⟲</button>
                    </div>

                    {/* Zoom/pan wrapper — GPU-accelerated via CSS transform */}
                    <div
                        ref={transformRef}
                        className="beles-plan-transform"
                        style={{
                            ...transformStyle,
                            cursor: zoom > 1 ? (isPanning.current ? 'grabbing' : 'grab') : 'default'
                        }}
                    >
                        {/* Background: rasterized PNG for typical floors, SVG for upper */}
                        <img
                            src={bgSrc}
                            className="beles-plan-bg"
                            alt="Floor plan"
                            draggable={false}
                        />

                        {/* Lightweight SVG overlay — only polygons */}
                        <svg
                            ref={overlayRef}
                            className="beles-plan-overlay"
                            viewBox={`0 0 ${vbW} ${vbH}`}
                            preserveAspectRatio="xMidYMid meet"
                        >

                        {/* Apartment zone polygons — each memoized independently */}
                        {floorZones.map(zone => {
                            const apt = zoneApartmentMap.get(zone.id)
                            if (!apt) return null
                            return (
                                <ZonePolygon
                                    key={zone.id}
                                    zone={zone}
                                    apt={apt}
                                    zoom={zoom}
                                    onClick={handleApartmentClick}
                                />
                            )
                        })}
                        </svg>
                    </div>

                    {/* Tooltip — static DOM structure, only textContent updates */}
                    <div
                        ref={tooltipRef}
                        className="beles-tooltip"
                        style={{ display: 'none' }}
                    >
                        <div className="tooltip-header">
                            <span ref={tipNumRef} className="tooltip-apt" />
                            <span ref={tipStatusRef} className="tooltip-status" />
                        </div>
                        <div className="tooltip-body">
                            <div><span>Комнат</span><span ref={tipRoomsRef} /></div>
                            <div><span>Площадь</span><span ref={tipAreaRef} /></div>
                            <div ref={tipPriceRowRef}><span>Цена</span><span ref={tipPriceRef} /></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Detail / Booking Modal ═══ */}
            {detailApt && (
                <div className="beles-modal-backdrop" onClick={() => setDetailApt(null)}>
                    <div className="beles-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setDetailApt(null)}>✕</button>
                        <h3>Квартира {detailApt.apartmentNumber}</h3>
                        <div className="modal-info">
                            <div><span>Этаж:</span> {detailApt.floor}</div>
                            <div><span>Комнат:</span> {detailApt.rooms}</div>
                            <div><span>Площадь:</span> {detailApt.areaTotal} м²</div>
                            {detailApt.totalPrice && <div><span>Цена:</span> {detailApt.totalPrice.toLocaleString()} сом</div>}
                            <div>
                                <span>Статус:</span>{' '}
                                <span style={{ color: (STATUS_COLORS[detailApt.status] || STATUS_COLORS.AVAILABLE).text }}>
                                    {(STATUS_COLORS[detailApt.status] || STATUS_COLORS.AVAILABLE).label}
                                </span>
                            </div>
                        </div>
                        {detailApt.status === 'AVAILABLE' && (
                            <button
                                className="modal-book-btn"
                                onClick={handleBook}
                                disabled={bookingStatus === 'loading'}
                            >
                                {bookingStatus === 'loading' ? 'Бронирование...' :
                                 bookingStatus === 'success' ? '✓ Забронировано!' :
                                 bookingStatus === 'error' ? 'Ошибка — попробуйте снова' :
                                 'Забронировать'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <AuthWarningModal 
                isOpen={showAuthWarning} 
                onClose={() => setShowAuthWarning(false)} 
            />
        </div>
    )
}
