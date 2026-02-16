interface StatusConfig {
    label: string
    cls: string
}

interface StatusBadgeProps {
    status: string
    colorMap: Record<string, StatusConfig>
    fallbackCls?: string
}

/**
 * Единый бейдж статуса — заменяет дублированные <span className={STATUS_MAP[x]}>
 * во всех admin-страницах.
 */
export default function StatusBadge({
    status,
    colorMap,
    fallbackCls = 'bg-gray-500/10 text-gray-400',
}: StatusBadgeProps) {
    const cfg = colorMap[status]
    return (
        <span className={`text-xs px-2 py-1 rounded-full ${cfg?.cls || fallbackCls}`}>
            {cfg?.label || status}
        </span>
    )
}
