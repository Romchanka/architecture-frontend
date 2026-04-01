import api from '@/lib/api'

export const reportApi = {
    companyStatistics: () =>
        api.get('/reports/company-statistics'),

    consultantPerformance: () =>
        api.get('/reports/consultants-performance'),

    financial: () =>
        api.get('/reports/financial'),
}
