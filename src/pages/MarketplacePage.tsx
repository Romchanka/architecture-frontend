import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { slugify } from '@/lib/slugify'
import { Apartment, Building, PagedResponse, Company } from '@/types'
import FloorPlanView from '@/components/FloorPlanView'

// Тип для ЖК (жилой комплекс)
interface Complex {
    id: number
    name: string
    address: string
    completionYear?: number
    description?: string
    imageUrl?: string
    companyId: number
    companyName: string
}

export default function MarketplacePage() {
    const { companySlug, complexSlug } = useParams()
    const navigate = useNavigate()

    const [companies, setCompanies] = useState<Company[]>([])
    const [complexes, setComplexes] = useState<Complex[]>([])
    const [apartments, setApartments] = useState<Apartment[]>([])
    const [buildings, setBuildings] = useState<Building[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingCompanies, setLoadingCompanies] = useState(true)
    const [loadingComplexes, setLoadingComplexes] = useState(false)

    // Derive selected entities by matching slug against loaded data
    const selectedCompany = useMemo(
        () => companySlug ? companies.find(c => slugify(c.name) === companySlug) : undefined,
        [companies, companySlug]
    )
    const selectedCompanyId = selectedCompany?.id ?? null

    const selectedComplex = useMemo(
        () => complexSlug ? complexes.find(c => slugify(c.name) === complexSlug) : undefined,
        [complexes, complexSlug]
    )
    const selectedComplexId = selectedComplex?.id ?? null

    // Загрузка списка компаний при монтировании
    useEffect(() => {
        fetchCompanies()
    }, [])

    // Загрузка ЖК при выборе компании
    useEffect(() => {
        if (selectedCompanyId) {
            fetchComplexes()
            setApartments([])
            setBuildings([])
        }
    }, [selectedCompanyId])

    // Загрузка квартир при выборе ЖК
    // Buildings must load before apartments (apartments depend on building IDs)
    useEffect(() => {
        if (selectedCompanyId && selectedComplexId) {
            const loadData = async () => {
                await fetchBuildings()
                await fetchApartments()
            }
            loadData()
        }
    }, [selectedComplexId])

    const fetchCompanies = async () => {
        try {
            setLoadingCompanies(true)
            const { data } = await api.get<Company[]>('/marketplace/companies')
            setCompanies(data)
        } catch (error) {
            console.error('Failed to fetch companies:', error)
        } finally {
            setLoadingCompanies(false)
        }
    }

    const fetchComplexes = async () => {
        if (!selectedCompanyId) return
        try {
            setLoadingComplexes(true)
            const { data } = await api.get<Complex[]>('/marketplace/complexes', {
                params: { companyId: selectedCompanyId }
            })
            setComplexes(data)
        } catch (error) {
            console.error('Failed to fetch complexes:', error)
        } finally {
            setLoadingComplexes(false)
        }
    }

    const fetchBuildings = async () => {
        if (!selectedCompanyId) return
        try {
            const { data } = await api.get<Building[]>('/marketplace/buildings', {
                params: { companyId: selectedCompanyId }
            })
            // Фильтруем здания по выбранному ЖК
            const filtered = selectedComplexId
                ? data.filter(b => b.complexId === selectedComplexId)
                : data
            setBuildings(filtered)
        } catch (error) {
            console.error('Failed to fetch buildings:', error)
        }
    }

    const fetchApartments = async () => {
        if (!selectedCompanyId) return

        try {
            setLoading(true)
            const { data } = await api.get<PagedResponse<Apartment>>('/marketplace/apartments', {
                params: {
                    companyId: selectedCompanyId,
                    complexId: selectedComplexId ?? undefined,
                    status: 'ALL',
                    page: 0,
                    size: 200
                }
            })
            // Server-side filtering by complexId — no client filtering needed
            setApartments(data.content)
        } catch (error) {
            console.error('Failed to fetch apartments:', error)
        } finally {
            setLoading(false)
        }
    }

    // Навигация назад
    const handleBackToComplexes = () => {
        navigate(`/marketplace/company/${companySlug}`)
    }

    if (loadingCompanies) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">Загрузка компаний...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Каталог квартир
                    </h1>
                    <p className="text-gray-600">
                        Выберите квартиру своей мечты в Бишкеке
                    </p>
                </div>

                {/* Breadcrumb Navigation */}
                {(selectedCompanyId || selectedComplexId) && (
                    <div className="mb-6 flex items-center gap-2 text-sm">
                        <button
                            onClick={() => navigate('/marketplace')}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                        >
                            Все компании
                        </button>
                        {selectedCompany && (
                            <>
                                <span className="text-gray-400">→</span>
                                <button
                                    onClick={handleBackToComplexes}
                                    className={selectedComplexId ? 'text-primary-600 hover:text-primary-800 font-medium' : 'text-gray-900 font-semibold'}
                                >
                                    {selectedCompany.name}
                                </button>
                            </>
                        )}
                        {selectedComplex && (
                            <>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-900 font-semibold">{selectedComplex.name}</span>
                            </>
                        )}
                    </div>
                )}

                {/* STEP 1: Company Selection */}
                {!selectedCompanyId && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-4">
                            Выберите застройщика
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {companies.map((company) => (
                                <button
                                    key={company.id}
                                    onClick={() => navigate(`/marketplace/company/${slugify(company.name)}`)}
                                    className="p-4 border-2 border-gray-200 rounded-lg transition-all hover:border-primary-300 hover:bg-gray-50 hover:shadow-md"
                                >
                                    <div className="flex flex-col items-center text-center">
                                        {company.logoUrl ? (
                                            <img
                                                src={company.logoUrl.startsWith('/uploads/')
                                                    ? 'https://static.tildacdn.one/tild3630-3435-4332-a433-643338376664/logo_nobel.png'
                                                    : company.logoUrl}
                                                alt={company.name}
                                                className="w-24 h-24 object-contain mb-2"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement
                                                    target.style.display = 'none'
                                                    target.parentElement?.querySelector('.logo-fallback')?.classList.remove('hidden')
                                                }}
                                            />
                                        ) : null}
                                        <div className={`w-24 h-24 bg-gray-200 rounded-lg mb-2 flex items-center justify-center logo-fallback ${company.logoUrl ? 'hidden' : ''}`}>
                                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">
                                            {company.name}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: Complex (ЖК) Selection */}
                {selectedCompanyId && !selectedComplexId && (
                    <>
                        {loadingComplexes ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                                <p className="mt-4 text-gray-600">Загрузка объектов...</p>
                            </div>
                        ) : complexes.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <p className="text-gray-600 text-lg">У этого застройщика пока нет объектов</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {complexes.map((complex) => (
                                    <button
                                        key={complex.id}
                                        onClick={() => navigate(`/marketplace/company/${companySlug}/complex/${slugify(complex.name)}`)}
                                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:border-primary-300 hover:-translate-y-1 text-left group"
                                    >
                                        {/* Изображение ЖК */}
                                        {complex.imageUrl ? (
                                            <div className="h-48 overflow-hidden">
                                                <img
                                                    src={complex.imageUrl.startsWith('/uploads/')
                                                        ? 'https://static.tildacdn.one/tild6432-3062-4764-b461-363430646565/231.jpg'
                                                        : complex.imageUrl}
                                                    alt={complex.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.style.display = 'none'
                                                        const parent = target.parentElement
                                                        if (parent) {
                                                            parent.className = 'h-48 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center'
                                                            parent.innerHTML = '<svg class="w-16 h-16 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>'
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                                                <svg className="w-16 h-16 text-primary-300 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-700 transition-colors">
                                                {complex.name}
                                            </h3>
                                            {complex.address && (
                                                <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {complex.address}
                                                </p>
                                            )}
                                            {complex.completionYear && (
                                                <p className="text-sm text-gray-500">
                                                    Сдача: {complex.completionYear} г.
                                                </p>
                                            )}
                                            {complex.description && (
                                                <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                                                    {complex.description}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* STEP 3: Apartments for selected Complex */}
                {selectedCompanyId && selectedComplexId && (
                    <>
                        {/* Floor Plan View */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                                <p className="mt-4 text-gray-600">Загрузка...</p>
                            </div>
                        ) : (
                            <FloorPlanView
                                apartments={apartments}
                                buildings={buildings}
                                companyId={selectedCompanyId}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
