/* ═══════════════════════════════════════════════════════════
   SVG drawing primitives for floor plan visualization.
   Extracted from FloorPlanSVG for reusability and separation of concerns.
   ═══════════════════════════════════════════════════════════ */

import { W, TW, FW, BG, FN } from '@/lib/buildingGeometry'

/* ────────────── Architectural primitives ────────────── */

export const wall = (x: number, y: number, w: number, h: number) =>
    <rect x={x} y={y} width={w} height={h} fill={W} />

export const door = (
    px: number, py: number, size: number,
    orient: 'h' | 'v', dir: 'u' | 'd' | 'l' | 'r', hinge: 'l' | 'r'
) => {
    const s = size
    if (orient === 'h') {
        const hx = hinge === 'l' ? px : px + s
        const ox = hinge === 'l' ? px + s : px
        const dy = dir === 'd' ? 1 : -1
        return (<g>
            <line x1={hx} y1={py} x2={ox} y2={py + dy * s * 0.7}
                stroke={W} strokeWidth={1} />
            <path d={`M${ox},${py} A${s},${s} 0 0,${dy * (hinge === 'l' ? 1 : -1) > 0 ? 1 : 0} ${hx},${py + dy * s}`}
                fill="none" stroke={TW} strokeWidth={0.4} />
        </g>)
    } else {
        const hy = hinge === 'l' ? py : py + s
        const oy = hinge === 'l' ? py + s : py
        const dx = dir === 'r' ? 1 : -1
        return (<g>
            <line x1={px} y1={hy} x2={px + dx * s * 0.7} y2={oy}
                stroke={W} strokeWidth={1} />
            <path d={`M${px},${oy} A${s},${s} 0 0,${dx * (hinge === 'l' ? -1 : 1) > 0 ? 1 : 0} ${px + dx * s},${hy}`}
                fill="none" stroke={TW} strokeWidth={0.4} />
        </g>)
    }
}

export const windowH = (x: number, y: number, w: number, wallH: number) => (<g>
    <rect x={x} y={y} width={w} height={wallH} fill={BG} />
    <line x1={x + 1} y1={y + wallH * 0.33} x2={x + w - 1} y2={y + wallH * 0.33} stroke={TW} strokeWidth={0.5} />
    <line x1={x + 1} y1={y + wallH * 0.67} x2={x + w - 1} y2={y + wallH * 0.67} stroke={TW} strokeWidth={0.5} />
</g>)

export const windowV = (x: number, y: number, wallW: number, h: number) => (<g>
    <rect x={x} y={y} width={wallW} height={h} fill={BG} />
    <line x1={x + wallW * 0.33} y1={y + 1} x2={x + wallW * 0.33} y2={y + h - 1} stroke={TW} strokeWidth={0.5} />
    <line x1={x + wallW * 0.67} y1={y + 1} x2={x + wallW * 0.67} y2={y + h - 1} stroke={TW} strokeWidth={0.5} />
</g>)

/* ────────────── Furniture primitives ────────────── */

// Кровать горизонтальная (изголовье сверху)
export const bed_h = (x: number, y: number, w: number, h: number) => (<g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={FW} strokeWidth={FN} rx={1.5} />
    <rect x={x + 2} y={y + 1.5} width={w - 4} height={3.5} fill="none" stroke={FW} strokeWidth={FN * 0.7} rx={1} />
    <rect x={x + 3} y={y + 6.5} width={w / 2 - 4} height={5} fill="none" stroke={FW} strokeWidth={FN * 0.5} rx={2} />
    <rect x={x + w / 2 + 1} y={y + 6.5} width={w / 2 - 4} height={5} fill="none" stroke={FW} strokeWidth={FN * 0.5} rx={2} />
    <rect x={x + 3} y={y + 13} width={w - 6} height={h - 16} fill="none" stroke={FW} strokeWidth={FN * 0.4} rx={3} />
</g>)

