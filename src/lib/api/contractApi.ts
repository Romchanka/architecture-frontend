import api from '@/lib/api'

export const contractApi = {
    list: (size = 200, sort = 'createdAt,desc') =>
        api.get(`/contracts?size=${size}&sort=${sort}`),

    create: (data: {
        bookingId: number
        buyerId: number | null
        passportNumber: string
        discountPercent?: number | null
        notes?: string | null
        installmentMonths?: number | null
        paymentDay?: number | null
    }) => api.post('/contracts', data),

    createFromBooking: (bookingId: string | number) =>
        api.post(`/contracts/from-booking/${bookingId}`),

    sign: (id: number) =>
        api.put(`/contracts/${id}/sign`),

    confirmPayment: (id: number) =>
        api.put(`/contracts/${id}/confirm-payment`),

    cancel: (id: number) =>
        api.delete(`/contracts/${id}`),

    downloadPdf: (id: number) =>
        api.get(`/contracts/${id}/document`, { responseType: 'blob' }),
}
