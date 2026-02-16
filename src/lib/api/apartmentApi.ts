import api from '@/lib/api'

export const apartmentApi = {
    list: (size = 200) =>
        api.get(`/apartments?size=${size}`),

    getById: (id: number) =>
        api.get(`/apartments/${id}`),
}
