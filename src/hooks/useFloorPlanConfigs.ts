import { useState, useEffect, useMemo } from 'react'
import api from '@/lib/api'
import type { FloorPlanConfig, ZoneData, ParsedZonesPayload } from '@/types/floorPlan'

/**
 * Hook to fetch and cache floor plan configurations for a building.
 * Returns configs array and a helper to get zones for a specific floor.
 */
export function useFloorPlanConfigs(companyId: number | null, buildingId: number | null) {
    const [configs, setConfigs] = useState<FloorPlanConfig[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!companyId || !buildingId) {
            setConfigs([])
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)

        api.get<FloorPlanConfig[]>('/marketplace/floor-plan-configs', {
            params: { companyId, buildingId }
        })
            .then(({ data }) => {
                if (!cancelled) setConfigs(data)
            })
            .catch(err => {
                if (!cancelled) setError(err?.message || 'Failed to load floor plan configs')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [companyId, buildingId])

    // Pre-parse zonesData for each config
    const parsedConfigs = useMemo(() => {
        return configs.map(cfg => {
            let zones: ZoneData[] = []
            if (cfg.zonesData) {
                try {
                    const parsed: ParsedZonesPayload = JSON.parse(cfg.zonesData)
                    zones = parsed.zones || []
                } catch {
                    // Invalid JSON — leave empty
                }
            }
            return { ...cfg, zones }
        })
    }, [configs])

    /**
     * Get zones and config for a specific floor number
     */
    const getConfigForFloor = (floor: number) => {
        return parsedConfigs.find(c => floor >= c.floorFrom && floor <= c.floorTo) || null
    }

    return { configs: parsedConfigs, loading, error, getConfigForFloor }
}
