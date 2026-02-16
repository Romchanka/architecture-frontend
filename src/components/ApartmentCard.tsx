import { Apartment } from '@/types'
import { useNavigate } from 'react-router-dom'

interface ApartmentCardProps {
    apartment: Apartment
}

export default function ApartmentCard({ apartment }: ApartmentCardProps) {
    const navigate = useNavigate()

    // Маппинг планировок на CDN URL по количеству комнат
    const getLayoutImage = (url?: string, rooms?: number): string | null => {
        const cdnLayouts: Record<number, string> = {
            1: 'https://static.tildacdn.one/tild6530-3966-4461-b963-316165353837/1_.webp',
            2: 'https://static.tildacdn.one/tild3435-6636-4230-b463-666661636236/2_.webp',
            3: 'https://static.tildacdn.one/tild3739-6435-4035-b466-373138303938/3_.webp',
        }
        // Если URL начинается с /uploads/ или это PDF — подменяем на CDN
        if (url && !url.startsWith('/uploads/') && !url.endsWith('.pdf') && url.startsWith('http')) {
            return url
        }
        // Фоллбэк по количеству комнат
        if (rooms && cdnLayouts[rooms]) {
            return cdnLayouts[rooms]
        }
        return url || null
    }

    const layoutImage = getLayoutImage(apartment.layoutPlanUrl, apartment.rooms)

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ru-RU').format(price) + ' сом'
    }

    const getStatusBadge = (status: string) => {
        const badges = {
            AVAILABLE: { text: 'Доступно', class: 'bg-green-100 text-green-800' },
            PREBOOKED: { text: 'Забронировано', class: 'bg-yellow-100 text-yellow-800' },
            BOOKED: { text: 'Занято', class: 'bg-orange-100 text-orange-800' },
            SOLD: { text: 'Продано', class: 'bg-red-100 text-red-800' },
        }
        const badge = badges[status as keyof typeof badges] || badges.AVAILABLE
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.class}`}>
                {badge.text}
            </span>
        )
    }

    const handleBooking = () => {
        // Check if user is authenticated
        const token = localStorage.getItem('token')

        if (!token) {
            // Redirect to login page with return URL
            navigate('/login', { state: { from: '/marketplace', apartmentId: apartment.id } })
        } else {
            // TODO: Open booking modal or navigate to booking page
            // For now, just show an alert
            alert(`Бронирование квартиры №${apartment.apartmentNumber}. Функция в разработке.`)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Image placeholder */}
            <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white">
                {layoutImage ? (
                    <img
                        src={layoutImage}
                        alt={`Квартира ${apartment.apartmentNumber}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                        }}
                    />
                ) : (
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <p className="text-sm">Фото скоро появится</p>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Status badge */}
                <div className="mb-3">
                    {getStatusBadge(apartment.status)}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Квартира №{apartment.apartmentNumber}
                </h3>

                {/* Building info */}
                <p className="text-sm text-gray-600 mb-3">
                    {apartment.buildingName} • {apartment.floor} этаж
                </p>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                        </svg>
                        {apartment.rooms} комн.
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                        {apartment.areaTotal} м²
                    </div>
                </div>

                {/* Price */}
                <div className="border-t pt-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Цена</p>
                            <p className="text-2xl font-bold text-primary-600">
                                {formatPrice(apartment.totalPrice)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">за м²</p>
                            <p className="text-sm font-medium text-gray-700">
                                {formatPrice(apartment.pricePerSqm)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action button */}
                {apartment.status === 'AVAILABLE' && (
                    <button
                        onClick={handleBooking}
                        className="w-full mt-4 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                        Забронировать
                    </button>
                )}
            </div>
        </div>
    )
}