// Кровать вертикальная (изголовье слева)
export const bed_v = (x: number, y: number, w: number, h: number) => (<g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={FW} strokeWidth={FN} rx={1.5} />
    <rect x={x + 1.5} y={y + 2} width={3.5} height={h - 4} fill="none" stroke={FW} strokeWidth={FN * 0.7} rx={1} />
    <rect x={x + 6.5} y={y + 3} width={5} height={h / 2 - 4} fill="none" stroke={FW} strokeWidth={FN * 0.5} rx={2} />
    <rect x={x + 6.5} y={y + h / 2 + 1} width={5} height={h / 2 - 4} fill="none" stroke={FW} strokeWidth={FN * 0.5} rx={2} />
    <rect x={x + 13} y={y + 3} width={w - 16} height={h - 6} fill="none" stroke={FW} strokeWidth={FN * 0.4} rx={3} />
</g>)

// Ванна
export const bathtub = (x: number, y: number, w: number, h: number) => (<g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={FW} strokeWidth={FN + 0.15} rx={2} />
    <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill="none" stroke={FW} strokeWidth={FN * 0.4} rx={3.5} />
    <circle cx={x + w - 5} cy={y + h / 2} r={1.3} fill="none" stroke={FW} strokeWidth={0.35} />
</g>)

// Унитаз
export const wc = (x: number, y: number, dir: 'u' | 'd' | 'l' | 'r') => {
    if (dir === 'd') return (<g>
        <rect x={x} y={y} width={9} height={6} fill="none" stroke={FW} strokeWidth={FN} rx={1} />
        <ellipse cx={x + 4.5} cy={y + 12} rx={5} ry={6} fill="none" stroke={FW} strokeWidth={FN} />
    </g>)
    if (dir === 'u') return (<g>
        <rect x={x} y={y + 12} width={9} height={6} fill="none" stroke={FW} strokeWidth={FN} rx={1} />
        <ellipse cx={x + 4.5} cy={y + 6} rx={5} ry={6} fill="none" stroke={FW} strokeWidth={FN} />
    </g>)
    if (dir === 'r') return (<g>
        <rect x={x} y={y} width={6} height={9} fill="none" stroke={FW} strokeWidth={FN} rx={1} />
        <ellipse cx={x + 12} cy={y + 4.5} rx={6} ry={5} fill="none" stroke={FW} strokeWidth={FN} />
    </g>)
    return (<g>
        <rect x={x + 12} y={y} width={6} height={9} fill="none" stroke={FW} strokeWidth={FN} rx={1} />
        <ellipse cx={x + 6} cy={y + 4.5} rx={6} ry={5} fill="none" stroke={FW} strokeWidth={FN} />
    </g>)
}

// Раковина
export const sink = (x: number, y: number, w: number, h: number) => (<g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={FW} strokeWidth={FN * 0.7} rx={1} />
    <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.2} fill="none" stroke={FW} strokeWidth={0.3} />
</g>)

// Стиральная машина
export const washer = (x: number, y: number, s: number) => (<g>
    <rect x={x} y={y} width={s} height={s} fill="none" stroke={FW} strokeWidth={FN} rx={1} />
    <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.32} fill="none" stroke={FW} strokeWidth={FN * 0.5} />
</g>)

