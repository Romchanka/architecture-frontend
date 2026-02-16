/* ═══════════════════════════════════════════════════════════
   Geometry constants and drawing primitives for Montana floor plan SVG.
   Extracted from FloorPlanSVG to separate data/config from rendering.
   ═══════════════════════════════════════════════════════════ */

// ── Цвета ──
export const W = '#c8d0e0'      // стены
export const TW = '#7a86a0'      // тонкие линии
export const FW = '#6a7690'      // мебель
export const BG = '#151d2e'      // фон

// ── Толщины ──
export const OW = 5     // наружные
export const AW = 4     // межквартирные
export const IW = 2     // внутренние
export const FN = 0.55  // мебельные линии

// ── Координаты здания ──
export const B = { l: 30, r: 970, t: 15, b: 315 }
export const CL = 460
export const CR = 540
export const ROW = 160
export const CORR_H = 12

/* ────────────── Зоны квартир (левое крыло) ────────────── */
export const LEFT_ZONES = [
    { x: B.l, y: B.t, w: 140, h: ROW - B.t },
    { x: B.l + 140, y: B.t, w: 168, h: ROW - B.t },
    { x: B.l + 140 + 168, y: B.t, w: CL - B.l - 140 - 168, h: ROW - B.t },
    { x: B.l, y: ROW + CORR_H, w: 228, h: B.b - ROW - CORR_H },
    { x: B.l + 228, y: ROW + CORR_H, w: CL - B.l - 228, h: B.b - ROW - CORR_H },
]
