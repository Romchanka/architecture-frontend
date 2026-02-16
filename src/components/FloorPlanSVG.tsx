import React from 'react'
import { Apartment } from '@/types'
import { W, TW, BG, OW, AW, IW, B, CL, CR, ROW, CORR_H, LEFT_ZONES } from '@/lib/buildingGeometry'
import {
    wall, door, windowH, windowV,
    bed_h, bed_v, bathtub, wc, sink, washer,
    kitchen_L, sofa, wardrobe, table, starBurst,
} from '@/lib/floorPlanPrimitives'

interface FloorPlanSVGProps {
    apartments: Apartment[]
    hoveredApartment: Apartment | null
    onApartmentHover: (apt: Apartment | null) => void
    onApartmentClick: (apt: Apartment) => void
    statusColors: Record<string, { fill: string; fillHover: string; stroke: string }>
}


const FloorPlanSVG = React.memo(function FloorPlanSVG({
    apartments, hoveredApartment, onApartmentHover, onApartmentClick, statusColors,
}: FloorPlanSVGProps) {

    const isHov = (a?: Apartment) => a && hoveredApartment?.id === a.id
    const gFill = (a?: Apartment) => {
        if (!a) return 'transparent'
        const colors = statusColors[a.status] || statusColors.AVAILABLE
        return isHov(a) ? colors.fillHover : colors.fill
    }
    const gStroke = (a?: Apartment) => {
        if (!a) return 'transparent'
        const colors = statusColors[a.status] || statusColors.AVAILABLE
        return isHov(a) || a.status !== 'AVAILABLE' ? colors.stroke : 'transparent'
    }

    /* ═══════════════ ЛЕВОЕ КРЫЛО ═══════════════ */
    const leftWing = () => {
        const T = B.t + OW
        const BT = B.b - OW
        const L = B.l + OW
        const R1 = ROW
        const R2 = ROW + CORR_H
        const X1 = B.l + 140
        const X2 = B.l + 140 + 168
        const X3 = B.l + 228
        const CLE = CL - AW

        return (<g>
            {/* ══════ КОРИДОР ══════ */}
            {wall(L, R1, CLE - L, AW)}
            {wall(L, R2 - AW, CLE - L, AW)}

            {/* ══════ ВЕРХНИЙ РЯД ══════ */}
            {wall(X1 - AW / 2, T, AW, R1 - T)}
            {wall(X2 - AW / 2, T, AW, R1 - T)}

            {/* ── Кв.0: 1к угловая (x:L → X1) ── */}
            {wall(L, 85, X1 - AW / 2 - L, IW)}
            {wall(100, 85 + IW, IW, R1 - 85 - IW)}
            {windowH(55, B.t, 30, OW)}
            {windowH(110, B.t, 22, OW)}
            {windowV(B.l, 40, OW, 28)}
            {windowV(B.l, 90, OW, 28)}
            {door(65, 85 + IW, 14, 'h', 'd', 'l')}
            {door(110, 85 + IW, 11, 'h', 'd', 'l')}
            {door(130, R1, 14, 'h', 'u', 'r')}
            {/* Мебель */}
            {bed_h(44, 24, 40, 48)}
            {wardrobe(92, T + 2, 40, 7)}
            {kitchen_L(L + 2, 90, 52, R1 - 94, 'bl')}
            {table(50, R1 - 28, 16, 12)}
            {bathtub(104, 90, 28, 12)}
            {sink(108, 106, 9, 6)}
            {wc(L + 2, 130, 'r')}

            {/* ── Кв.1: 2к средняя (x:X1 → X2) ── */}
            {wall(X1 + AW / 2, 85, X2 - X1 - AW, IW)}
            {wall(X1 + 80, T, IW, 85 - T)}
            {wall(X1 + 50, 85 + IW, IW, R1 - 85 - IW)}
            {wall(X1 + 110, 85 + IW, IW, R1 - 85 - IW)}
            {windowH(X1 + 15, B.t, 28, OW)}
            {windowH(X1 + 95, B.t, 28, OW)}
            {windowH(X1 + 140, B.t, 20, OW)}
            {door(X1 + 15, 85 + IW, 15, 'h', 'd', 'l')}
            {door(X1 + 62, 85 + IW, 12, 'h', 'd', 'l')}
            {door(X1 + 120, 85 + IW, 11, 'h', 'd', 'r')}
            {door(X1 + 140, R1, 14, 'h', 'u', 'l')}
            {/* Мебель */}
            {bed_h(X1 + 8, 24, 40, 48)}
            {wardrobe(X1 + 52, T + 2, 22, 7)}
            {bed_h(X1 + 88, 24, 40, 48)}
            {wardrobe(X1 + 132, T + 2, 25, 7)}
            {kitchen_L(X1 + AW / 2 + 2, 90, 42, R1 - 94, 'bl')}
            {table(X1 + 22, R1 - 28, 14, 12)}
            {bathtub(X1 + 56, 90, 48, 12)}
            {sink(X1 + 60, 106, 9, 6)}
            {wc(X1 + 114, 92, 'd')}
            {washer(X1 + 116, 118, 10)}

            {/* ── Кв.2: 1к у лестницы (x:X2 → CL) ── */}
            {wall(X2 + AW / 2, 85, CLE - X2 - AW / 2, IW)}
            {wall(X2 + 60, 85 + IW, IW, R1 - 85 - IW)}
            {windowH(X2 + 15, B.t, 25, OW)}
            {windowH(X2 + 62, B.t, 25, OW)}
            {door(X2 + 15, 85 + IW, 14, 'h', 'd', 'l')}
            {door(X2 + 68, 85 + IW, 11, 'h', 'd', 'r')}
            {door(X2 + 50, R1, 14, 'h', 'u', 'l')}
            {/* Мебель */}
            {bed_h(X2 + 8, 24, 38, 48)}
            {wardrobe(X2 + 50, T + 2, 38, 7)}
            {kitchen_L(X2 + AW / 2 + 2, 90, 50, R1 - 94, 'bl')}
            {table(X2 + 24, R1 - 28, 14, 12)}
            {bathtub(X2 + 66, 90, 22, 12)}
            {wc(X2 + 70, 108, 'd')}

            {/* ══════ НИЖНИЙ РЯД ══════ */}
            {wall(X3 - AW / 2, R2, AW, BT - R2)}

            {/* ── Кв.3: 3к угловая (x:L → X3) ── */}
            {wall(L, 240, X3 - AW / 2 - L, IW)}
            {wall(130, R2, IW, 240 - R2)}
            {wall(200, R2, IW, 240 - R2)}
            {wall(100, 240 + IW, IW, BT - 240 - IW)}
            {wall(160, 240 + IW, IW, BT - 240 - IW)}
            {windowH(50, B.b - OW, 30, OW)}
            {windowH(110, B.b - OW, 22, OW)}
            {windowH(170, B.b - OW, 22, OW)}
            {windowV(B.l, R2 + 15, OW, 30)}
            {windowV(B.l, 252, OW, 28)}
            {door(60, 240, 16, 'h', 'u', 'l')}
            {door(140, 240, 12, 'h', 'u', 'l')}
            {door(168, 240, 10, 'h', 'u', 'r')}
            {door(210, R2, 14, 'h', 'd', 'r')}
            {/* Мебель */}
            {bed_v(L + 4, R2 + 10, 48, 40)}
            {wardrobe(L + 4, R2 + 2, 55, 7)}
            {sofa(L + 4, 240 - 20, 50, 18, 'l')}
            {bed_v(134, R2 + 10, 44, 38)}
            {wardrobe(134, R2 + 2, 60, 7)}
            {bed_v(204, R2 + 10, 44, 38)}
            {sofa(204, 210, 44, 18, 'l')}
            {table(210, 230, 18, 8)}
            {kitchen_L(L + 2, 248, 60, BT - 250, 'bl')}
            {table(55, BT - 32, 16, 12)}
            {bathtub(106, 248, 46, 12)}
            {sink(112, 264, 9, 6)}
            {wc(166, 250, 'd')}
            {washer(168, 278, 10)}
            {wardrobe(204, 248, 7, 48)}

            {/* Балконы + звёздочки */}
            <rect x={50} y={B.b} width={55} height={12} fill="none" stroke={TW} strokeWidth={0.6} />
            {starBurst(110, B.b + 6, 7)}
            <rect x={116} y={B.b} width={52} height={12} fill="none" stroke={TW} strokeWidth={0.6} />
            {starBurst(174, B.b + 6, 7)}
            <rect x={180} y={B.b} width={38} height={12} fill="none" stroke={TW} strokeWidth={0.6} />

            {/* ── Кв.4: 2к средняя (x:X3 → CL) ── */}
            {wall(X3 + AW / 2, 240, CLE - X3 - AW / 2, IW)}
            {wall(X3 + 100, R2, IW, 240 - R2)}
            {wall(X3 + 55, 240 + IW, IW, BT - 240 - IW)}
            {wall(X3 + 115, 240 + IW, IW, BT - 240 - IW)}
            {wall(X3 + 160, 240 + IW, IW, BT - 240 - IW)}
            {windowH(X3 + 15, B.b - OW, 28, OW)}
            {windowH(X3 + 70, B.b - OW, 25, OW)}
            {windowH(X3 + 130, B.b - OW, 25, OW)}
            {door(X3 + 30, 240, 16, 'h', 'u', 'l')}
            {door(X3 + 65, 240, 12, 'h', 'u', 'l')}
            {door(X3 + 125, 240, 10, 'h', 'u', 'r')}
            {door(X3 + 135, R2, 14, 'h', 'd', 'r')}
            {/* Мебель */}
            {bed_v(X3 + 8, R2 + 10, 48, 40)}
            {wardrobe(X3 + 8, R2 + 2, 85, 7)}
            {bed_v(X3 + 106, R2 + 10, 46, 38)}
            {sofa(X3 + 106, 210, 42, 18, 'l')}
            {table(X3 + 116, 230, 16, 8)}
            {kitchen_L(X3 + AW / 2 + 2, 248, 46, BT - 250, 'bl')}
            {table(X3 + 25, BT - 32, 14, 12)}
            {bathtub(X3 + 60, 248, 48, 12)}
            {sink(X3 + 66, 264, 9, 6)}
            {wc(X3 + 120, 250, 'd')}
            {washer(X3 + 122, 278, 10)}
            {wardrobe(X3 + 164, 248, 7, 48)}

            {/* Балконы + звёздочки */}
            <rect x={X3 + 12} y={B.b} width={50} height={12} fill="none" stroke={TW} strokeWidth={0.6} />
            {starBurst(X3 + 68, B.b + 6, 7)}
            <rect x={X3 + 74} y={B.b} width={48} height={12} fill="none" stroke={TW} strokeWidth={0.6} />
            {starBurst(X3 + 128, B.b + 6, 7)}
            <rect x={X3 + 134} y={B.b} width={50} height={12} fill="none" stroke={TW} strokeWidth={0.6} />
        </g>)
    }

    /* ═══════════════ ЦЕНТРАЛЬНОЕ ЯДРО ═══════════════ */
    const centerCore = () => {
        const cx = (CL + CR) / 2
        const T = B.t + OW
        const BT = B.b - OW
        const iL = CL + OW
        const iR = CR - OW
        const iW = iR - iL

        return (<g>
            {wall(CL, B.t, CR - CL, B.b - B.t)}
            <rect x={iL} y={T} width={iW} height={BT - T} fill={BG} />

            {/* Верхняя лестница */}
            {Array.from({ length: 10 }, (_, i) => (
                <line key={`st${i}`} x1={iL + 4} y1={T + 4 + i * 5} x2={cx - 2} y2={T + 4 + i * 5} stroke={TW} strokeWidth={0.4} />
            ))}
            {Array.from({ length: 10 }, (_, i) => (
                <line key={`st2${i}`} x1={cx + 2} y1={T + 4 + i * 5} x2={iR - 4} y2={T + 4 + i * 5} stroke={TW} strokeWidth={0.4} />
            ))}
            <line x1={cx} y1={T + 2} x2={cx} y2={T + 54} stroke={W} strokeWidth={0.6} />
            {wall(iL, T + 58, iW, IW)}

            {/* Подсобные */}
            {wall(iL, T + 58, IW, ROW - T - 58)}
            {wall(iR - IW, T + 58, IW, ROW - T - 58)}
            <line x1={cx} y1={T + 60} x2={cx} y2={ROW} stroke={TW} strokeWidth={0.4} />

            {/* Коридор */}
            {wall(CL, ROW, CR - CL, AW)}
            {wall(CL, ROW + CORR_H - AW, CR - CL, AW)}

            {/* Лифты */}
            <rect x={iL + 4} y={ROW + CORR_H + 4} width={25} height={35} fill="none" stroke={W} strokeWidth={1.2} />
            <line x1={iL + 4} y1={ROW + CORR_H + 4} x2={iL + 29} y2={ROW + CORR_H + 39} stroke={TW} strokeWidth={0.4} />
            <line x1={iL + 29} y1={ROW + CORR_H + 4} x2={iL + 4} y2={ROW + CORR_H + 39} stroke={TW} strokeWidth={0.4} />
            <rect x={iR - 29} y={ROW + CORR_H + 4} width={25} height={35} fill="none" stroke={W} strokeWidth={1.2} />
            <line x1={iR - 29} y1={ROW + CORR_H + 4} x2={iR - 4} y2={ROW + CORR_H + 39} stroke={TW} strokeWidth={0.4} />
            <line x1={iR - 4} y1={ROW + CORR_H + 4} x2={iR - 29} y2={ROW + CORR_H + 39} stroke={TW} strokeWidth={0.4} />

            {wall(iL, ROW + CORR_H + 44, iW, IW)}

            {/* Нижняя лестница */}
            {Array.from({ length: 12 }, (_, i) => (
                <line key={`sb${i}`} x1={iL + 4} y1={ROW + CORR_H + 50 + i * 5} x2={cx - 2} y2={ROW + CORR_H + 50 + i * 5} stroke={TW} strokeWidth={0.4} />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
                <line key={`sb2${i}`} x1={cx + 2} y1={ROW + CORR_H + 50 + i * 5} x2={iR - 4} y2={ROW + CORR_H + 50 + i * 5} stroke={TW} strokeWidth={0.4} />
            ))}
            <line x1={cx} y1={ROW + CORR_H + 48} x2={cx} y2={BT - 4} stroke={W} strokeWidth={0.6} />

            <polygon points={`${cx},${B.t - 8} ${cx - 3},${B.t - 1} ${cx + 3},${B.t - 1}`}
                fill="none" stroke={W} strokeWidth={0.8} />
        </g>)
    }

    /* ═══════════════ ИНТЕРАКТИВНЫЕ ЗОНЫ ═══════════════ */
    const zones = (mirror: boolean, offset: number) =>
        LEFT_ZONES.map((z, i) => {
            const a = apartments[i + offset]
            if (!a) return null
            const x = mirror ? (1000 - z.x - z.w) : z.x
            return (<rect key={`${mirror ? 'r' : 'l'}${i}`}
                x={x} y={z.y} width={z.w} height={z.h}
                fill={gFill(a)} stroke={gStroke(a)}
                strokeWidth={isHov(a) ? 2 : (a.status !== 'AVAILABLE' ? 1 : 0)} rx={2}
                style={{ cursor: 'pointer', transition: 'fill .2s' }}
                onMouseEnter={() => onApartmentHover(a)}
                onMouseLeave={() => onApartmentHover(null)}
                onClick={() => onApartmentClick(a)}
            />)
        })

    return (
        <svg viewBox="0 0 1000 340" xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: 'auto', backgroundColor: BG, borderRadius: '8px' }}>
            {wall(B.l, B.t, B.r - B.l, OW)}
            {wall(B.l, B.b - OW, B.r - B.l, OW)}
            {wall(B.l, B.t, OW, B.b - B.t)}
            {wall(B.r - OW, B.t, OW, B.b - B.t)}
            {wall(CL - AW, B.t, AW, B.b - B.t)}
            {wall(CR, B.t, AW, B.b - B.t)}

            {leftWing()}
            <g transform="translate(1000,0) scale(-1,1)">{leftWing()}</g>
            {centerCore()}

            {zones(false, 0)}
            {zones(true, 5)}
        </svg>
    )
})

export default FloorPlanSVG
