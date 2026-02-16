import api from '@/lib/api'

export const transactionApi = {
    list: (size = 200, sort = 'createdAt,desc') =>
        api.get(`/transactions?size=${size}&sort=${sort}`),

    create: (data: {
        contractId: number
        amount: number
        paymentType: string
        description?: string | null
    }) => api.post('/transactions', data),

    complete: (id: number) =>
        api.put(`/transactions/${id}/complete`),

    cancel: (id: number) =>
        api.put(`/transactions/${id}/cancel`),
}
