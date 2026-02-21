import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

type UserInfo = {
    id: number
    firstName: string
    lastName: string
    middleName?: string
    fullName: string
    phone: string
    email?: string
    address?: string
    passportNumber?: string
}

type ApartmentInfo = {
    apartmentId: number
    number: string
    totalArea?: number
    livingArea?: number
    floor?: number
    rooms?: number
    address?: string
    totalPrice: number
    paidAmount: number
    remainingAmount: number
    contractStatus?: string
    purchaseType?: string // "INSTALLMENT" or "FULL"
}

type PaymentInfo = {
    totalPrice: number
    paidAmount: number
    remainingAmount: number
}

type ProfileData = {
    userInfo: UserInfo
    apartments: ApartmentInfo[]
    paymentInfo?: PaymentInfo
}

type BookingItem = {
    id: number
    status: string
    bookingType?: string
    apartment: {
        apartmentNumber: string
        building: { name: string }
    }
    createdAt: string
}

function fmtPrice(n: number) {
    return new Intl.NumberFormat('ru-RU').format(Math.round(n))
}

export default function ProfilePage() {
    const { isAuthenticated, user } = useAuthStore()
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [bookings, setBookings] = useState<BookingItem[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [aptTab, setAptTab] = useState<'installment' | 'purchased'>('installment')
    const [form, setForm] = useState({
        firstName: '', lastName: '', middleName: '', email: '',
        address: '', passportNumber: '',
    })

    useEffect(() => {
        if (isAuthenticated) {
            fetchProfile()
            fetchBookings()
        }
    }, [isAuthenticated])

    const fetchProfile = async () => {
        setLoading(true)
        try {
            const res = await api.get('/profile')
            setProfile(res.data)

            const u = res.data.userInfo
            setForm({
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                middleName: u.middleName || '',
                email: u.email || '',
                address: u.address || '',
                passportNumber: u.passportNumber || '',
            })
        } catch (error) {
            console.error('Failed to fetch profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchBookings = async () => {
        try {
            const res = await api.get('/profile/bookings')
            const data = res.data
            setBookings(data.content || data || [])
        } catch (error) {
            console.error('Failed to fetch bookings:', error)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await api.put('/profile', form)
            setEditing(false)
            fetchProfile()
        } catch (error) {
            console.error('Failed to update profile:', error)
            alert('Ошибка при сохранении')
        } finally {
            setSaving(false)
        }
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />
    }

    const info = profile?.userInfo || user

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* User info */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >✏️ Редактировать</button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditing(false)}
                                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded transition-colors"
                                >Отмена</button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded font-medium transition-colors disabled:opacity-50"
                                >{saving ? 'Сохранение...' : 'Сохранить'}</button>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : editing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Фамилия</label>
                                <input
                                    value={form.lastName}
                                    onChange={e => setForm({ ...form, lastName: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Имя</label>
                                <input
                                    value={form.firstName}
                                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Отчество</label>
                                <input
                                    value={form.middleName}
                                    onChange={e => setForm({ ...form, middleName: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Адрес</label>
                                <input
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">Номер паспорта</label>
                                <input
                                    value={form.passportNumber}
                                    onChange={e => setForm({ ...form, passportNumber: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">ФИО</p>
                                <p className="text-lg font-medium">
                                    {info?.lastName} {info?.firstName} {info?.middleName}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Телефон</p>
                                <p className="text-lg font-medium">{info?.phone}</p>
                            </div>
                            {info?.email && (
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="text-lg font-medium">{info.email}</p>
                                </div>
                            )}
                            {(info as UserInfo)?.address && (
                                <div>
                                    <p className="text-sm text-gray-500">Адрес</p>
                                    <p className="text-lg font-medium">{(info as UserInfo).address}</p>
                                </div>
                            )}
                            {(info as UserInfo)?.passportNumber && (
                                <div>
                                    <p className="text-sm text-gray-500">Паспорт</p>
                                    <p className="text-lg font-medium">{(info as UserInfo).passportNumber}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Apartments with Tabs */}
                {profile && profile.apartments.length > 0 && (() => {
                    const installmentApts = profile.apartments.filter(a =>
                        a.purchaseType === 'INSTALLMENT' || (!a.purchaseType && a.remainingAmount > 0)
                    )
                    const purchasedApts = profile.apartments.filter(a =>
                        a.purchaseType === 'FULL' || (!a.purchaseType && a.remainingAmount <= 0)
                    )

                    return (
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 mb-4">
                                <button
                                    onClick={() => setAptTab('installment')}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${aptTab === 'installment'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    В рассрочке ({installmentApts.length})
                                </button>
                                <button
                                    onClick={() => setAptTab('purchased')}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${aptTab === 'purchased'
                                        ? 'border-green-600 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Купленные ({purchasedApts.length})
                                </button>
                            </div>

                            {/* Content */}
                            {aptTab === 'installment' ? (
                                installmentApts.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>Нет квартир в рассрочке</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {installmentApts.map(apt => (
                                            <div key={apt.apartmentId} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold text-lg">Квартира №{apt.number}</h3>
                                                        {apt.address && (
                                                            <p className="text-sm text-gray-600">{apt.address}</p>
                                                        )}
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {apt.rooms && `${apt.rooms}-комн.`} {apt.totalArea && `${apt.totalArea} м²`}
                                                            {apt.floor && `, ${apt.floor} этаж`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500">Стоимость</p>
                                                        <p className="text-lg font-bold text-gray-900">{fmtPrice(apt.totalPrice)} сом</p>
                                                    </div>
                                                </div>
                                                {/* Payment progress */}
                                                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span className="text-gray-600">Оплачено</span>
                                                        <span className="font-medium text-green-700">{fmtPrice(apt.paidAmount)} сом</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, (apt.paidAmount / apt.totalPrice) * 100)}%` }}
                                                        />
                                                    </div>
                                                    {apt.remainingAmount > 0 && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Осталось: {fmtPrice(apt.remainingAmount)} сом
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                purchasedApts.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>Нет купленных квартир</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {purchasedApts.map(apt => (
                                            <div key={apt.apartmentId} className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold text-lg">Квартира №{apt.number}</h3>
                                                        {apt.address && (
                                                            <p className="text-sm text-gray-600">{apt.address}</p>
                                                        )}
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {apt.rooms && `${apt.rooms}-комн.`} {apt.totalArea && `${apt.totalArea} м²`}
                                                            {apt.floor && `, ${apt.floor} этаж`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-1">
                                                            ✅ Оплачено
                                                        </span>
                                                        <p className="text-lg font-bold text-gray-900">{fmtPrice(apt.totalPrice)} сом</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    )
                })()}

                {/* Bookings */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Мои бронирования
                    </h2>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
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
                                                Квартира №{booking.apartment?.apartmentNumber || '—'}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {booking.apartment?.building?.name || ''}
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
