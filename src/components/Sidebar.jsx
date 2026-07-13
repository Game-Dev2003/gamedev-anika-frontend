'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    ShoppingCart, Users, History, Package,
    Receipt, LogOut, Truck, UserCog,
    LayoutDashboard, Tag, FileText, BarChart2,
    ChevronLeft, ChevronRight ,PackagePlus
} from 'lucide-react'
import Cookies from 'js-cookie'
import { useTranslation } from 'react-i18next'
import LanguageToggle from './LanguageToggle'

export default function Sidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const [role, setRole] = useState('')
    const [username, setUsername] = useState('')
    const { t, i18n } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [, setLang] = useState('en')
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
    setMounted(true)
    setRole(localStorage.getItem('role') || '')
    setUsername(localStorage.getItem('username') || '')
    console.log('role:', localStorage.getItem('role')) 

        const handleResize = () => {
            if (window.innerWidth < 1024) setCollapsed(true)
            else setCollapsed(false)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const handleLangChange = (lng) => setLang(lng)
        i18n.on('languageChanged', handleLangChange)
        return () => i18n.off('languageChanged', handleLangChange)
    }, [i18n])

    const handleLogout = () => {
        localStorage.clear()
        Cookies.remove('token')
        Cookies.remove('role')
        router.push('/login')
    }

    const allMenuItems = [
        { label: mounted ? t('dashboard') : 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['ADMIN'] },
        { label: mounted ? t('newSale') : 'New Sale', icon: ShoppingCart, path: '/sales', roles: ['ADMIN', 'CASHIER'] },
        { label: mounted ? t('customers') : 'Customers', icon: Users, path: '/customers', roles: ['ADMIN', 'CASHIER'] },
        { label: mounted ? t('history') : 'History', icon: History, path: '/history', roles: ['ADMIN', 'CASHIER'] },
        { label: mounted ? t('billing') : 'Billing', icon: FileText, path: '/billing', roles: ['ADMIN', 'CASHIER'] },
        { label: mounted ? t('reports') : 'Reports', icon: BarChart2, path: '/reports', roles: ['ADMIN'] },
        { label: mounted ? t('products') : 'Products', icon: Package, path: '/products', roles: ['ADMIN'] },
        { label: mounted ? t('categories') : 'Categories', icon: Tag, path: '/categories', roles: ['ADMIN'] },
        { label: mounted ? t('suppliers') : 'Suppliers', icon: Truck, path: '/suppliers', roles: ['ADMIN'] },
        { label: mounted ? t('purchaseOrders') : 'Purchase Orders', icon: Receipt, path: '/purchase-orders', roles: ['ADMIN'] },
        { label: mounted ? t('users') : 'Users', icon: UserCog, path: '/users', roles: ['ADMIN'] },
        {
            label: mounted ? t('imports') : 'Imports',
            icon: PackagePlus,
            path: '/imports',
            roles: ['ADMIN']
        },

    ]

    const menuItems = allMenuItems.filter(item => item.roles.includes(role))

    return (
        <div className={`
            min-h-screen bg-white border-r border-gray-200 flex flex-col
            transition-all duration-300 ease-in-out flex-shrink-0
            ${collapsed ? 'w-16' : 'w-56'}
        `}>
            {/* Logo */}
            <div className={`p-4 border-b border-gray-100 flex items-center gap-2 ${collapsed ? 'justify-center flex-col' : 'justify-between'}`}>
                {!collapsed ? (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-sm">✿</span>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 text-sm whitespace-nowrap">Anika Beauty</p>
                                <p className="text-xs text-pink-500">LUXURY EXPERIENCE</p>
                            </div>
                        </div>
                        <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-pink-500 p-1 rounded-lg hover:bg-pink-50">
                            <ChevronLeft size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✿</span>
                        </div>
                        <button onClick={() => setCollapsed(false)} className="text-gray-400 hover:text-pink-500 p-1 rounded-lg hover:bg-pink-50">
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* Menu */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
                {!collapsed && (
                    <p className="text-xs text-gray-400 uppercase mb-2 px-2">Anika POS</p>
                )}
                {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.path
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            title={collapsed ? item.label : ''}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                                ${collapsed ? 'justify-center' : ''}
                                ${isActive ? 'bg-pink-50 text-pink-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}
                            `}
                        >
                            <Icon size={18} className="flex-shrink-0" />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                    )
                })}
            </nav>

            {/* User + Logout */}
            <div className={`p-3 border-t border-gray-100 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
                {!collapsed ? (
                    <div className="bg-pink-50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-gray-500">{mounted ? t('loggedInAs') : 'Logged in as'}</p>
                        <p className="text-pink-600 font-bold text-sm truncate">{username}</p>
                        <p className="text-xs text-gray-400">{role}</p>
                    </div>
                ) : (
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mb-1" title={username}>
                        <span className="text-pink-500 text-xs font-bold">{username?.slice(0, 1).toUpperCase()}</span>
                    </div>
                )}

                {!collapsed && (
                    <div className="flex items-center gap-2 mb-2">
                        <LanguageToggle />
                    </div>
                )}

                <button
                    onClick={handleLogout}
                    title={collapsed ? 'Logout' : ''}
                    className={`flex items-center gap-2 text-gray-500 hover:text-red-500 text-sm px-3 py-2 rounded-lg hover:bg-red-50 transition w-full ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut size={16} />
                    {!collapsed && (mounted ? t('logout') : 'Log Out')}
                </button>
            </div>
        </div>
    )
}