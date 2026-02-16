import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import AdminGuard from './components/AdminGuard'
import HomePage from './pages/HomePage'
import MarketplacePage from './pages/MarketplacePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ProfilePage from './pages/ProfilePage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import ApartmentsPage from './pages/admin/ApartmentsPage'
import BookingsPage from './pages/admin/BookingsPage'
import ContractsPage from './pages/admin/ContractsPage'
import ParkingPage from './pages/admin/ParkingPage'
import TransactionsPage from './pages/admin/TransactionsPage'
import EmployeesPage from './pages/admin/EmployeesPage'
import ReportsPage from './pages/admin/ReportsPage'

function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="marketplace" element={<MarketplacePage />} />
                <Route path="marketplace/company/:companySlug" element={<MarketplacePage />} />
                <Route path="marketplace/company/:companySlug/complex/:complexSlug" element={<MarketplacePage />} />
                <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Admin routes */}
            <Route
                path="/admin"
                element={
                    <AdminGuard>
                        <AdminLayout />
                    </AdminGuard>
                }
            >
                <Route index element={<AdminDashboard />} />
                <Route path="apartments" element={<ApartmentsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="parking" element={<ParkingPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="reports" element={<ReportsPage />} />
            </Route>
        </Routes>
    )
}

export default App
