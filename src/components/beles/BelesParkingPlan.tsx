import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react'

import api from '@/lib/api'
import { useFloorPlanConfigs } from '@/hooks/useFloorPlanConfigs'
import './BelesFloorPlan.css' // Reuse the same CSS since layout is identical

interface BelesParkingPlanProps {
    parkingSpaces: any[] // Should be ParkingSpaceType
    selectedBuildingId: number
    companyId?: number | null
    onSpaceClick?: (space: any) => void
    highlightedSpaceId?: number | null
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.2

export const BelesParkingPlan: React.FC<BelesParkingPlanProps> = ({
    parkingSpaces,
    selectedBuildingId,
    companyId = 1,
    onSpaceClick,
    highlightedSpaceId
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const overlayRef = useRef<SVGSVGElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Pan/Zoom state
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const isPanning = useRef(false)
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

    const [selectedLevel, setSelectedLevel] = useState('-1')
    const [selectedSpace, setSelectedSpace] = useState<any | null>(null)
    const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const { configs, loading } = useFloorPlanConfigs(companyId, selectedBuildingId)

    const floorType = selectedLevel === '-1' ? 'PARKING_L1' : 'PARKING_L2'
    const currentConfig = useMemo(() => configs.find(c => c.floorType === floorType), [configs, floorType])

    const activeZones = useMemo(() => {
        if (!currentConfig || !currentConfig.zonesData) return []
        try {
            const data = JSON.parse(currentConfig.zonesData)
            return data.zones.map((z: any) => ({
                id: z.id,
                label: z.label,
                points: z.points,
                labelX: z.labelOffset.x,
                labelY: z.labelOffset.y,
            }))
        } catch (e) {
            return []
        }
    }, [currentConfig])

    const bgSrc = selectedLevel === '-1' ? '/parking-plan-2.webp' : '/parking-plan.webp'
    const vbW = currentConfig?.viewboxWidth || 2872.44
    const vbH = currentConfig?.viewboxHeight || 1549.60

    // Filter spaces for this building and selected level
    const relevantSpaces = useMemo(
        () => parkingSpaces.filter(p => p.buildingId === selectedBuildingId && p.level === selectedLevel),
        [parkingSpaces, selectedBuildingId, selectedLevel]
    )

    const stats = useMemo(() => {
        return relevantSpaces.reduce((acc, s) => {
            if (s.status === 'AVAILABLE') acc.available++
            else if (s.status === 'BOOKED' || s.status === 'PREBOOKED') acc.booked++
            else acc.sold++
            acc.total++
            return acc
        }, { total: 0, available: 0, booked: 0, sold: 0 })
    }, [relevantSpaces])

    // Map geometry label to parking space
    const zoneSpaceMap = useMemo(() => {
        const map = new Map<string, any>()
        relevantSpaces.forEach(space => {
            map.set(space.number, space)
        })
        return map
    }, [relevantSpaces])

    // Tooltip refs
    const tipNumRef = useRef<HTMLSpanElement>(null)
    const tipStatusRef = useRef<HTMLSpanElement>(null)
    const tipAreaRef = useRef<HTMLSpanElement>(null)
    const tipPriceRowRef = useRef<HTMLDivElement>(null)
    const tipPriceRef = useRef<HTMLSpanElement>(null)

    const showTooltip = useCallback((_e: React.MouseEvent, space: any) => {
        const tip = tooltipRef.current
        if (!tip || !space) return

        let titleStr = `Паркинг ${space.number}`
        const numMatch = space.number.match(/\d+$/)
        if (numMatch) {
             const num = parseInt(numMatch[0])
             titleStr += (num % 2 !== 0 ? ' (лев)' : ' (прав)')
        }
        if (tipNumRef.current) tipNumRef.current.textContent = titleStr
        
        let statusText = 'Свободно'
        let statusColor = '#4caf50'
        if (space.status === 'BOOKED' || space.status === 'PREBOOKED') {
            statusText = 'Бронь'
            statusColor = '#ff9800'
        } else if (space.status === 'SOLD' || space.status === 'INSTALLMENT') {
            statusText = 'Продано'
            statusColor = '#f44336'
        }

        if (tipStatusRef.current) {
            tipStatusRef.current.textContent = statusText
            tipStatusRef.current.style.color = statusColor
        }

        if (tipAreaRef.current) tipAreaRef.current.textContent = `${space.area || 0} м²`
        
        const price = space.price
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
        if (tooltipRef.current && tooltipRef.current.style.display === 'block') {
            tooltipRef.current.style.left = `${e.clientX + 16}px`
            tooltipRef.current.style.top = `${e.clientY - 10}px`
        }
        if (isPanning.current) {
            const dx = e.clientX - panStart.current.x
            const dy = e.clientY - panStart.current.y
            const container = containerRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            const scaleX = vbW / rect.width
            const scaleY = vbH / rect.height
            setPan({
                x: panStart.current.panX - dx * scaleX / zoom,
                y: panStart.current.panY - dy * scaleY / zoom
            })
        }
    }, [zoom, vbW, vbH])

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault()
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const frac = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
        const curVbW = vbW / zoom
        const curVbH = vbH / zoom
        const cursorVB = { x: pan.x + frac.x * curVbW, y: pan.y + frac.y * curVbH }

        const delta = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 / (1 + ZOOM_STEP)
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta))
        const newVbW = vbW / newZoom
        const newVbH = vbH / newZoom
        const newPanX = cursorVB.x - frac.x * newVbW
        const newPanY = cursorVB.y - frac.y * newVbH
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

