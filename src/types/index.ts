// Apartment types
export interface Apartment {
    id: number
    // Company info (flat)
    companyId: number
    companyName: string
    // Complex info (flat)
    complexId: number
    complexName: string
    complexAddress: string
    // Building info (flat)
    buildingId: number
    buildingName: string
    // Apartment details
    apartmentNumber: string
    floor: number
    rooms: number
    areaTotal: number
    areaLiving?: number
    areaKitchen?: number
    pricePerSqm: number
    totalPrice: number
    status: 'AVAILABLE' | 'PREBOOKED' | 'BOOKED' | 'SOLD'
    layoutPlanUrl?: string
    apartmentData?: string
    notes?: string
    createdAt?: string
    updatedAt?: string
}

export interface Building {
    id: number
    complexId: number
    complexName: string
    name: string
    buildingNumber?: string
    totalFloors: number
    entranceCount?: number
    apartmentsCount?: number
    description?: string
    floorPlanUrl?: string
    buildingData?: string
    createdAt?: string
    updatedAt?: string
}

export interface RealEstateComplex {
    id: number
    name: string
    description?: string
    location: string
    company: Company
}

export interface Company {
    id: number
    name: string
    description?: string
    logoUrl?: string
}

// User types
export interface User {
    id: number
    phone: string
    email?: string
    firstName: string
    lastName: string
    middleName?: string
    address?: string
}

// Booking types
export interface Booking {
    id: number
    apartment: Apartment
    user: User
    bookingType: 'PREBOOKING' | 'BOOKING'
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'CONVERTED'
    expiryDate: string
    notes?: string
    createdAt: string
}

// Contract types
export interface Contract {
    id: number
    contractNumber: string
    apartment: Apartment
    buyer: User
    apartmentPrice: number
    parkingPrice?: number
    discount?: number
    totalPrice: number
    status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'IN_PAYMENT' | 'PAID' | 'CANCELLED' | 'COMPLETED'
    signedDate?: string
    documentUrl?: string
    createdAt: string
}

// Auth types
export interface LoginRequest {
    phone: string
    password: string
}

export interface RegisterRequest {
    phone: string
    password: string
    firstName: string
    lastName: string
    middleName?: string
    email?: string
}

export interface OtpRequest {
    phone: string
    transactionId?: string
}

export interface OtpSendResponse {
    token: string
    transactionId: string
    status: number
    description: string
}

export interface OtpVerifyRequest {
    token: string
    code: string
}

export interface LoginResponse {
    token: string
    refreshToken: string
    tokenType: string
    expiresIn: number
}

export interface AuthResponse {
    token: string
    refreshToken: string
    user: User
}

// API Response types
export interface PagedResponse<T> {
    content: T[]
    totalElements: number
    totalPages: number
    size: number
    number: number
}
