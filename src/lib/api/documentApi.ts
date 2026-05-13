import api from '@/lib/api'

export const documentApi = {
    search: (params?: { query?: string; documentType?: string; page?: number; size?: number }) =>
        api.get('/files/document-center', { params }),
}
