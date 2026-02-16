import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Booking } from '@/types'

export default function ProfilePage() {
    const { isAuthenticated, user } = useAuthStore()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isAuthenticated) {
            fetchBookings()
        }
    }, [isAuthenticated])

    const fetchBookings = async () => {
        try {
            const { data } = await api.get('/bookings/my')
            setBookings(data)
        } catch (error) {
            console.error('Failed to fetch bookings:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* User info */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Личный кабинет
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">ФИО</p>
                            <p className="text-lg font-medium">
                                {user?.lastName} {user?.firstName} {user?.middleName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Телефон</p>
                            <p className="text-lg font-medium">{user?.phone}</p>
                        </div>
                        {user?.email && (
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="text-lg font-medium">{user.email}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bookings */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Мои бронирования
                    </h2>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>У вас пока нет бронирований</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking) => (
                                <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg">
                                                Квартира №{booking.apartment.apartmentNumber}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {booking.apartment.building.name}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Создано: {new Date(booking.createdAt).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                booking.status === 'CONVERTED' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {booking.status === 'ACTIVE' ? 'Активно' :
                                                booking.status === 'CONVERTED' ? 'Оформлено' :
                                                    booking.status === 'CANCELLED' ? 'Отменено' : 'Истекло'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