// Кухня L-образная
export const kitchen_L = (x: number, y: number, w: number, h: number, corner: 'tl' | 'tr' | 'bl' | 'br', d = 8) => {
    let pts = ''
    if (corner === 'bl') pts = `${x},${y} ${x + d},${y} ${x + d},${y + h - d} ${x + w},${y + h - d} ${x + w},${y + h} ${x},${y + h}`
    if (corner === 'br') pts = `${x + w},${y} ${x + w - d},${y} ${x + w - d},${y + h - d} ${x},${y + h - d} ${x},${y + h} ${x + w},${y + h}`
    if (corner === 'tl') pts = `${x},${y + h} ${x + d},${y + h} ${x + d},${y + d} ${x + w},${y + d} ${x + w},${y} ${x},${y}`
    if (corner === 'tr') pts = `${x + w},${y + h} ${x + w - d},${y + h} ${x + w - d},${y + d} ${x},${y + d} ${x},${y} ${x + w},${y}`
    const sx = corner.includes('l') ? x + d / 2 : x + w - d / 2
    const sy = corner.includes('t') ? y + d / 2 : y + h - d / 2
    const bx = corner.includes('l') ? x + d / 2 : x + w - d / 2
    const by = corner.includes('t') ? y + h - d / 2 - 4 : y + d / 2 + 4
    return (<g>
        <polygon points={pts} fill="none" stroke={FW} strokeWidth={FN + 0.1} />
        <circle cx={sx} cy={sy} r={2.5} fill="none" stroke={FW} strokeWidth={0.35} />
        <circle cx={bx - 2} cy={by - 2} r={1.3} fill="none" stroke={FW} strokeWidth={0.25} />
        <circle cx={bx + 2} cy={by - 2} r={1.3} fill="none" stroke={FW} strokeWidth={0.25} />
        <circle cx={bx - 2} cy={by + 2} r={1.3} fill="none" stroke={FW} strokeWidth={0.25} />
        <circle cx={bx + 2} cy={by + 2} r={1.3} fill="none" stroke={FW} strokeWidth={0.25} />
    </g>)
}

// Диван
export const sofa = (x: number, y: number, w: number, h: number, back: 't' | 'b' | 'l' | 'r') => {
    const p = 3.5
    return (<g>
        <rect x={x} y={y} width={w} height={h} fill="none" stroke={FW} strokeWidth={FN} rx={1.5} />
        {back === 't' && <rect x={x + 1} y={y + 1} width={w - 2} height={p} fill="none" stroke={FW} strokeWidth={FN * 0.6} rx={1} />}
        {back === 'b' && <rect x={x + 1} y={y + h - p - 1} width={w - 2} height={p} fill="none" stroke={FW} strokeWidth={FN * 0.6} rx={1} />}
        {back === 'l' && <rect x={x + 1} y={y + 1} width={p} height={h - 2} fill="none" stroke={FW} strokeWidth={FN * 0.6} rx={1} />}
        {back === 'r' && <rect x={x + w - p - 1} y={y + 1} width={p} height={h - 2} fill="none" stroke={FW} strokeWidth={FN * 0.6} rx={1} />}
        {(back === 't' || back === 'b') && (<>
            <rect x={x + 2} y={back === 't' ? y + p + 2 : y + 2} width={(w - 6) / 2} height={h - p - 4} fill="none" stroke={FW} strokeWidth={0.25} rx={2} />
            <rect x={x + w / 2} y={back === 't' ? y + p + 2 : y + 2} width={(w - 6) / 2} height={h - p - 4} fill="none" stroke={FW} strokeWidth={0.25} rx={2} />
        </>)}
        {(back === 'l' || back === 'r') && (<>
            <rect x={back === 'l' ? x + p + 2 : x + 2} y={y + 2} width={w - p - 4} height={(h - 6) / 2} fill="none" stroke={FW} strokeWidth={0.25} rx={2} />
            <rect x={back === 'l' ? x + p + 2 : x + 2} y={y + h / 2} width={w - p - 4} height={(h - 6) / 2} fill="none" stroke={FW} strokeWidth={0.25} rx={2} />
        </>)}
    </g>)
}

// Шкаф
export const wardrobe = (x: number, y: number, w: number, h: number) => (<g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={FW} strokeWidth={FN} />
    {w > h ?
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={FW} strokeWidth={0.25} /> :
        <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={FW} strokeWidth={0.25} />
    }
</g>)

// Стол
export const table = (x: number, y: number, w: number, h: number) =>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={FW} strokeWidth={FN * 0.6} rx={1} />

// Звездочка-разделитель балкона
export const starBurst = (cx: number, cy: number, r: number) => {
    const pts: string[] = []
    for (let i = 0; i < 8; i++) {
        const a = (i * 45) * Math.PI / 180
        const rad = i % 2 === 0 ? r : r * 0.4
        pts.push(`${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`)
    }
    return <polygon points={pts.join(' ')} fill="none" stroke={TW} strokeWidth={0.5} />
}