    const transformStyle = useMemo(() => {
        return {
            transform: `scale(${zoom}) translate(${-pan.x}px, ${-pan.y}px)`,
            transformOrigin: '0 0',
        } as React.CSSProperties
    }, [zoom, pan])

    useEffect(() => {
        const container = containerRef.current
        if (container) {
            container.addEventListener('wheel', handleWheel as unknown as EventListener, { passive: false })
        }
        return () => {
            if (container) container.removeEventListener('wheel', handleWheel as unknown as EventListener)
        }
    }, [handleWheel])

    const getColors = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return { fill: 'rgba(76, 175, 80, 0.4)', stroke: 'rgba(76, 175, 80, 0.8)', label: 'Свободно', text: '#4ade80' }
            case 'BOOKED':
            case 'PREBOOKED': return { fill: 'rgba(255, 152, 0, 0.4)', stroke: 'rgba(255, 152, 0, 0.8)', label: 'Бронь', text: '#fbbf24' }
            case 'SOLD':
            case 'INSTALLMENT': return { fill: 'rgba(244, 67, 54, 0.4)', stroke: 'rgba(244, 67, 54, 0.8)', label: 'Продано', text: '#f87171' }
            default: return { fill: 'rgba(158, 158, 158, 0.2)', stroke: 'rgba(158, 158, 158, 0.4)', label: 'Неизвестно', text: '#94a3b8' }
        }
    }

    const handleSpaceClick = useCallback((space: any) => {
        if (space.status === 'SOLD' || space.status === 'INSTALLMENT') return
        setSelectedSpace(space)
        setBookingStatus('idle')
        onSpaceClick?.(space)
    }, [onSpaceClick])

    const handleBookParking = async () => {
        if (!selectedSpace || !companyId) return
        setBookingStatus('loading')
        try {
            await api.post(`/marketplace/companies/${companyId}/parking-spaces/${selectedSpace.id}/book`)
            setBookingStatus('success')
        } catch {
            setBookingStatus('error')
        }
    }

    return (
        <div className="beles-floor-plan">
            {/* --- Header Stats --- */}
            <div className="beles-header">
                <div className="beles-title-row">
                    <h2>Подземный паркинг</h2>
                    <span className="beles-subtitle">
                        План парковки (Уровень {selectedLevel})
                        {loading ? ' (Загрузка...)' : ''}
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

            {/* --- Tools row --- */}
            <div className="beles-toolbar">
                <div className="level-switcher">
                    <button 
                        className={`level-btn ${selectedLevel === '-1' ? 'active' : ''}`}
                        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedLevel('-1') }}
                    >
                        -1 Этаж
                    </button>
                    <button 
                        className={`level-btn ${selectedLevel === '-2' ? 'active' : ''}`}
                        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedLevel('-2') }}
                    >
                        -2 Этаж
                    </button>
                </div>
                <div className="zoom-controls">
                    <button onClick={() => setZoom(Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}>-</button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}>+</button>
                    <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
                </div>
            </div>

            {/* --- SVG Viewport --- */}
            <div className="beles-viewport"
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div className="svg-container" style={transformStyle}>
                    {/* Background Floor Plan */}
                    <img 
                        src={bgSrc} 
                        alt="Beles Parking Plan" 
                        className="beles-bg-image"
                        draggable={false}
                    />
                    
                    {/* Interactive Zones */}
                    <svg 
                        ref={overlayRef}
                        className="beles-svg-overlay" 
                        viewBox={`0 0 ${vbW} ${vbH}`} 
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {activeZones.map((zone: any) => {
                            const space = zoneSpaceMap.get(zone.label)
                            const isReserved = space && space.status !== 'AVAILABLE'
                            const isHighlighted = highlightedSpaceId === space?.id
                            const colors = getColors(space?.status || 'UNKNOWN')
                            
                            if (!space) {
                                return (
                                    <g key={zone.label} className="zone-group empty">
                                        <polygon points={zone.points} fill="rgba(0,0,0,0.1)" stroke="rgba(255,255,255,0.2)" />
                                    </g>
                                )
                            }

                            return (
                                <g 
                                    key={zone.label} 
                                    className={`zone-group ${isReserved ? 'reserved' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                                    onClick={() => handleSpaceClick(space)}
                                    onMouseEnter={(e) => showTooltip(e, space)}
                                    onMouseLeave={hideTooltip}
                                >
                                    <polygon 
                                        points={zone.points}
                                        fill={colors.fill}
                                        stroke={colors.stroke}
                                        strokeWidth={isHighlighted ? "4" : "1.5"}
                                    />
                                    <text 
                                        x={zone.labelX} 
                                        y={zone.labelY} 
                                        className="zone-label"
                                    >
                                        {zone.label.split('-')[1]}
                                    </text>
                                </g>
                            )
                        })}
                    </svg>
                </div>

                {/* Custom Tooltip */}
                <div ref={tooltipRef} className="beles-tooltip">
                    <div className="tooltip-title">
                        <span ref={tipNumRef} className="font-bold"></span>
                        <span ref={tipStatusRef} className="status-badge"></span>
                    </div>
                    <div className="tooltip-details">
                        <div className="detail-row">
                            <span>Площадь</span>
                            <span ref={tipAreaRef} className="font-medium"></span>
                        </div>
                        <div className="detail-row" ref={tipPriceRowRef}>
                            <span>Цена</span>
                            <span ref={tipPriceRef} className="font-medium"></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Detail / Booking Modal ═══ */}
            {selectedSpace && (
                <div className="beles-modal-backdrop" onClick={() => setSelectedSpace(null)}>
                    <div className="beles-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedSpace(null)}>✕</button>
                        <h3>Паркинг {selectedSpace.number}</h3>
                        <div className="modal-info">
                            <div><span>Уровень:</span> {selectedSpace.level}</div>
                            <div><span>Площадь:</span> {selectedSpace.area} м²</div>
                            {selectedSpace.price && <div><span>Цена:</span> {Number(selectedSpace.price).toLocaleString()} сом</div>}
                            <div>
                                <span>Статус:</span>{' '}
                                <span style={{ color: getColors(selectedSpace.status).text }}>
                                    {getColors(selectedSpace.status).label}
                                </span>
                            </div>
                        </div>
                        {selectedSpace.status === 'AVAILABLE' && (
                            <button
                                className="modal-book-btn"
                                onClick={handleBookParking}
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
        </div>
    )
}
