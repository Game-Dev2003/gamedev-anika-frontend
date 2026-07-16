'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ShoppingCart, Users, Package, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '@/components/Skeleton'

export default function DashboardPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [username, setUsername] = useState('')
    const [sales, setSales] = useState([])
    const [customers, setCustomers] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [chartType, setChartType] = useState('day')

    useEffect(() => {
        setMounted(true)
        const token = localStorage.getItem('token')
        if (!token) { router.push('/login'); return }
        setUsername(localStorage.getItem('username') || 'Admin')
        fetchData()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchData = async () => {
        try {
            const [salesRes, customersRes, productsRes] = await Promise.all([
                api.get('/sales'),
                api.get('/customers'),
                api.get('/products')
            ])
            setSales(salesRes.data || [])
            setCustomers(customersRes.data || [])
            setProducts(productsRes.data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // ✅ [ຈຸດທີ່ປັບປຸງ]: ຄຳນວນຍອດລາຍຮັບລວມ ໂດຍຫັກບິນທີ່ເປັນ 'refunded' ອອກບໍ່ເອົາມາຮວມ
    const totalRevenue = sales.reduce((sum, s) => {
        const status = s.payments && s.payments.length > 0 ? s.payments[0].status : 'pending'
        if (status === 'refunded') return sum // ຖ້າ Refund ແລ້ວ ໃຫ້ຂ້າມໄປ ບໍ່ຕ້ອງບວກເງິນເຂົ້າ
        return sum + Number(s.grandTotal || 0)
    }, 0)

    // ✅ [ຈຸດທີ່ປັບປຸງ]: ຈຳນວນໃບບິນຂາຍຫຼັກ ກໍບໍ່ນັບບິນທີ່ຖືກ Refund ເຊັ່ນກັນ
    const totalOrders = sales.filter(s => {
        const status = s.payments && s.payments.length > 0 ? s.payments[0].status : 'pending'
        return status !== 'refunded'
    }).length

    const totalCustomers = customers.length
    const lowStockProducts = products.filter(p => Number(p.quantityOnHand || 0) <= 10).length

    const stats = [
        { label: T('totalRevenue', 'Total Revenue'), value: `${totalRevenue.toLocaleString('lo-LA')} ₭`, icon: TrendingUp, color: 'bg-pink-100 text-pink-500', change: '+12% this month' },
        { label: T('totalOrders', 'Total Orders'), value: totalOrders, icon: ShoppingCart, color: 'bg-blue-100 text-blue-500', change: `${totalOrders} sales` },
        { label: T('totalCustomers', 'Total Customers'), value: totalCustomers, icon: Users, color: 'bg-green-100 text-green-500', change: `${totalCustomers} registered` },
        { label: T('lowStockAlert', 'Low Stock'), value: lowStockProducts, icon: Package, color: 'bg-orange-100 text-orange-500', change: T('productsNeedRestock', 'products need restock') },
    ]

    // ✅ [ຈຸດທີ່ປັບປຸງ]: ກຣາຟລາຍວັນ ຈະບໍ່ເອົາຍອດບິນ Refund ມາສະແດງຜົນ
    const chartByDay = sales.reduce((acc, sale) => {
        if (!sale.saleDatetime) return acc
        
        const status = sale.payments && sale.payments.length > 0 ? sale.payments[0].status : 'pending'
        if (status === 'refunded') return acc // ບໍ່ເອົາຍອດບິນ Refund ມາຂຶ້ນກຣາຟ

        const date = new Date(sale.saleDatetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const existing = acc.find(d => d.date === date)
        if (existing) { 
            existing.revenue += Number(sale.grandTotal || 0)
            existing.orders += 1 
        } else {
            acc.push({ date, revenue: Number(sale.grandTotal || 0), orders: 1 })
        }
        return acc
    }, []).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14)

    // ✅ [ຈຸດທີ່ປັບປຸງ]: ກຣາຟລາຍເດືອນ ຈະບໍ່ເອົາຍອດບິນ Refund ມາສະແດງຜົນ
    const chartByMonth = sales.reduce((acc, sale) => {
        if (!sale.saleDatetime) return acc

        const status = sale.payments && sale.payments.length > 0 ? sale.payments[0].status : 'pending'
        if (status === 'refunded') return acc // ບໍ່ເອົາຍອດບິນ Refund ມາຂຶ້ນກຣາຟ

        const month = new Date(sale.saleDatetime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const existing = acc.find(d => d.date === month)
        if (existing) { 
            existing.revenue += Number(sale.grandTotal || 0)
            existing.orders += 1 
        } else {
            acc.push({ date: month, revenue: Number(sale.grandTotal || 0), orders: 1 })
        }
        return acc
    }, [])

    const chartData = chartType === 'day' ? chartByDay : chartByMonth

    return (
        <div className="p-4 lg:p-6 overflow-y-auto bg-white min-h-screen text-left">
            {/* Welcome */}
            <div className="mb-6">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-800">
                    {T('welcome', 'Welcome back')}, {username}! 👋
                </h1>
                <p className="text-gray-400 text-sm mt-1 hidden lg:block">
                    {T('dashboardSubtitle', "Here's what's happening at Anika Beauty Shop today.")}
                </p>
            </div>

            {/* Stats */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                    <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                    {stats.map((stat, i) => {
                        const Icon = stat.icon
                        return (
                            <div key={`stat-card-${i}`} className="bg-white border border-gray-100 rounded-xl p-4 lg:p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs lg:text-sm text-gray-500 leading-tight">{stat.label}</p>
                                    <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                                        <Icon size={16} />
                                    </div>
                                </div>
                                <p className="text-xl lg:text-2xl font-bold text-gray-800">{stat.value}</p>
                                <p className="text-xs text-gray-400 mt-1 hidden lg:block">{stat.change}</p>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Chart */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 lg:p-5 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-sm lg:text-base">{T('revenueOverview', 'Revenue Overview')}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setChartType('day')} className={`px-2 lg:px-3 py-1 rounded-lg text-xs transition ${chartType === 'day' ? 'bg-pink-500 text-white' : 'border border-gray-200 text-gray-600'}`}>{T('daily', 'Daily')}</button>
                        <button onClick={() => setChartType('month')} className={`px-2 lg:px-3 py-1 rounded-lg text-xs transition ${chartType === 'month' ? 'bg-pink-500 text-white' : 'border border-gray-200 text-gray-600'}`}>{T('monthly', 'Monthly')}</button>
                    </div>
                </div>
                {loading ? (
                    <div className="h-40 lg:h-48 bg-gray-50 rounded-lg animate-pulse" />
                ) : chartData.length === 0 ? (
                    <div className="h-40 lg:h-48 flex items-center justify-center text-gray-400 text-sm">{T('noData', 'No data available')}</div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `${Number(v).toLocaleString('lo-LA')} ₭`} width={80} />
                            <Tooltip formatter={(value) => [`${Number(value).toLocaleString('lo-LA')} ₭`, T('revenue', 'Revenue')]} contentStyle={{ borderRadius: '8px', border: '1px solid #fce7f3', fontSize: '12px' }} />
                            <Bar dataKey="revenue" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Recent Sales */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 lg:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800 text-sm lg:text-base">{T('recentSales', 'Recent Sales')}</h3>
                        <button onClick={() => router.push('/history')} className="text-xs text-pink-500 hover:underline">{T('viewAll', 'View all')}</button>
                    </div>
                    <div className="space-y-3">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={`skeleton-sale-${i}`} className="flex justify-between animate-pulse">
                                    <div className="space-y-1"><div className="h-3 bg-gray-100 rounded w-20" /><div className="h-3 bg-gray-100 rounded w-28" /></div>
                                    <div className="space-y-1"><div className="h-3 bg-gray-100 rounded w-16" /><div className="h-3 bg-gray-100 rounded w-12" /></div>
                                </div>
                            ))
                        ) : sales.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                                <span className="text-3xl mb-2">🧾</span>
                                <p className="text-sm text-gray-400">{T('noSalesYet', 'No sales yet')}</p>
                            </div>
                        ) : sales.slice(0, 5).map((sale, index) => (
                            <div key={`recent-sale-${sale.saleId || index}`} className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-800">#{sale.billNo}</p>
                                    <p className="text-xs text-gray-400">{sale.customer?.customerName || T('walkInCustomer', 'Walk-in Customer')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-pink-500">{Number(sale.grandTotal || 0).toLocaleString('lo-LA')} ₭</p>
                                    <p className="text-xs text-gray-400">{sale.saleDatetime ? new Date(sale.saleDatetime).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stock Alert */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 lg:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800 text-sm lg:text-base">{T('stockAlert', 'Stock Alert')}</h3>
                        <button onClick={() => router.push('/products')} className="text-xs text-pink-500 hover:underline">{T('viewAll', 'View all')}</button>
                    </div>
                    <div className="space-y-3">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={`skeleton-stock-${i}`} className="flex justify-between animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                                        <div className="space-y-1"><div className="h-3 bg-gray-100 rounded w-24" /><div className="h-3 bg-gray-100 rounded w-16" /></div>
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded w-12" />
                                </div>
                            ))
                        ) : products.filter(p => Number(p.quantityOnHand || 0) <= 50).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                                <span className="text-3xl mb-2">✅</span>
                                <p className="text-sm text-gray-400">{T('allInStock', 'All products in stock')}</p>
                            </div>
                        ) : products.filter(p => Number(p.quantityOnHand || 0) <= 50).slice(0, 5).map((product, idx) => (
                            <div key={`alert-product-${product.productId || idx}`} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center text-sm flex-shrink-0">✿</div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{product.productName}</p>
                                        <p className="text-xs text-gray-400">{product.category?.categoryName}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <p className={`text-sm font-bold ${Number(product.quantityOnHand || 0) <= 10 ? 'text-red-500' : 'text-orange-500'}`}>{product.quantityOnHand} units</p>
                                    <p className={`text-xs ${Number(product.quantityOnHand || 0) <= 10 ? 'text-red-400' : 'text-orange-400'}`}>{Number(product.quantityOnHand || 0) <= 10 ? T('critical', 'Critical') : T('lowStock', 'Low Stock')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}