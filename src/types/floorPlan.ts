/**
 * Floor plan configuration types — matches backend FloorPlanConfigResponse
 */

export interface FloorPlanConfig {
    id: number
    buildingId: number
    floorType: string
    floorFrom: number
    floorTo: number
    backgroundUrl: string | null
    zonesUrl: string | null
    zonesData: string | null
    viewboxWidth: number
    viewboxHeight: number
}

export interface ZoneData {
    id: number
    points: string
    labelOffset: { x: number; y: number }
}

export interface ParsedZonesPayload {
    zones: ZoneData[]
}
