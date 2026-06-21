import { useEffect, useState, useCallback } from 'react'
import { PageHeader, Modal, ModalBody, ModalFooter, SubmitButton, ModalError, FormField, inputCls } from '@/components/admin'
import { calendarApi, CalendarEvent } from '@/lib/api/calendarApi'

const EVENT_TYPES: Record<string, { label: string; icon: string; color: string }> = {
    BIRTHDAY: { label: 'День рождения', icon: '🎂', color: '#ec4899' },
    MEETING: { label: 'Встреча', icon: '🤝', color: '#3b82f6' },
    CORPORATE: { label: 'Корпоратив', icon: '🎉', color: '#f59e0b' },
    HOLIDAY: { label: 'Праздник', icon: '🎆', color: '#10b981' },
    OTHER: { label: 'Другое', icon: '📌', color: '#6b7280' },
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
    const day = new Date(year, month - 1, 1).getDay()
    return day === 0 ? 6 : day - 1 // Monday = 0
}

const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

export default function CalendarPage() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
    const [error, setError] = useState('')
    const [syncing, setSyncing] = useState(false)

    // Form state
    const [form, setForm] = useState({
        title: '', description: '', eventType: 'OTHER',
        eventDate: '', eventTime: '', color: '#f59e0b', isAllDay: true,
    })

    const loadEvents = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await calendarApi.getByMonth(year, month)
            setEvents(data)
        } catch (err) { console.error('Failed to load calendar events:', err) }
        finally { setLoading(false) }
    }, [year, month])

    useEffect(() => { loadEvents() }, [loadEvents])

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1) }
        else setMonth(m => m - 1)
    }
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1) }
        else setMonth(m => m + 1)
    }

    const openCreate = (day?: number) => {
        const d = day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
        setForm({ title: '', description: '', eventType: 'OTHER', eventDate: d, eventTime: '', color: '#f59e0b', isAllDay: true })
        setEditEvent(null); setError(''); setShowModal(true)
    }

    const openEdit = (ev: CalendarEvent) => {
        setForm({
            title: ev.title, description: ev.description || '', eventType: ev.eventType,
            eventDate: ev.eventDate, eventTime: ev.eventTime || '', color: ev.color, isAllDay: ev.isAllDay,
        })
        setEditEvent(ev); setError(''); setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.title || !form.eventDate) { setError('Заполните название и дату'); return }
        try {
            if (editEvent) {
                await calendarApi.update(editEvent.id, form as any)
            } else {
                await calendarApi.create(form as any)
            }
            setShowModal(false); loadEvents()
        } catch (err: any) { setError(err.response?.data?.message || 'Ошибка сохранения') }
    }

    const handleDelete = async () => {
        if (!editEvent) return
        try { await calendarApi.delete(editEvent.id); setShowModal(false); loadEvents() }
        catch (err: any) { setError(err.response?.data?.message || 'Ошибка удаления') }
    }

    const handleSyncBirthdays = async () => {
        setSyncing(true)
        try { await calendarApi.syncBirthdays(); loadEvents() }
        catch (err) { console.error(err) }
        finally { setSyncing(false) }
    }

    // Calendar grid
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfWeek(year, month)
    const today = now.getDate()
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month

    const eventsOnDay = (day: number) => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return events.filter(e => e.eventDate === dateStr)
    }

    // Upcoming events list
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today).padStart(2, '0')}`
    const upcoming = [...events]
        .filter(e => e.eventDate >= todayStr || !isCurrentMonth)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        .slice(0, 8)

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <PageHeader title="HR-Календарь" count={events.length} />
                <div className="flex gap-2">
                    <button
                        onClick={handleSyncBirthdays}
                        disabled={syncing}
                        className="px-3 py-2 text-xs rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors disabled:opacity-50"
                        id="calendar-sync-birthdays"
                    >
                        {syncing ? '⏳ Синхронизация...' : '🎂 Синхр. ДР'}
                    </button>
                    <button
                        onClick={() => openCreate()}
                        className="px-3 py-2 text-xs rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        id="calendar-create-event"
                    >
                        + Новое событие
                    </button>
                </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" id="calendar-prev">
                    ← Назад
                </button>
                <h2 className="text-lg font-semibold text-white">{MONTH_NAMES[month - 1]} {year}</h2>
                <button onClick={nextMonth} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" id="calendar-next">
                    Далее →
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar grid */}
                <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAYS.map(d => (
                            <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>
                        ))}
                    </div>
                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1
                            const dayEvents = eventsOnDay(day)
                            const isToday = isCurrentMonth && day === today
                            return (
                                <div
                                    key={day}
                                    onClick={() => openCreate(day)}
                                    className={`aspect-square rounded-lg p-1 cursor-pointer transition-all duration-150 border ${
                                        isToday
                                            ? 'bg-amber-500/15 border-amber-500/30 ring-1 ring-amber-500/20'
                                            : dayEvents.length > 0
                                                ? 'bg-gray-800/60 border-gray-700 hover:border-gray-600'
                                                : 'border-transparent hover:bg-gray-800/40 hover:border-gray-800'
                                    }`}
                                    id={`calendar-day-${day}`}
                                >
                                    <div className={`text-xs font-medium ${isToday ? 'text-amber-400' : 'text-gray-400'}`}>
                                        {day}
                                    </div>
                                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                                        {dayEvents.slice(0, 2).map(ev => (
                                            <div
                                                key={ev.id}
                                                onClick={(e) => { e.stopPropagation(); openEdit(ev) }}
                                                className="text-[10px] leading-tight truncate rounded px-0.5"
                                                style={{ color: ev.color, backgroundColor: `${ev.color}15` }}
                                            >
                                                {EVENT_TYPES[ev.eventType]?.icon || '📌'} {ev.title.slice(0, 12)}
                                            </div>
                                        ))}
                                        {dayEvents.length > 2 && (
                                            <div className="text-[10px] text-gray-500">+{dayEvents.length - 2}</div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Upcoming events sidebar */}
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Ближайшие события</h3>
                    {loading ? (
                        <p className="text-xs text-gray-500">Загрузка...</p>
                    ) : upcoming.length === 0 ? (
                        <p className="text-xs text-gray-500">Нет событий в этом месяце</p>
                    ) : (
                        <div className="space-y-2">
                            {upcoming.map(ev => (
                                <div
                                    key={ev.id}
                                    onClick={() => openEdit(ev)}
                                    className="p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors border border-gray-800 hover:border-gray-700"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                                        <span className="text-xs font-medium text-gray-200 truncate">{ev.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 ml-4">
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(ev.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: ev.color, backgroundColor: `${ev.color}15` }}>
                                            {EVENT_TYPES[ev.eventType]?.label || ev.eventType}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <Modal open={showModal} title={editEvent ? 'Редактировать событие' : 'Новое событие'} onClose={() => setShowModal(false)}>
                    <ModalBody>
                        {error && <ModalError message={error} />}
                        <FormField label="Название">
                            <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Название события" id="event-title" />
                        </FormField>
                        <FormField label="Тип события">
                            <select className={inputCls} value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value, color: EVENT_TYPES[e.target.value]?.color || '#f59e0b' }))} id="event-type">
                                {Object.entries(EVENT_TYPES).map(([key, { label, icon }]) => (
                                    <option key={key} value={key}>{icon} {label}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="Дата">
                            <input type="date" className={inputCls} value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} id="event-date" />
                        </FormField>
                        {!form.isAllDay && (
                            <FormField label="Время">
                                <input type="time" className={inputCls} value={form.eventTime} onChange={e => setForm(f => ({ ...f, eventTime: e.target.value }))} id="event-time" />
                            </FormField>
                        )}
                        <FormField label="">
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                <input type="checkbox" checked={form.isAllDay} onChange={e => setForm(f => ({ ...f, isAllDay: e.target.checked }))} className="rounded" />
                                Весь день
                            </label>
                        </FormField>
                        <FormField label="Описание">
                            <textarea className={inputCls} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Описание (необязательно)" id="event-description" />
                        </FormField>
                        <FormField label="Цвет">
                            <div className="flex gap-2 items-center">
                                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" id="event-color" />
                                <span className="text-xs text-gray-400">{form.color}</span>
                            </div>
                        </FormField>
                    </ModalBody>
                    <ModalFooter>
                        {editEvent && (
                            <button onClick={handleDelete} className="px-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors" id="event-delete">
                                Удалить
                            </button>
                        )}
                        <div className="flex-1" />
                        <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">
                            Отмена
                        </button>
                        <SubmitButton onClick={handleSave} label={editEvent ? 'Сохранить' : 'Создать'} />
                    </ModalFooter>
                </Modal>
            )}
        </div>
    )
}
