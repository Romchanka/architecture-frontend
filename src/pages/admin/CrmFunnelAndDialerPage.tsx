import { useState, useEffect, useCallback } from 'react'
import {
    crmApi,
    CrmLead,
    CrmLeadStage,
    CrmCallOutcome,
    CrmCallLog,
    CrmLeadTimelineItem,
    CrmFunnelAnalytics,
    CrmChatMessage,
} from '@/lib/api/crmApi'
import { useEventSource } from '@/hooks/useEventSource'

const STAGE_META: Record<CrmLeadStage, { label: string; badgeClass: string; stepGroup: string }> = {
    NEW_POOL: { label: 'Очередь обзвона', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30', stepGroup: 'CALLS' },
    CALL_IN_PROGRESS: { label: 'В прозвоне сейчас', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30', stepGroup: 'CALLS' },
    NO_ANSWER: { label: 'Недозвон', badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30', stepGroup: 'CALLS' },
    CALLBACK_SCHEDULED: { label: 'Перезвон назначен', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', stepGroup: 'CALLS' },
    MEETING_SCHEDULED: { label: 'Встреча назначена', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30', stepGroup: 'MEETINGS' },
    MEETING_COMPLETED: { label: 'Встреча проведена', badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', stepGroup: 'MEETINGS' },
    BOOKED: { label: 'Бронь объекта', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30', stepGroup: 'CLOSING' },
    CONTRACT_SIGNING: { label: 'Подписание договора', badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', stepGroup: 'CLOSING' },
    CONTRACT_SIGNED: { label: 'Договор подписан', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', stepGroup: 'CLOSING' },
    REJECTED: { label: 'Отказ', badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30', stepGroup: 'CLOSED' },
}

const KANBAN_COLUMNS: Array<{ title: string; icon: string; stages: CrmLeadStage[]; defaultTarget: CrmLeadStage }> = [
    {
        title: '1. Очередь обзвона',
        icon: '📋',
        stages: ['NEW_POOL', 'CALL_IN_PROGRESS', 'NO_ANSWER'],
        defaultTarget: 'NEW_POOL',
    },
    {
        title: '2. Перезвон / В контакте',
        icon: '📞',
        stages: ['CALLBACK_SCHEDULED'],
        defaultTarget: 'CALLBACK_SCHEDULED',
    },
    {
        title: '3. Встреча назначена',
        icon: '🤝',
        stages: ['MEETING_SCHEDULED'],
        defaultTarget: 'MEETING_SCHEDULED',
    },
    {
        title: '4. Встреча проведена / Бронь',
        icon: '🏢',
        stages: ['MEETING_COMPLETED', 'BOOKED'],
        defaultTarget: 'MEETING_COMPLETED',
    },
    {
        title: '5. Подписание договора',
        icon: '✍️',
        stages: ['CONTRACT_SIGNING', 'CONTRACT_SIGNED'],
        defaultTarget: 'CONTRACT_SIGNED',
    },
]

export default function CrmFunnelAndDialerPage() {
    const [activeTab, setActiveTab] = useState<'DIALER' | 'FUNNEL' | 'IMPORT'>('DIALER')
    const [leads, setLeads] = useState<CrmLead[]>([])
    const [analytics, setAnalytics] = useState<CrmFunnelAnalytics | null>(null)
    const [onlyMine, setOnlyMine] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)

    // Active Dialer / Selected Lead state
    const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null)
    const [callLogs, setCallLogs] = useState<CrmCallLog[]>([])
    const [timeline, setTimeline] = useState<CrmLeadTimelineItem[]>([])
    const [threadRoomId, setThreadRoomId] = useState<number | null>(null)
    const [threadMessages, setThreadMessages] = useState<CrmChatMessage[]>([])
    const [threadInput, setThreadInput] = useState('')

    // Call Result Form state
    const [callComment, setCallComment] = useState('')
    const [meetingDateTime, setMeetingDateTime] = useState('')
    const [callbackDateTime, setCallbackDateTime] = useState('')
    const [rejectionReason, setRejectionReason] = useState('')

    // Import Sheet state
    const [importFileName, setImportFileName] = useState('База_обзвона_отдел_продаж.csv')
    const [rawSheetText, setRawSheetText] = useState(
        'Нурлан Сапаров; +7 701 234 56 78; Интересует 2-комн в ЖК Престиж\nАйгуль Оспанова; 8 (702) 987-65-43; Ипотека / Рассрочка\nДанияр Беков; +77051112233; Просил перезвонить после обеда'
    )
    const [manualName, setManualName] = useState('')
    const [manualPhone, setManualPhone] = useState('')
    const [manualNotes, setManualNotes] = useState('')

    const fetchAll = useCallback(async () => {
        try {
            const [leadsRes, statsRes] = await Promise.all([
                crmApi.getLeads({ onlyMine }),
                crmApi.getAnalytics(),
            ])
            setLeads(leadsRes.data)
            setAnalytics(statsRes.data)
        } catch (err) {
            console.error('Ошибка загрузки CRM воронки:', err)
        } finally {
            setLoading(false)
        }
    }, [onlyMine])

    const loadLeadHistory = useCallback(async (leadId: number) => {
        try {
            const res = await crmApi.getLeadHistory(leadId)
            setSelectedLead(res.data.lead)
            setCallLogs(res.data.callLogs)
            setTimeline(res.data.timeline)
            setThreadRoomId(res.data.threadRoomId)
            if (res.data.threadRoomId) {
                const msgRes = await crmApi.getMessages(res.data.threadRoomId)
                setThreadMessages(msgRes.data)
            }
        } catch (err) {
            console.error('Ошибка загрузки историчности клиента:', err)
        }
    }, [])

    useEffect(() => {
        fetchAll()
    }, [fetchAll])

    // Real-time SSE updates
    useEventSource({
        eventTypes: ['crm_lead_updated', 'crm_chat_message'],
        onEvent: (ev) => {
            if (ev.type === 'crm_lead_updated') {
                fetchAll()
                if (selectedLead && ev.data?.leadId === selectedLead.id) {
                    loadLeadHistory(selectedLead.id)
                }
            } else if (ev.type === 'crm_chat_message' && threadRoomId && ev.data?.roomId === threadRoomId) {
                crmApi.getMessages(threadRoomId).then((r) => setThreadMessages(r.data))
                if (selectedLead) {
                    loadLeadHistory(selectedLead.id)
                }
            }
        },
    })

    const handleClaimNextLead = async () => {
        if (submitting) return
        setSubmitting(true)
        setStatusMessage(null)
        try {
            const res = await crmApi.claimNextDialerLead()
            if (res.data.hasNext && res.data.lead) {
                await loadLeadHistory(res.data.lead.id)
                await fetchAll()
                setStatusMessage(`Взят в прозвон: ${res.data.lead.fullName} (${res.data.lead.phone})`)
            } else {
                setStatusMessage('Очередь обзвона пуста! Все назначенные контакты обработаны.')
            }
        } catch (err: any) {
            setStatusMessage(err?.response?.data?.message || 'Не удалось получить следующий контакт')
        } finally {
            setSubmitting(false)
        }
    }

    const handleLogCallOutcome = async (outcome: CrmCallOutcome) => {
        if (!selectedLead || submitting) return
        if (outcome === 'REJECTED' && !rejectionReason.trim()) {
            setStatusMessage('Укажите причину отказа перед закрытием контакта')
            return
        }
        setSubmitting(true)
        setStatusMessage(null)
        try {
            await crmApi.logCallOutcome(selectedLead.id, {
                outcome,
                comment: callComment || undefined,
                nextContactAt: callbackDateTime || undefined,
                meetingScheduledAt: meetingDateTime || undefined,
                rejectionReason: rejectionReason || undefined,
            })
            setCallComment('')
            setRejectionReason('')
            await loadLeadHistory(selectedLead.id)
            await fetchAll()
            setStatusMessage(`Исход звонка сохранён (${outcome}). Запись добавлена в неизменяемую историчность.`)
        } catch (err: any) {
            setStatusMessage(err?.response?.data?.message || 'Ошибка при сохранении результата звонка')
        } finally {
            setSubmitting(false)
        }
    }

    const handleStageTransition = async (leadId: number, targetStage: CrmLeadStage) => {
        if (submitting) return
        let reason: string | undefined
        if (targetStage === 'REJECTED') {
            const promptReason = window.prompt('Укажите причину отказа:')
            if (!promptReason || !promptReason.trim()) return
            reason = promptReason.trim()
        }
        setSubmitting(true)
        try {
            await crmApi.transitionStage(leadId, {
                targetStage,
                rejectionReason: reason,
                comment: `Перевод на этап ${STAGE_META[targetStage].label}`,
            })
            await fetchAll()
            if (selectedLead?.id === leadId) {
                await loadLeadHistory(leadId)
            }
        } catch (err: any) {
            setStatusMessage(err?.response?.data?.message || 'Ошибка смены этапа воронки')
        } finally {
            setSubmitting(false)
        }
    }

    const handleImportSheet = async () => {
        if (submitting || !rawSheetText.trim()) return
        setSubmitting(true)
        setStatusMessage(null)
        try {
            const lines = rawSheetText
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean)

            const rows = lines.map((line) => {
                const parts = line.split(/[;,\t]/).map((p) => p.trim())
                if (parts.length >= 2) {
                    return {
                        fullName: parts[0],
                        phone: parts[1],
                        notes: parts.slice(2).join('; '),
                    }
                }
                return {
                    fullName: 'Клиент из списка',
                    phone: parts[0],
                    notes: '',
                }
            })

            const res = await crmApi.importSheet({
                fileName: importFileName || 'Электронный_список.csv',
                source: 'IMPORT_SHEET',
                rows,
            })

            setStatusMessage(
                `Импорт завершён: добавлено ${res.data.importedCount} новых контактов, пропущено дубликатов: ${res.data.duplicateCount}`
            )
            await fetchAll()
            setActiveTab('DIALER')
        } catch (err: any) {
            setStatusMessage(err?.response?.data?.message || 'Ошибка импорта списка')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCreateManualLead = async (e: React.FormEvent) => {
        e.preventDefault()
        if (submitting || !manualPhone.trim()) return
        setSubmitting(true)
        try {
            const created = await crmApi.createLead({
                fullName: manualName.trim() || `Клиент ${manualPhone}`,
                phone: manualPhone.trim(),
                source: 'MANUAL',
                notes: manualNotes.trim() || undefined,
            })
            setManualName('')
            setManualPhone('')
            setManualNotes('')
            await fetchAll()
            await loadLeadHistory(created.data.id)
            setActiveTab('DIALER')
            setStatusMessage(`Контакт ${created.data.fullName} добавлен в электронную очередь.`)
        } catch (err: any) {
            setStatusMessage(err?.response?.data?.message || 'Ошибка добавления контакта')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSendThreadMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!threadRoomId || !threadInput.trim() || submitting) return
        setSubmitting(true)
        try {
            await crmApi.sendMessage(threadRoomId, { content: threadInput.trim() })
            setThreadInput('')
            const msgRes = await crmApi.getMessages(threadRoomId)
            setThreadMessages(msgRes.data)
            if (selectedLead) {
                await loadLeadHistory(selectedLead.id)
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header & Funnel KPIs */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        📞 Электронный обзвон и Воронка продаж
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Сквозной цикл: <span className="text-amber-400 font-medium">Список обзвона → Звонок → Встреча → Подписание договора</span> с неизменяемой историчностью
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setActiveTab('DIALER')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            activeTab === 'DIALER'
                                ? 'bg-amber-500 text-gray-950 font-semibold'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        🎧 Потоковый прозвон
                    </button>
                    <button
                        onClick={() => setActiveTab('FUNNEL')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            activeTab === 'FUNNEL'
                                ? 'bg-amber-500 text-gray-950 font-semibold'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        📊 Воронка (Канбан)
                    </button>
                    <button
                        onClick={() => setActiveTab('IMPORT')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            activeTab === 'IMPORT'
                                ? 'bg-amber-500 text-gray-950 font-semibold'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        📥 Импорт списков (вместо листов)
                    </button>
                </div>
            </div>

            {/* Funnel Metrics Bar */}
            {analytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-400">Контактов в базе</p>
                        <p className="text-2xl font-bold text-white mt-1">{analytics.totalLeads}</p>
                        <p className="text-xs text-blue-400 mt-1">
                            В очереди на звонок: {analytics.stageCounts?.NEW_POOL || 0}
                        </p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-400">Совершено звонков</p>
                        <p className="text-2xl font-bold text-amber-400 mt-1">{analytics.totalCallAttempts}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Перезвонов: {analytics.stageCounts?.CALLBACK_SCHEDULED || 0}
                        </p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-400">Этап «Встречи»</p>
                        <p className="text-2xl font-bold text-purple-400 mt-1">{analytics.reachedMeetingCount}</p>
                        <p className="text-xs text-purple-300 mt-1">
                            Конверсия Звонок → Встреча: {analytics.callToMeetingRatePercent}%
                        </p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs text-gray-400">Подписано договоров</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">{analytics.reachedContractCount}</p>
                        <p className="text-xs text-emerald-300 mt-1">
                            Конверсия Встреча → Договор: {analytics.meetingToContractRatePercent}%
                        </p>
                    </div>
                </div>
            )}

            {statusMessage && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
                    <span>{statusMessage}</span>
                    <button onClick={() => setStatusMessage(null)} className="text-xs text-gray-400 hover:text-white">
                        ✕
                    </button>
                </div>
            )}

            {/* TAB 1: POWER DIALER & UNIFIED TIMELINE */}
            {activeTab === 'DIALER' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Electronic Call Queue */}
                    <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col max-h-[780px]">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                            <div>
                                <h2 className="text-base font-bold text-white">📋 Электронная очередь</h2>
                                <p className="text-xs text-gray-400">Авто-приоритет: Перезвоны → Новые → Недозвоны</p>
                            </div>
                            <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={onlyMine}
                                    onChange={(e) => setOnlyMine(e.target.checked)}
                                    className="rounded border-gray-700 bg-gray-800 text-amber-500"
                                />
                                Только мои
                            </label>
                        </div>

                        <button
                            onClick={handleClaimNextLead}
                            disabled={submitting}
                            className="mt-3 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 font-bold text-sm hover:opacity-95 disabled:opacity-50 transition shadow-lg"
                        >
                            ⚡ Взять следующий контакт в прозвон
                        </button>

                        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
                            {loading ? (
                                <p className="text-sm text-gray-500 py-8 text-center">Загрузка очереди...</p>
                            ) : leads.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    Список пуст. Перейдите во вкладку «Импорт списков», чтобы загрузить базу номеров.
                                </div>
                            ) : (
                                leads.map((lead) => {
                                    const meta = STAGE_META[lead.stage] || STAGE_META.NEW_POOL
                                    const isSelected = selectedLead?.id === lead.id
                                    return (
                                        <div
                                            key={lead.id}
                                            onClick={() => loadLeadHistory(lead.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition ${
                                                isSelected
                                                    ? 'bg-amber-500/10 border-amber-500/40'
                                                    : 'bg-gray-800/40 border-gray-800 hover:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-sm text-white truncate">
                                                    {lead.fullName}
                                                </span>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                                                    {meta.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                                                <span className="font-mono text-amber-300">{lead.phone}</span>
                                                <span>Звонков: {lead.callAttempts}</span>
                                            </div>
                                            {lead.notes && (
                                                <p className="text-xs text-gray-500 mt-1 truncate">{lead.notes}</p>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Center Column: Active Call Card & Funnel Step Controls */}
                    <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
                        {!selectedLead ? (
                            <div className="my-auto text-center py-12">
                                <div className="text-4xl mb-3">🎧</div>
                                <h3 className="text-lg font-bold text-white">Карточка прозвона не выбрана</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Нажмите «Взять следующий контакт в прозвон» или выберите клиента из списка слева.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between border-b border-gray-800 pb-4">
                                    <div>
                                        <span
                                            className={`inline-block text-xs px-2.5 py-0.5 rounded-full border mb-2 ${
                                                STAGE_META[selectedLead.stage]?.badgeClass
                                            }`}
                                        >
                                            {STAGE_META[selectedLead.stage]?.label}
                                        </span>
                                        <h2 className="text-xl font-bold text-white">{selectedLead.fullName}</h2>
                                        <a
                                            href={`tel:${selectedLead.phone}`}
                                            className="inline-flex items-center gap-2 text-lg font-mono text-amber-400 hover:underline mt-1"
                                        >
                                            📲 {selectedLead.phone}
                                        </a>
                                    </div>
                                    <div className="text-right text-xs text-gray-400">
                                        <div>ID #{selectedLead.id}</div>
                                        <div>Попыток: {selectedLead.callAttempts}</div>
                                        {selectedLead.assignedToName && (
                                            <div className="text-gray-300 mt-1">👤 {selectedLead.assignedToName}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Stepper: Call -> Meeting -> Contract */}
                                <div className="bg-gray-800/60 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                                        Быстрый переход по воронке:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleStageTransition(selectedLead.id, 'MEETING_SCHEDULED')}
                                            className="text-xs py-2 px-3 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition"
                                        >
                                            🤝 1. Назначить встречу
                                        </button>
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleStageTransition(selectedLead.id, 'MEETING_COMPLETED')}
                                            className="text-xs py-2 px-3 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition"
                                        >
                                            🏢 2. Встреча проведена
                                        </button>
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleStageTransition(selectedLead.id, 'BOOKED')}
                                            className="text-xs py-2 px-3 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition"
                                        >
                                            🔒 3. Бронь квартиры
                                        </button>
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleStageTransition(selectedLead.id, 'CONTRACT_SIGNED')}
                                            className="text-xs py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition font-semibold"
                                        >
                                            ✍️ 4. Договор подписан
                                        </button>
                                    </div>
                                </div>

                                {/* Call Result Form */}
                                <div className="space-y-3 pt-2">
                                    <label className="block text-xs font-medium text-gray-300">
                                        Итог разговора / Комментарий (сохраняется в историчность):
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={callComment}
                                        onChange={(e) => setCallComment(e.target.value)}
                                        placeholder="О чем договорились с клиентом, какой ЖК/площадь интересует..."
                                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-sm text-white p-2.5 focus:border-amber-500 focus:outline-none"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">
                                                Дата/время встречи (если согласился):
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={meetingDateTime}
                                                onChange={(e) => setMeetingDateTime(e.target.value)}
                                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-xs text-white p-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-gray-400 mb-1">
                                                Дата/время перезвона:
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={callbackDateTime}
                                                onChange={(e) => setCallbackDateTime(e.target.value)}
                                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-xs text-white p-2"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">
                                            Причина отказа (заполняется только при отказе):
                                        </label>
                                        <input
                                            type="text"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Например: Уже купил / Дорого / Неверный номер"
                                            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-xs text-white p-2"
                                        />
                                    </div>

                                    <p className="text-xs font-semibold text-gray-400 pt-1">
                                        Зафиксировать исход звонка в 1 клик:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleLogCallOutcome('MEETING_AGREED')}
                                            className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                                        >
                                            🤝 Назначена встреча
                                        </button>
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleLogCallOutcome('CALLBACK_REQUESTED')}
                                            className="py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition"
                                        >
                                            🔄 Перезвонить позже
                                        </button>
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleLogCallOutcome('NO_ANSWER')}
                                            className="py-2.5 px-3 rounded-lg bg-orange-600/80 hover:bg-orange-500 text-white font-medium text-xs transition"
                                        >
                                            📵 Не берет / Занято
                                        </button>
                                        <button
                                            disabled={submitting}
                                            onClick={() => handleLogCallOutcome('REJECTED')}
                                            className="py-2.5 px-3 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-medium text-xs transition"
                                        >
                                            ✕ Отказ клиента
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Immutable History Timeline & Deal Thread Chat */}
                    <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col max-h-[780px]">
                        <h2 className="text-base font-bold text-white pb-3 border-b border-gray-800">
                            📜 Сквозная Историчность и Чат сделки
                        </h2>

                        {!selectedLead ? (
                            <p className="text-sm text-gray-500 py-12 text-center">
                                Выберите клиента, чтобы увидеть полную неизменяемую хронологию звонков, встреч и сообщений сотрудников.
                            </p>
                        ) : (
                            <>
                                {/* Mini Chat for this Lead */}
                                <div className="mt-3 bg-gray-950/70 border border-gray-800 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-amber-400 mb-2">
                                        💬 Внутренний чат сотрудников по клиенту
                                    </p>
                                    <div className="max-h-36 overflow-y-auto space-y-1.5 mb-2 pr-1">
                                        {threadMessages.length === 0 ? (
                                            <p className="text-xs text-gray-500">Нет сообщений по сделке</p>
                                        ) : (
                                            threadMessages.map((m) => (
                                                <div
                                                    key={m.id}
                                                    className={`text-xs p-2 rounded ${
                                                        m.isSystemEvent
                                                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                                            : 'bg-gray-800 text-gray-200'
                                                    }`}
                                                >
                                                    <span className="font-semibold text-amber-400">{m.senderName}: </span>
                                                    <span>{m.content}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <form onSubmit={handleSendThreadMessage} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={threadInput}
                                            onChange={(e) => setThreadInput(e.target.value)}
                                            placeholder="Написать юристу/РОПу по этой сделке..."
                                            className="flex-1 rounded bg-gray-800 border border-gray-700 text-xs text-white px-2.5 py-1.5"
                                        />
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-3 py-1.5 rounded bg-amber-500 text-gray-950 font-semibold text-xs"
                                        >
                                            ➤
                                        </button>
                                    </form>
                                </div>

                                {/* Immutable Activity Timeline */}
                                <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
                                    <p className="text-xs font-semibold text-gray-400 uppercase">
                                        Неизменяемый журнал событий ({timeline.length})
                                    </p>
                                    {timeline.map((item) => (
                                        <div
                                            key={item.id}
                                            className="relative pl-4 border-l-2 border-amber-500/40 py-1 text-xs space-y-1"
                                        >
                                            <div className="flex items-center justify-between text-gray-400">
                                                <span className="font-semibold text-white">{item.actorName}</span>
                                                <span>{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                                            </div>
                                            <p className="text-gray-200">{item.summary}</p>
                                            {item.oldValue && item.newValue && (
                                                <p className="text-[11px] text-amber-400/80">
                                                    {item.oldValue} → {item.newValue}
                                                </p>
                                            )}
                                        </div>
                                    ))}

                                    {callLogs.length > 0 && (
                                        <>
                                            <p className="text-xs font-semibold text-gray-400 uppercase pt-2">
                                                Детальный лог звонков ({callLogs.length})
                                            </p>
                                            {callLogs.map((call) => (
                                                <div
                                                    key={call.id}
                                                    className="bg-gray-800/50 border border-gray-800 rounded-lg p-2.5 text-xs"
                                                >
                                                    <div className="flex justify-between text-gray-300 font-medium">
                                                        <span>📞 {call.employeeName}</span>
                                                        <span className="text-amber-400">{call.outcome}</span>
                                                    </div>
                                                    {call.comment && (
                                                        <p className="text-gray-400 mt-1">{call.comment}</p>
                                                    )}
                                                    <p className="text-[10px] text-gray-500 mt-1">
                                                        {new Date(call.createdAt).toLocaleString('ru-RU')}
                                                    </p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: KANBAN FUNNEL (Calls -> Meetings -> Contracts) */}
            {activeTab === 'FUNNEL' && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
                    {KANBAN_COLUMNS.map((col) => {
                        const colLeads = leads.filter((l) => col.stages.includes(l.stage))
                        return (
                            <div
                                key={col.title}
                                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col min-h-[540px]"
                            >
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
                                    <span className="text-sm font-bold text-white">
                                        {col.icon} {col.title}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-amber-400 font-semibold">
                                        {colLeads.length}
                                    </span>
                                </div>

                                <div className="space-y-2.5 flex-1">
                                    {colLeads.map((lead) => (
                                        <div
                                            key={lead.id}
                                            className="bg-gray-800/60 border border-gray-700/70 rounded-lg p-3 space-y-2 hover:border-amber-500/40 transition"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <button
                                                    onClick={() => {
                                                        loadLeadHistory(lead.id)
                                                        setActiveTab('DIALER')
                                                    }}
                                                    className="text-sm font-semibold text-white hover:text-amber-400 text-left"
                                                >
                                                    {lead.fullName}
                                                </button>
                                                <span className="text-[10px] text-gray-400">#{lead.id}</span>
                                            </div>
                                            <p className="text-xs font-mono text-amber-300">{lead.phone}</p>
                                            {lead.notes && (
                                                <p className="text-xs text-gray-400 line-clamp-2">{lead.notes}</p>
                                            )}
                                            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-700/50">
                                                <span>Звонков: {lead.callAttempts}</span>
                                                <span>{lead.assignedToName || 'Общий пул'}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {lead.stage !== 'MEETING_SCHEDULED' && (
                                                    <button
                                                        onClick={() => handleStageTransition(lead.id, 'MEETING_SCHEDULED')}
                                                        className="text-[10px] px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                                                    >
                                                        → На встречу
                                                    </button>
                                                )}
                                                {lead.stage !== 'BOOKED' && (
                                                    <button
                                                        onClick={() => handleStageTransition(lead.id, 'BOOKED')}
                                                        className="text-[10px] px-2 py-1 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30"
                                                    >
                                                        → Бронь
                                                    </button>
                                                )}
                                                {lead.stage !== 'CONTRACT_SIGNED' && (
                                                    <button
                                                        onClick={() => handleStageTransition(lead.id, 'CONTRACT_SIGNED')}
                                                        className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                                    >
                                                        → Договор
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* TAB 3: ELECTRONIC SHEET IMPORT */}
            {activeTab === 'IMPORT' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                        <h2 className="text-lg font-bold text-white">
                            📥 Пакетная загрузка списка обзвона (вместо бумажных листов)
                        </h2>
                        <p className="text-xs text-gray-400">
                            Скопируйте столбец ФИО и телефонов из Excel / Google Таблиц или загрузите CSV-файл.
                            Система автоматически нормализует номера (`+7...`), отфильтрует дубликаты и создаст историчность.
                        </p>

                        <div>
                            <label className="block text-xs text-gray-300 mb-1">Название списка / смены:</label>
                            <input
                                type="text"
                                value={importFileName}
                                onChange={(e) => setImportFileName(e.target.value)}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-sm text-white p-2.5"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-300 mb-1">
                                Строки (`ФИО; Телефон; Комментарий` — по одной на строке):
                            </label>
                            <textarea
                                rows={8}
                                value={rawSheetText}
                                onChange={(e) => setRawSheetText(e.target.value)}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-xs font-mono text-white p-3"
                            />
                        </div>

                        <button
                            onClick={handleImportSheet}
                            disabled={submitting}
                            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition"
                        >
                            🚀 Загрузить список в электронную очередь обзвона
                        </button>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                        <h2 className="text-lg font-bold text-white">➕ Добавить одиночный контакт</h2>
                        <form onSubmit={handleCreateManualLead} className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-300 mb-1">ФИО клиента:</label>
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    placeholder="Например: Серик Ахметов"
                                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-sm text-white p-2.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-300 mb-1">Телефон *</label>
                                <input
                                    type="text"
                                    required
                                    value={manualPhone}
                                    onChange={(e) => setManualPhone(e.target.value)}
                                    placeholder="+7 701 000 00 00"
                                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-sm text-white p-2.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-300 mb-1">Первичный комментарий:</label>
                                <textarea
                                    rows={3}
                                    value={manualNotes}
                                    onChange={(e) => setManualNotes(e.target.value)}
                                    placeholder="Какой ЖК или планировка интересует..."
                                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-sm text-white p-2.5"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition"
                            >
                                Добавить в воронку
                            </button>
                        </form>

                        {analytics?.importBatches && analytics.importBatches.length > 0 && (
                            <div className="pt-4 border-t border-gray-800">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                                    История загруженных списков
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {analytics.importBatches.map((b) => (
                                        <div
                                            key={b.id}
                                            className="bg-gray-800/50 border border-gray-800 rounded-lg p-2.5 text-xs flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="text-white font-medium">{b.fileName}</p>
                                                <p className="text-gray-400">
                                                    Загрузил: {b.createdByName} • {new Date(b.createdAt).toLocaleString('ru-RU')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-emerald-400 font-semibold">+{b.importedCount}</span>
                                                <span className="text-gray-500 ml-2">(дублей: {b.duplicateCount})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
