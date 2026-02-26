import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import BottomNav from './BottomNav'

/**
 * Layout — Public page layout (SRP: composes header/footer/bottom-nav shell)
 * - Desktop: Header + Content + Footer
 * - Mobile: Header + Content + BottomNav (footer hidden)
 * - pb-20 on mobile prevents bottom nav from overlapping content
 */
export default function Layout() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow pb-20 md:pb-0">
                <Outlet />
            </main>
            {/* Footer only visible on desktop; mobile uses BottomNav */}
            <div className="hidden md:block">
                <Footer />
            </div>
            <BottomNav />
        </div>
    )
}
