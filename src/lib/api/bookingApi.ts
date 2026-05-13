import api from '@/lib/api'

export const bookingApi = {
    list: (size = 200, sort = 'createdAt,desc') =>
        api.get(`/bookings?size=${size}&sort=${sort}`),

    listRecent: (size = 5) =>
        api.get(`/bookings?size=${size}&sort=createdAt,desc`),

    myBookings: () =>
        api.get('/bookings/my'),

    create: (data: {
        targetType: 'APARTMENT' | 'PARKING_SPACE'
        apartmentId?: number | null
        parkingSpaceId?: number | null
        userId?: number | null
        bookingType: 'PREBOOKING' | 'BOOKING'
        notes?: string | null
        durationDays: number
    }) => api.post('/bookings', data),

    convert: (id: number) =>
        api.put(`/bookings/${id}/convert`),

    cancel: (id: number) =>
        api.delete(`/bookings/${id}`),
}
