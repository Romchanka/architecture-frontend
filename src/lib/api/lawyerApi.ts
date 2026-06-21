import api from '@/lib/api'

export const lawyerApi = {
    getOverdueContracts: (page = 0, size = 20) =>
        api.get(`/lawyers/contracts/overdue?page=${page}&size=${size}`),

    terminateContract: (id: number, reason: string) =>
        api.post(`/lawyers/contracts/${id}/terminate?reason=${encodeURIComponent(reason)}`),

    uploadLegalDocument: (id: number, file: File, title: string, notes?: string) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', title)
        if (notes) formData.append('notes', notes)
        
        return api.post(`/lawyers/contracts/${id}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
}
