import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import AdminLayout from './components/layout/AdminLayout'
import AdminGuard from './components/AdminGuard'
import RoleRoute from './components/RoleRoute'
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

            {/* Admin routes — role-protected */}
            <Route
                path="/admin"
                element={
                    <AdminGuard>
                        <AdminLayout />
                    </AdminGuard>
                }
            >
                <Route index element={<AdminDashboard />} />
                <Route path="apartments" element={<RoleRoute path="/admin/apartments"><ApartmentsPage /></RoleRoute>} />
                <Route path="bookings" element={<RoleRoute path="/admin/bookings"><BookingsPage /></RoleRoute>} />
                <Route path="contracts" element={<RoleRoute path="/admin/contracts"><ContractsPage /></RoleRoute>} />
                <Route path="parking" element={<RoleRoute path="/admin/parking"><ParkingPage /></RoleRoute>} />
                <Route path="transactions" element={<RoleRoute path="/admin/transactions"><TransactionsPage /></RoleRoute>} />
                <Route path="employees" element={<RoleRoute path="/admin/employees"><EmployeesPage /></RoleRoute>} />
                <Route path="reports" element={<RoleRoute path="/admin/reports"><ReportsPage /></RoleRoute>} />
            </Route>
        </Routes>
    )
}

export default App
