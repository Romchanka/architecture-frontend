// Employee / Admin types

export type EmployeeRole = 'SUPER_USER' | 'ADMIN' | 'ACCOUNTANT' | 'CONSULTANT'

export interface EmployeeUser {
    id: number
    phone: string
    fullName: string
    userType: EmployeeRole
    companyId: number
    isActive: boolean
}

export interface CompanyStatistics {
    totalApartments: number
    availableApartments: number
    bookedApartments: number
    soldApartments: number
    totalBookings: number
    activeBookings: number
    totalContracts: number
    signedContracts: number
    totalParkingSpaces: number
    availableParkingSpaces: number
    totalRevenue: number
    receivedPayments: number
}

export interface BookingResponse {
    id: number
    apartmentId: number
    apartmentNumber: string
    userId: number | null
    userName: string | null
    consultantId: number | null
    consultantName: string | null
    bookingType: 'PREBOOKING' | 'BOOKING'
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'CONVERTED'
    expiryDate: string
    notes: string | null
    expired: boolean
    active: boolean
    createdAt: string
    updatedAt: string
}

export interface ContractResponse {
    id: number
    contractNumber: string
    apartmentId: number
    buyerId: number
    buyerName: string
    consultantId: number
    consultantName: string
    apartmentPrice: number
    parkingPrice: number
    discount: number
    totalPrice: number
    status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'IN_PAYMENT' | 'PAID' | 'CANCELLED' | 'COMPLETED'
    signedDate: string | null
    documentUrl: string | null
    createdAt: string
    updatedAt: string
}

export interface TransactionResponse {
    id: number
    contractId: number
    amount: number
    paymentType: string
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
    paymentDate: string | null
    description: string | null
    createdAt: string
}

export interface ApartmentAdminResponse {
    id: number
    apartmentNumber: string
    floor: number
    rooms: number
    areaTotal: number
    areaLiving: number | null
    areaKitchen: number | null
    pricePerSqm: number
    totalPrice: number
    status: 'AVAILABLE' | 'PREBOOKED' | 'BOOKED' | 'SOLD'
    buildingId: number
    buildingName: string
    complexName: string
    layoutPlanUrl: string | null
    notes: string | null
}

export interface ParkingSpaceResponse {
    id: number
    spaceNumber: string
    floor: number
    type: string
    price: number
    status: 'AVAILABLE' | 'RESERVED' | 'SOLD'
    buildingId: number
    contractId: number | null
}

// Navigation items per role
export const ADMIN_NAV: Record<EmployeeRole, { label: string; path: string; icon: string }[]> = {
    CONSULTANT: [
        { label: 'Дашборд', path: '/admin', icon: '📊' },
        { label: 'Квартиры', path: '/admin/apartments', icon: '🏠' },
        { label: 'Бронирования', path: '/admin/bookings', icon: '📋' },
        { label: 'Договоры', path: '/admin/contracts', icon: '📄' },
        { label: 'Парковки', path: '/admin/parking', icon: '🅿️' },
    ],
    ACCOUNTANT: [
        { label: 'Дашборд', path: '/admin', icon: '📊' },
        { label: 'Платежи', path: '/admin/transactions', icon: '💰' },
        { label: 'Договоры', path: '/admin/contracts', icon: '📄' },
    ],
    ADMIN: [
        { label: 'Дашборд', path: '/admin', icon: '📊' },
        { label: 'Квартиры', path: '/admin/apartments', icon: '🏠' },
        { label: 'Бронирования', path: '/admin/bookings', icon: '📋' },
        { label: 'Договоры', path: '/admin/contracts', icon: '📄' },
        { label: 'Парковки', path: '/admin/parking', icon: '🅿️' },
        { label: 'Платежи', path: '/admin/transactions', icon: '💰' },
        { label: 'Сотрудники', path: '/admin/employees', icon: '👥' },
        { label: 'Отчёты', path: '/admin/reports', icon: '📈' },
    ],
    SUPER_USER: [
        { label: 'Дашборд', path: '/admin', icon: '📊' },
        { label: 'Квартиры', path: '/admin/apartments', icon: '🏠' },
        { label: 'Бронирования', path: '/admin/bookings', icon: '📋' },
        { label: 'Договоры', path: '/admin/contracts', icon: '📄' },
        { label: 'Парковки', path: '/admin/parking', icon: '🅿️' },
        { label: 'Платежи', path: '/admin/transactions', icon: '💰' },
        { label: 'Сотрудники', path: '/admin/employees', icon: '👥' },
        { label: 'Отчёты', path: '/admin/reports', icon: '📈' },
    ],
}

export const ROLE_LABELS: Record<EmployeeRole, string> = {
    SUPER_USER: 'Супер Юзер',
    ADMIN: 'Администратор',
    ACCOUNTANT: 'Бухгалтер',
    CONSULTANT: 'Консультант',
}
