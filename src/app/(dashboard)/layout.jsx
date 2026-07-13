import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <main className="flex-1 overflow-hidden min-w-0">
                {children}
            </main>
        </div>
    )
}