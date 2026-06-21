import api from '@/lib/api'

export interface CalendarEvent {
    id: number
    title: string
    description: string | null
    eventType: string
    eventDate: string
    eventTime: string | null
    endDate: string | null
    isAllDay: boolean
    isRecurring: boolean
    recurrenceRule: string | null
    color: string
    companyId: number | null
    createdAt: string
}

export const calendarApi = {
    getByMonth: (year: number, month: number) =>
        api.get<CalendarEvent[]>('/calendar/events', { params: { year, month } }),

    getAll: () =>
        api.get<CalendarEvent[]>('/calendar/events/all'),

    create: (event: Partial<CalendarEvent>) =>
        api.post<CalendarEvent>('/calendar/events', event),

    update: (id: number, event: Partial<CalendarEvent>) =>
        api.put<CalendarEvent>(`/calendar/events/${id}`, event),

    delete: (id: number) =>
        api.delete(`/calendar/events/${id}`),

    syncBirthdays: (companyId?: number) =>
        api.post('/calendar/sync-birthdays', null, { params: companyId ? { companyId } : {} }),
}
