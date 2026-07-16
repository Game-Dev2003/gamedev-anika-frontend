'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Download, Calendar, Users, Package, TrendingUp, AlertTriangle, X, FileText, ShoppingBag } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { SkeletonRow } from '@/components/Skeleton'

export default function ReportsPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [sales, setSales] = useState([])
    const [users, setUsers] = useState([])
    const [products, setProducts] = useState([])
    const [imports, setImports] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('income-day')
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [endDate, setEndDate] = useState(new Date())
    
    const [selectedDateSales, setSelectedDateSales] = useState(null)
    const [selectedDateImports, setSelectedDateImports] = useState(null)
    const [selectedEmployeeSales, setSelectedEmployeeSales] = useState(null)
    const [detailTitle, setDetailTitle] = useState('')

    useEffect(() => {
        setMounted(true)
        fetchAll()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchAll = async () => {
        try {
            const [salesRes, usersRes, productsRes, importsRes] = await Promise.all([
                api.get('/sales'),
                api.get('/users'),
                api.get('/products'),
                api.get('/imports'),
            ])
            setSales(salesRes.data || [])
            setUsers(usersRes.data || [])
            setProducts(productsRes.data || [])
            setImports(importsRes.data || [])
        } catch (err) {
            toast.error('ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ! / Failed to load data!')
        } finally {
            setLoading(false)
        }
    }

    const filteredSales = sales.filter(s => {
        if (!s.saleDatetime) return false
        const saleDate = new Date(s.saleDatetime)
        return saleDate >= new Date(new Date(startDate).setHours(0, 0, 0, 0)) &&
            saleDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999))
    })

    const filteredImports = imports.filter(imp => {
        if (!imp.importDate) return false
        const impDate = new Date(imp.importDate)
        return impDate >= new Date(new Date(startDate).setHours(0, 0, 0, 0)) &&
            impDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999))
    })

    // 📊 [ປັບປຸງ Logic]: ຄຳນວນລາຍຮັບແຍກຕາມວັນ ໂດຍຫັກບິນ Refund ອອກ
    const incomeByDay = filteredSales.reduce((acc, sale) => {
        const status = sale.payments && sale.payments.length > 0 ? sale.payments[0].status : 'pending';
        if (status === 'refunded') return acc;

        const date = new Date(sale.saleDatetime).toLocaleDateString('lo-LA', {
            month: 'short', day: 'numeric', year: 'numeric'
        })
        acc[date] = (acc[date] || 0) + Number(sale.grandTotal || 0)
        return acc
    }, {})

    // 📊 [ປັບປຸງ Logic]: ຄຳນວນລາຍຮັບແຍກຕາມເດືອນ ໂດຍຫັກບິນ Refund ອອກ
    const incomeByMonth = filteredSales.reduce((acc, sale) => {
        const status = sale.payments && sale.payments.length > 0 ? sale.payments[0].status : 'pending';
        if (status === 'refunded') return acc;

        const month = new Date(sale.saleDatetime).toLocaleDateString('lo-LA', {
            month: 'long', year: 'numeric'
        })
        acc[month] = (acc[month] || 0) + Number(sale.grandTotal || 0)
        return acc
    }, {})

    const expenseByDay = filteredImports.reduce((acc, imp) => {
        const date = new Date(imp.importDate).toLocaleDateString('lo-LA', {
            month: 'short', day: 'numeric', year: 'numeric'
        })
        if (!acc[date]) acc[date] = { totalCost: 0, count: 0 }
        acc[date].totalCost += (Number(imp.costPrice || 0) * Number(imp.quantity || 0))
        acc[date].count += 1
        return acc
    }, {})

    const expenseByMonth = filteredImports.reduce((acc, imp) => {
        const month = new Date(imp.importDate).toLocaleDateString('lo-LA', {
            month: 'long', year: 'numeric'
        })
        if (!acc[month]) acc[month] = { totalCost: 0, count: 0 }
        acc[month].totalCost += (Number(imp.costPrice || 0) * Number(imp.quantity || 0))
        acc[month].count += 1
        return acc
    }, {})

    const employeeReport = users.map(user => {
        const userSales = sales.filter(s => s.user?.id === user.id)
        const totalRevenue = userSales.reduce((sum, s) => {
            const status = s.payments && s.payments.length > 0 ? s.payments[0].status : 'pending';
            if (status === 'refunded') return sum;
            return sum + Number(s.grandTotal || 0);
        }, 0)
        return { ...user, totalSales: userSales.filter(s => (s.payments && s.payments[0]?.status !== 'refunded')).length, totalRevenue }
    })

    const today = new Date()
    const expiredProducts = products.filter(p => p.expiryDate && new Date(p.expiryDate) <= today)
    const nearExpiredProducts = products.filter(p => {
        if (!p.expiryDate) return false
        const expDate = new Date(p.expiryDate)
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
        return diffDays > 0 && diffDays <= 30
    })

    // 📊 [ປັບປຸງ Logic]: ຄຳນວນຍອດຮວມລາຍຮັບຫຼັກ ໃຫ້ຫັກບິນ Refund ອອກ
    const totalRevenue = filteredSales.reduce((sum, s) => {
        const status = s.payments && s.payments.length > 0 ? s.payments[0].status : 'pending';
        if (status === 'refunded') return sum;
        return sum + Number(s.grandTotal || 0);
    }, 0)

    const totalExpenseCost = filteredImports.reduce((sum, imp) => sum + (Number(imp.costPrice || 0) * Number(imp.quantity || 0)), 0)
    const profitOrLoss = totalRevenue - totalExpenseCost
    const isProfit = profitOrLoss >= 0

    const exportExcel = (data, sheetName, filename) => {
        if (data.length === 0) {
            toast.error('ບໍ່ມີຂໍ້ມູນໃນການດຶງອອກ / No data to export!')
            return
        }
        const ws = XLSX.utils.json_to_sheet(data)
        Object.keys(ws).forEach((cellRef) => {
            if (cellRef.startsWith('!')) return;
            const colLetter = cellRef.replace(/[0-9]/g, ''); 
            const headerCell = ws[`${colLetter}1`];
            const headerValue = headerCell ? String(headerCell.v) : '';
            const cell = ws[cellRef];
            if (cell && cell.t === 'n') {
                if (headerValue.includes('ລາຍຮັບ') || headerValue.includes('ຕົ້ນທຶນ') || headerValue.includes('₭')) {
                    cell.z = '#,##0" ₭"'; 
                } else {
                    cell.z = '0';
                }
            }
        });
        ws['!cols'] = Object.keys(data[0]).map(() => ({ wch: 22 }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
        toast.success('ດຶງຂໍ້ມູນອອກເປັນ Excel ພ້ອມ Format ເງິນສຳເລັດແລ້ວ!')
    }

    const tabs = [
        { id: 'income-day', label: T('incomePerDay', 'ລາຍຮັບ/ວັນ'), icon: TrendingUp },
        { id: 'income-month', label: T('incomePerMonth', 'ລາຍຮັບ/ເດືອນ'), icon: TrendingUp },
        { id: 'expense-day', label: T('expensePerDay', 'ລາຍຈ່າຍ/ວັນ'), icon: Package },
        { id: 'expense-month', label: T('expensePerMonth', 'ລາຍຈ່າຍ/ເດືອນ'), icon: Package },
        { id: 'employee', label: T('employeeReport', 'ພະນັກງານ'), icon: Users },
        { id: 'expired', label: T('expiredProducts', 'ສິນຄ້າໝົດອາຍຸ'), icon: AlertTriangle },
    ]

    const DateFilter = () => (
        <div className="flex items-center gap-3 mb-4 flex-wrap text-left">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm">
                <Calendar size={14} className="text-gray-400" />
                <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} className="text-xs text-gray-600 outline-none w-24 cursor-pointer font-medium" dateFormat="dd MMM yyyy" />
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm">
                <Calendar size={14} className="text-gray-400" />
                <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} className="text-xs text-gray-600 outline-none w-24 cursor-pointer font-medium" dateFormat="dd MMM yyyy" minDate={startDate} />
            </div>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden bg-gray-50/50">
            <Toaster />
            <div className="mb-6 text-left">
                <h1 className="text-xl font-bold text-gray-800">{T('reports', 'ລາຍງານລະບົບ')}</h1>
                <p className="text-sm text-gray-400 mt-1">{T('reportsSubtitle', 'ຕິດຕາມສະຖິຕິລາຍຮັບ-ລາຍຈ່າຍ ແລະ ວິເຄາະຂໍ້ມູນບັນຊີພາຍໃນຮ້ານ Anika Beauty')}</p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3 overflow-x-auto">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${activeTab === tab.id ? 'bg-pink-500 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:border-pink-300'}`}>
                            <Icon size={14} />{tab.label}
                        </button>
                    )
                })}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><p className="text-xs text-gray-400 font-bold">ລາຍຮັບລວມ (Income)</p><p className="text-lg lg:text-xl font-black text-pink-500 mt-1">{totalRevenue.toLocaleString('lo-LA')} ₭</p></div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><p className="text-xs text-gray-400 font-bold">ຕົ້ນທຶນລວມ (Expense)</p><p className="text-lg lg:text-xl font-black text-red-500 mt-1">{totalExpenseCost.toLocaleString('lo-LA')} ₭</p></div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"><p className="text-xs text-gray-400 font-bold">ຈຳນວນໃບບິນຂາຍ</p><p className="text-lg lg:text-xl font-black text-blue-500 mt-1">{filteredSales.filter(s => s.payments?.[0]?.status !== 'refunded').length} ບິນ</p></div>
                <div className={`border rounded-2xl p-4 shadow-sm transition-all bg-white ${isProfit ? 'border-green-200' : 'border-amber-200'}`}><p className={`text-xs font-bold ${isProfit ? 'text-green-600' : 'text-amber-600'}`}>{isProfit ? 'ກຳໄລສຸດທິ (Net Profit)' : 'າດທຶນສຸດທິ (Net Loss)'}</p><p className={`text-lg lg:text-xl font-black mt-1 ${isProfit ? 'text-green-600' : 'text-red-500'}`}>{isProfit ? '+' : ''}{profitOrLoss.toLocaleString('lo-LA')} ₭</p></div>
            </div>

            <div className="flex-1 overflow-auto bg-white rounded-2xl border border-gray-200 p-4 lg:p-6 shadow-sm">
                {activeTab === 'income-day' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 text-sm lg:text-base">📊 {T('dailyIncomeReport', 'ລາຍງານລາຍຮັບລາຍວັນ')}</h2>
                            <button onClick={() => exportExcel(Object.entries(incomeByDay).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, total], i) => ({ 'ລຳດັບ': i + 1, 'ວັນທີ': date, 'ຈຳນວນໃບບິນ': filteredSales.filter(s => new Date(s.saleDatetime).toLocaleDateString('lo-LA', { month: 'short', day: 'numeric', year: 'numeric' }) === date && s.payments?.[0]?.status !== 'refunded').length, 'ລາຍຮັບລວມ (₭)': total })), 'ລາຍຮັບລາຍວັນ', 'income-by-day')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"><Download size={13} />{T('exportExcel', 'Export Excel')}</button>
                        </div>
                        <DateFilter />
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-pink-500 border-b border-gray-100 bg-gray-50/50 font-bold text-left">
                                    <th className="py-3 px-2">#</th>
                                    <th className="py-3 px-2">{T('date', 'ວันທີ')}</th>
                                    <th className="py-3 px-2 text-right">{T('bills', 'ຈຳນວນໃບບິນ')}</th>
                                    <th className="py-3 px-2 text-right">{T('income', 'ລາຍຮັບ (₭)')}</th>
                                </tr>
                            </thead>
                            <tbody className="text-left">
                                {loading ? <><SkeletonRow cols={4} /><SkeletonRow cols={4} /></> : Object.entries(incomeByDay).length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງເວລານີ້</td></tr> : Object.entries(incomeByDay).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, total], index) => (
                                    <tr key={`inc-day-${date}`} onClick={() => { const daySales = filteredSales.filter(s => new Date(s.saleDatetime).toLocaleDateString('lo-LA', { month: 'short', day: 'numeric', year: 'numeric' }) === date && s.payments?.[0]?.status !== 'refunded'); setDetailTitle(date); setSelectedDateSales(daySales); }} className="border-b border-gray-50 hover:bg-pink-50/30 transition cursor-pointer">
                                        <td className="py-3 px-2 text-xs text-gray-400">{index + 1}</td>
                                        <td className="py-3 px-2 text-xs text-gray-700 font-bold">{date}</td>
                                        <td className="py-3 px-2 text-xs text-right text-blue-600 font-bold underline">{filteredSales.filter(s => new Date(s.saleDatetime).toLocaleDateString('lo-LA', { month: 'short', day: 'numeric', year: 'numeric' }) === date && s.payments?.[0]?.status !== 'refunded').length} ບິນ</td>
                                        <td className="py-3 px-2 text-sm font-black text-pink-500 text-right">{total.toLocaleString('lo-LA')} ₭</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'income-month' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 text-sm lg:text-base">📅 {T('monthlyIncomeReport', 'ລາຍງານລາຍຮັບລາຍເດືອນ')}</h2>
                            <button onClick={() => exportExcel(Object.entries(incomeByMonth).map(([month, total], i) => ({ 'ລຳດັບ': i + 1, 'ປະຈຳເດືອນ': month, 'ຈຳນວນໃບບິນຂາຍ': filteredSales.filter(s => new Date(s.saleDatetime).toLocaleDateString('lo-LA', { month: 'long', year: 'numeric' }) === month && s.payments?.[0]?.status !== 'refunded').length, 'ລາຍຮັບລວມ (₭)': total })), 'ລາຍຮັບລາຍເດືອນ', 'income-by-month')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"><Download size={13} />{T('exportExcel', 'Export Excel')}</button>
                        </div>
                        <DateFilter />
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-pink-500 border-b border-gray-100 bg-gray-50/50 font-bold text-left">
                                    <th className="py-3 px-2">#</th>
                                    <th className="py-3 px-2">ປະຈຳເດືອນ</th>
                                    <th className="py-3 px-2 text-right">ຈຳນວນໃບບິນ</th>
                                    <th className="py-3 px-2 text-right">ລາຍຮັບລວມ (₭)</th>
                                </tr>
                            </thead>
                            <tbody className="text-left">
                                {loading ? <><SkeletonRow cols={4} /><SkeletonRow cols={4} /></> : Object.entries(incomeByMonth).length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">ບໍ່ມີຂໍ້ມູນ</td></tr> : Object.entries(incomeByMonth).map(([month, total], index) => (
                                    <tr key={`inc-month-${month}`} onClick={() => { const monthSales = filteredSales.filter(s => new Date(s.saleDatetime).toLocaleDateString('lo-LA', { month: 'long', year: 'numeric' }) === month && s.payments?.[0]?.status !== 'refunded'); setDetailTitle(month); setSelectedDateSales(monthSales); }} className="border-b border-gray-50 hover:bg-pink-50/30 transition cursor-pointer">
                                        <td className="py-3 px-2 text-xs text-gray-400">{index + 1}</td>
                                        <td className="py-3 px-2 text-xs text-gray-700 font-bold">{month}</td>
                                        <td className="py-3 px-2 text-xs text-right text-blue-600 font-bold underline">{filteredSales.filter(s => new Date(s.saleDatetime).toLocaleDateString('lo-LA', { month: 'long', year: 'numeric' }) === month && s.payments?.[0]?.status !== 'refunded').length} ບິນ</td>
                                        <td className="py-3 px-2 text-sm font-black text-pink-500 text-right">{total.toLocaleString('lo-LA')} ₭</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'expense-day' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 text-sm lg:text-base">📦 ລາຍງານລາຍຈ່າຍຕົ້ນທຶນລາຍວັນ</h2>
                            <button onClick={() => exportExcel(Object.entries(expenseByDay).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, data], i) => ({ 'ລຳດັບ': i + 1, 'ວັນທີນຳເຂົ້າ': date, 'ຈຳນວນລາຍການສິນຄ້າ': data.count, 'ຕົ້ນທຶນລວມ (₭)': data.totalCost })), 'ລາຍຈ່າຍລายວັນ', 'expense-by-day')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"><Download size={13} />{T('exportExcel', 'Export Excel')}</button>
                        </div>
                        <DateFilter />
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-pink-500 border-b border-gray-100 bg-gray-50/50 font-bold text-left">
                                    <th className="py-3 px-2">#</th>
                                    <th className="py-3 px-2">ວັນທີນຳເຂົ້າ</th>
                                    <th className="py-3 px-2 text-right">ຈຳນວນລາຍການ</th>
                                    <th className="py-3 px-2 text-right">ຕົ້ນທຶນລວມ (₭)</th>
                                </tr>
                            </thead>
                            <tbody className="text-left">
                                {loading ? <><SkeletonRow cols={4} /><SkeletonRow cols={4} /></> : Object.entries(expenseByDay).length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">ບໍ່ມີຂໍ້ມູນ</td></tr> : Object.entries(expenseByDay).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, data], index) => (
                                    <tr key={`exp-day-${date}`} onClick={() => { const dayImports = filteredImports.filter(imp => new Date(imp.importDate).toLocaleDateString('lo-LA', { month: 'short', day: 'numeric', year: 'numeric' }) === date); setDetailTitle(date); setSelectedDateImports(dayImports); }} className="border-b border-gray-50 hover:bg-pink-50/30 transition cursor-pointer">
                                        <td className="py-3 px-2 text-xs text-gray-400">{index + 1}</td>
                                        <td className="py-3 px-2 text-xs text-gray-700 font-bold">{date}</td>
                                        <td className="py-3 px-2 text-xs text-right text-orange-600 font-bold underline">{data.count} ລາຍການນຳເຂົ້າ</td>
                                        <td className="py-3 px-2 text-sm font-black text-red-500 text-right">{data.totalCost.toLocaleString('lo-LA')} ₭</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'expense-month' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 text-sm lg:text-base">🏢 ລາຍງານລາຍຈ່າຍຕົ້ນທຶນລາຍεດືອນ</h2>
                            <button onClick={() => exportExcel(Object.entries(expenseByMonth).map(([month, data], i) => ({ 'ລຳດັບ': i + 1, 'ປະຈຳເດືອນ': month, 'ຈຳນວນລາຍການສິນຄ້າ': data.count, 'ຕົ້ນທຶນລວມ (₭)': data.totalCost })), 'ລາຍຈ່າຍລายເດືອນ', 'expense-by-month')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"><Download size={13} />{T('exportExcel', 'Export Excel')}</button>
                        </div>
                        <DateFilter />
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-pink-500 border-b border-gray-100 bg-gray-50/50 font-bold text-left">
                                    <th className="py-3 px-2">#</th>
                                    <th className="py-3 px-2">ປະຈຳເດືອນ</th>
                                    <th className="py-3 px-2 text-right">ຈຳນວນລາຍການ</th>
                                    <th className="py-3 px-2 text-right">ຕົ້ນທຶນລວມ (₭)</th>
                                </tr>
                            </thead>
                            <tbody className="text-left">
                                {loading ? <><SkeletonRow cols={4} /><SkeletonRow cols={4} /></> : Object.entries(expenseByMonth).length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-xs">ບໍ່ມີຂໍ້ມູນ</td></tr> : Object.entries(expenseByMonth).map(([month, data], index) => (
                                    <tr key={`exp-month-${month}`} onClick={() => { const monthImports = filteredImports.filter(imp => new Date(imp.importDate).toLocaleDateString('lo-LA', { month: 'long', year: 'numeric' }) === month); setDetailTitle(month); setSelectedDateImports(monthImports); }} className="border-b border-gray-50 hover:bg-pink-50/30 transition cursor-pointer">
                                        <td className="py-3 px-2 text-xs text-gray-400">{index + 1}</td>
                                        <td className="py-3 px-2 text-xs text-gray-700 font-bold">{month}</td>
                                        <td className="py-3 px-2 text-xs text-right text-orange-600 font-bold underline">{data.count} ລາຍການນຳເຂົ້າ</td>
                                        <td className="py-3 px-2 text-sm font-black text-red-500 text-right">{data.totalCost.toLocaleString('lo-LA')} ₭</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'employee' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 text-sm lg:text-base">👩‍💼 ລາຍງານຍອດຂາຍຂອງພະນັກງານ</h2>
                            <button onClick={() => exportExcel(employeeReport.map((u, i) => ({ 'ລຳດັບ': i + 1, 'ชື່ພະນັກງານ': u.username, 'ອີເມວ': u.email || '-', 'ຕຳແໜ່ງ': u.role, 'ສະຖານະບັນຊີ': u.isActive ? 'ເປີດໃຊ້ງານ' : 'ປິດບັນຊີ', 'ຈຳນວນບິນຂາຍໄດ້': u.totalSales, 'ຍອດລາຍຮັບທີ່ເຮັດໄດ້ (₭)': u.totalRevenue })), 'ລາຍງານພະນັກງານ', 'employee-report')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"><Download size={13} />Export Excel</button>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-pink-500 border-b border-gray-100 bg-gray-50/50 font-bold text-left">
                                    <th className="py-3 px-2">ພະນັກງານ</th>
                                    <th className="py-3 px-2">ອີເມວ</th>
                                    <th className="py-3 px-2">ຕຳແໜ່ງ</th>
                                    <th className="py-3 px-2">ສະຖານະ</th>
                                    <th className="py-3 px-2 text-right">ຈຳນວນບິນຂາຍ</th>
                                    <th className="py-3 px-2 text-right">ລາຍຮັບຮວມ (₭)</th>
                                </tr>
                            </thead>
                            <tbody className="text-left">
                                {loading ? <><SkeletonRow cols={6} /><SkeletonRow cols={6} /></> : employeeReport.map((user, idx) => (
                                    <tr key={`report-emp-${user.id || idx}`} onClick={() => { const empSales = filteredSales.filter(s => s.user?.id === user.id && s.payments?.[0]?.status !== 'refunded'); setDetailTitle(user.username); setSelectedEmployeeSales(empSales); }} className="border-b border-gray-50 hover:bg-pink-50/30 transition cursor-pointer">
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-xs font-bold text-pink-500">{user.username?.slice(0, 2).toUpperCase()}</div>
                                                <span className="text-sm font-bold text-gray-800">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 text-xs text-gray-500">{user.email || '-'}</td>
                                        <td className="py-3 px-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-500'}`}>{user.role}</span></td>
                                        <td className="py-3 px-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{user.isActive ? 'ເປີດໃຊ້ງານ' : 'ປິດ'}</span></td>
                                        <td className="py-3 px-2 text-xs text-right text-pink-600 font-extrabold underline">{user.totalSales} ບິນ</td>
                                        <td className="py-3 px-2 text-sm font-black text-pink-500 text-right">{user.totalRevenue.toLocaleString('lo-LA')} ₭</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'expired' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 text-sm lg:text-base">🚨 ລາຍງານກວດສອບສິນຄ້າໝົດອາຍຸ</h2>
                            <button onClick={() => exportExcel([...expiredProducts, ...nearExpiredProducts].map((p, i) => ({ 'ລຳດັບ': i + 1, 'ຊື່ສິນຄ້າ': p.productName, 'ໝວດໝູ່': p.category?.categoryName || '-', 'ວັນໝົດອາຍຸ': p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('lo-LA') : '-', 'ຈຳນວນສະຕ໋ອກຄ້າງ': p.quantityOnHand, 'ສະຖານະສະຕ໋ອກ': new Date(p.expiryDate) <= today ? 'ໝົດອາຍຸແລ້ວ' : 'ໃກ້ໝົດອາຍຸ (ພາຍໃນ 30 ວັນ)' })), 'ສິນຄ້າໝົດອາຍຸ', 'expired-products')} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"><Download size={13} />{T('exportExcel', 'Export Excel')}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-red-50 rounded-xl p-4 border border-red-100"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-red-500" /><p className="text-xs text-red-500 font-bold">ໝົດອາຍຸແລ້ວ (Expired)</p></div><p className="text-2xl font-black text-red-500">{expiredProducts.length} ລາຍການ</p></div>
                            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={16} className="text-orange-500" /><p className="text-xs text-orange-500 font-bold">ໃກ້ໝົດອາຍຸ (ພາຍໃນ 30 ວັນ)</p></div><p className="text-2xl font-black text-orange-500">{nearExpiredProducts.length} ລາຍການ</p></div>
                        </div>

                        {expiredProducts.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-red-500 mb-3 text-left">🚫 ບັນຊີລາຍການສິນຄ້າທີ່ໝົດອາຍຸແລ້ວ</h3>
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-xs text-red-400 border-b border-red-100 font-bold text-left">
                                            <th className="py-3 px-2">ຊື່ສິນຄ້າ</th>
                                            <th className="py-3 px-2">ໝວດໝູ່</th>
                                            <th className="py-3 px-2 text-right">ສະຕ໋ອກຄ້າງ</th>
                                            <th className="py-3 px-2 text-right">ວັນໝົດອາຍຸ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-left text-xs">
                                        {expiredProducts.map((product, pIdx) => (
                                            <tr key={`exp-p-${product.productId || pIdx}`} className="border-b border-gray-50 hover:bg-red-50/40 transition">
                                                <td className="py-3 px-2 font-bold text-gray-800">{product.productName}</td>
                                                <td className="py-3 px-2 text-gray-500">{product.category?.categoryName || '-'}</td>
                                                <td className="py-3 px-2 text-gray-600 text-right font-semibold">{product.quantityOnHand}</td>
                                                <td className="py-3 px-2 text-right font-bold text-red-500">{new Date(product.expiryDate).toLocaleDateString('lo-LA')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 🎯 MODAL ເບິ່ງລາຍລະອຽດບິນຂາຍ */}
            {selectedDateSales && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col text-left">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <div className="flex items-center gap-2"><FileText className="text-pink-500" size={20} /><h3 className="font-bold text-gray-800 text-base">ລາຍການບິນລະອຽດ ປະຈຳ: <span className="text-pink-500 font-black">{detailTitle}</span></h3></div>
                            <button onClick={() => setSelectedDateSales(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button>
                        </div>
                        <div className="flex-1 window-scroll overflow-y-auto space-y-4 pr-1">
                            {selectedDateSales.map((sale, bIdx) => (
                                <div key={`modal-b-${sale.saleId || bIdx}`} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 shadow-sm">
                                    <div className="flex justify-between items-start border-b border-dashed pb-2 mb-2">
                                        <div><p className="text-sm font-bold text-gray-800">ເລກບິນ: <span className="text-pink-500">#{sale.billNo}</span></p><p className="text-xs text-gray-400 mt-0.5">ລູກຄ້າ: {sale.customer?.customerName || 'ລູກຄ້າທົ່ວໄປ'}</p></div>
                                        <div className="text-right"><p className="text-xs text-gray-400">ຜູ້ຂາຍ: {sale.user?.username || 'Staff'}</p><p className="text-xs text-gray-400">ວັນເວລາ: {sale.saleDatetime ? new Date(sale.saleDatetime).toLocaleString('lo-LA') : '-'}</p></div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {sale.items?.map((item, itemIdx) => (
                                            <div key={`item-${itemIdx}`} className="flex justify-between text-xs text-gray-600"><span className="flex-1 truncate">✿ {item.product?.productName || 'สินค้า'}</span><span className="w-20 text-center font-bold">{item.quantity} ຊິ້ນ</span><span className="w-28 text-right font-bold text-gray-800">{(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toLocaleString('lo-LA')} ₭</span></div>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-200/60 pt-2 mt-2 flex justify-between items-center text-sm"><span className="font-bold text-gray-700">ຍອດສຸດທິບິນໃນນີ້:</span><span className="font-black text-pink-600 text-base">{Number(sale.grandTotal || 0).toLocaleString('lo-LA')} ₭</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-3 mt-4 flex justify-end"><button onClick={() => setSelectedDateSales(null)} className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition">ປິດໜ້າຕ່າງ</button></div>
                    </div>
                </div>
            )}

            {/* 🎯 MODAL ເບິ່ງລາຍລະອຽດການນຳເຂົ້າ */}
            {selectedDateImports && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 anonymity-fade">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col text-left">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <div className="flex items-center gap-2"><Package className="text-red-500" size={20} /><h3 className="font-bold text-gray-800 text-base">ລາຍລະອຽດການນຳເຂົ້າສິນຄ້າ ປະຈຳ: <span className="text-red-500 font-black">{detailTitle}</span></h3></div>
                            <button onClick={() => setSelectedDateImports(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs text-red-500 border-b bg-gray-50 font-bold"><th className="p-3">ສິນຄ້າ (Product)</th><th className="p-3 text-right">ຈຳນວນນຳເຂົ້າ</th><th className="p-3 text-right">ລາຄາຕົ້ນທຶນ</th><th className="p-3 text-right">ລວມຕົ້ນທຶນ</th></tr>
                                </thead>
                                <tbody className="divide-y text-xs">
                                    {selectedDateImports.map((imp, idx) => (
                                        <tr key={`imp-detail-${idx}`} className="hover:bg-gray-50">
                                            <td className="p-3 font-bold text-gray-800">{imp.product?.productName || '-'}<p className="text-[10px] text-gray-400 font-normal">{imp.product?.category?.categoryName || '-'}</p></td>
                                            <td className="p-3 text-right font-black text-gray-700">{imp.quantity} ຊິ້ນ</td>
                                            <td className="p-3 text-right text-gray-600 font-semibold">{Number(imp.costPrice || 0).toLocaleString('lo-LA')} ₭</td>
                                            <td className="p-3 text-right font-black text-red-500">{(Number(imp.costPrice || 0) * Number(imp.quantity || 0)).toLocaleString('lo-LA')} ₭</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t pt-3 mt-4 flex justify-end"><button onClick={() => setSelectedDateImports(null)} className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition">ປິດໜ້າຕ່າງ</button></div>
                    </div>
                </div>
            )}

            {/* 🎯 MODAL ເບິ່ງຍອດຂາຍພະນັກງານ */}
            {selectedEmployeeSales && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 anonymity-fade">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col text-left">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <div className="flex items-center gap-2"><ShoppingBag className="text-green-600" size={20} /><h3 className="font-bold text-gray-800 text-base">ປະຫວັດການຂາຍຂອງພະນັກງານ: <span className="text-green-600 font-black">{detailTitle}</span></h3></div>
                            <button onClick={() => setSelectedEmployeeSales(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {selectedEmployeeSales.length === 0 ? (
                                <p className="text-center py-10 text-gray-400 text-xs">ພະນັກງານຄົນນີ້ຍັງບໍ່ມີປະຫວັດການຂາຍໃບບິນໃນຊ່ວງເວລານີ້</p>
                            ) : selectedEmployeeSales.map((sale, idx) => (
                                <div key={`emp-sale-${idx}`} className="border border-gray-100 rounded-xl p-3 bg-green-50/20">
                                    <div className="flex justify-between border-b border-dashed pb-1.5 mb-2 text-xs text-gray-400">
                                        <span className="font-bold text-gray-800">ບິນ: <span className="text-pink-500">#{sale.billNo}</span></span>
                                        <span className="font-medium">ວັນທີ: {sale.saleDatetime ? new Date(sale.saleDatetime).toLocaleDateString('lo-LA') : '-'}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {sale.items?.map((item, iIdx) => (
                                            <div key={iIdx} className="flex justify-between text-xs text-gray-600">
                                                <span>• {item.product?.productName}</span>
                                                <span className="font-medium">{item.quantity} ຊິ້ນ × {Number(item.unitPrice).toLocaleString('lo-LA')} ₭</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right text-xs font-bold text-gray-700 mt-2 border-t pt-1">
                                        ยອດລວມບິນ: <span className="text-green-600 text-sm font-black">{Number(sale.grandTotal).toLocaleString('lo-LA')} ₭</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-3 mt-4 flex justify-end"><button onClick={() => setSelectedEmployeeSales(null)} className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition">ປິດໜ້າຕ່າງ</button></div>
                    </div>
                </div>
            )}
        </div>
    )
}