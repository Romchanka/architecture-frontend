import api from '@/lib/api'

export const marketplaceApi = {
    book: (companyId: number, apartmentId: number) =>
        api.post(`/marketplace/book?companyId=${companyId}&apartmentId=${apartmentId}`),
}
