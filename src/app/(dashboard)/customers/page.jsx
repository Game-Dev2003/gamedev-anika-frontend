'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, X, Plus, Edit2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonRow, SkeletonCard } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

export default function CustomersPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [customers, setCustomers] = useState([])
    const [selected, setSelected] = useState(null)
    const [stats, setStats] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [form, setForm] = useState({ customerName: '', phone: '', address: '' })

    useEffect(() => { setMounted(true); fetchCustomers() }, [])
    useEffect(() => { if (selected) fetchStats(selected.customerId) }, [selected])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers')
            const withStats = await Promise.all(res.data.map(async (c) => {
                try {
                    const s = await api.get(`/customers/${c.customerId}/stats`)
                    return { ...c, totalOrders: s.data.totalOrders, totalSpent: s.data.totalSpent }
                } catch { return { ...c, totalOrders: 0, totalSpent: 0 } }
            }))
            setCustomers(withStats)
        } catch { toast.error('Failed to load customers') }
        finally { setLoading(false) }
    }

    const fetchStats = async (id) => {
        try { const res = await api.get(`/customers/${id}/stats`); setStats(res.data) }
        catch { setStats(null) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editMode) { await api.put(`/customers/${selected.customerId}`, form); toast.success(T('customerUpdated', 'Customer updated!')) }
            else { await api.post('/customers', form); toast.success(T('customerAdded', 'Customer added!')) }
            setShowModal(false); setForm({ customerName: '', phone: '', address: '' }); setEditMode(false); fetchCustomers()
        } catch (err) { toast.error(err.response?.data?.message || T('failed', 'Failed')) }
    }

    const handleEdit = (customer) => {
        setForm({ customerName: customer.customerName, phone: customer.phone || '', address: customer.address || '' })
        setEditMode(true); setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!confirm(T('confirmDelete', 'Delete this customer?'))) return
        try {
            await api.delete(`/customers/${id}`)
            toast.success(T('deleted', 'Deleted!')); setSelected(null); fetchCustomers()
        } catch (err) { toast.error(err.response?.data?.message || T('failedToDelete', 'Failed')) }
    }

    const filteredCustomers = customers.filter(c =>
        c.customerName?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
    )

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

    return (
        <div className="flex h-screen bg-white">
            <Toaster />
            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">

                {/* Stats */}
                {loading ? (
                    <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6">
                        <SkeletonCard /><SkeletonCard />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6">
                        <div className="border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-pink-500 text-lg">👥</span></div>
                            <div>
                                <p className="text-xs text-gray-400">{T('totalCustomers', 'TOTAL CUSTOMERS')}</p>
                                <p className="text-xl font-bold text-gray-800">{customers.length.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-green-500 text-lg">📈</span></div>
                            <div>
                                <p className="text-xs text-gray-400">{T('newThisMonth', 'NEW THIS MONTH')}</p>
                                <p className="text-xl font-bold text-gray-800">+{customers.length}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input type="text" placeholder={T('search', 'Search...')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    </div>
                    <button onClick={() => { setEditMode(false); setForm({ customerName: '', phone: '', address: '' }); setShowModal(true) }} className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 whitespace-nowrap">
                        <Plus size={16} /><span className="hidden lg:inline">{T('addNewCustomer', 'Add New Customer')}</span><span className="lg:hidden">Add</span>
                    </button>
                </div>

                {/* Table — scroll on tablet */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr className="text-xs text-pink-500 border-b border-gray-100">
                                <th className="text-left py-3 px-2">{T('customerName', 'CUSTOMER NAME')}</th>
                                <th className="text-left py-3 px-2">{T('emailPhone', 'EMAIL / PHONE')}</th>
                                <th className="text-right py-3 px-2">{T('totalOrders', 'ORDERS')}</th>
                                <th className="text-right py-3 px-2">{T('totalSpent', 'SPENT')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <><SkeletonRow cols={4} /><SkeletonRow cols={4} /><SkeletonRow cols={4} /><SkeletonRow cols={4} /><SkeletonRow cols={4} /></>
                            ) : filteredCustomers.length === 0 ? (
                                <tr><td colSpan={4}>
                                    <EmptyState
                                        icon={search ? '🔍' : '👥'}
                                        title={search ? 'ไม่พบลูกค้า' : 'ยังไม่มีลูกค้า'}
                                        description={search ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม Add เพื่อเพิ่มลูกค้าใหม่'}
                                        action={!search ? { label: '+ Add Customer', onClick: () => { setEditMode(false); setForm({ customerName: '', phone: '', address: '' }); setShowModal(true) } } : undefined}
                                    />
                                </td></tr>
                            ) : filteredCustomers.map(customer => (
                                <tr key={customer.customerId} onClick={() => setSelected(customer)} className={`border-b border-gray-50 cursor-pointer hover:bg-pink-50 transition ${selected?.customerId === customer.customerId ? 'bg-pink-50' : ''}`}>
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-xs font-bold text-pink-500 flex-shrink-0">{getInitials(customer.customerName)}</div>
                                            <span className="text-sm font-medium text-gray-800 truncate">{customer.customerName}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-500">
                                        <div className="truncate">{customer.email || '-'}</div>
                                        <div className="text-xs text-gray-400">{customer.phone || '-'}</div>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-600 text-right">{customer.totalOrders ?? '-'}</td>
                                    <td className="py-3 px-2 text-sm font-medium text-pink-500 text-right whitespace-nowrap">{customer.totalSpent ? `${Number(customer.totalSpent).toLocaleString('lo-LA')} ₭` : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right Panel */}
            {selected && (
                <div className="w-72 lg:w-80 border-l border-gray-100 flex flex-col p-4 lg:p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">{T('customerProfile', 'Customer Profile')}</h3>
                        <button onClick={() => setSelected(null)}><X size={18} className="text-gray-400" /></button>
                    </div>
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center text-lg font-bold text-pink-500 mb-3">{getInitials(selected.customerName)}</div>
                        <p className="font-bold text-gray-800 text-center">{selected.customerName}</p>
                        <p className="text-xs text-gray-400 mt-1 text-center">{T('customerSince', 'Customer since')} {new Date(selected.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="space-y-2 mb-6">
                        <p className="text-xs font-medium text-gray-400 uppercase">{T('contactInfo', 'Contact')}</p>
                        {selected.email && <div className="flex items-center gap-2 text-sm text-gray-600"><span>✉️</span><span className="truncate">{selected.email}</span></div>}
                        <div className="flex items-center gap-2 text-sm text-gray-600"><span>📞</span><span>{selected.phone || '-'}</span></div>
                        <div className="flex items-center gap-2 text-sm text-gray-600"><span>📍</span><span className="truncate">{selected.address || '-'}</span></div>
                    </div>
                    {stats && (
                        <div className="mb-6 space-y-3">
                            <p className="text-xs font-medium text-gray-400 uppercase">{T('purchaseHistory', 'Purchase History')}</p>
                            <div className="flex justify-between"><div><p className="text-sm text-gray-600">{T('totalSalesCount', 'Total Orders')}</p></div><span className="text-sm font-bold text-gray-800">{stats.totalOrders}</span></div>
                            <div className="flex justify-between"><div><p className="text-sm text-gray-600">{T('lifetimeValue', 'Lifetime Value')}</p></div><span className="text-sm font-bold text-pink-500">{Number(stats.totalSpent || 0).toLocaleString('lo-LA')} ₭</span></div>
                        </div>
                    )}
                    <div className="mt-auto space-y-2">
                        <button onClick={() => handleEdit(selected)} className="w-full flex items-center justify-center gap-2 bg-pink-500 text-white py-2 rounded-lg text-sm hover:bg-pink-600"><Edit2 size={14} />{T('editProfile', 'Edit')}</button>
                        <button onClick={() => handleDelete(selected.customerId)} className="w-full border border-red-200 text-red-400 py-2 rounded-lg text-sm hover:bg-red-50">{T('archiveCustomer', 'Delete')}</button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">{editMode ? T('editCustomer', 'Edit Customer') : T('addNewCustomer', 'Add Customer')}</h3>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label className="text-sm text-gray-600 mb-1 block">{T('customerName', 'Name')}</label><input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required /></div>
                            <div><label className="text-sm text-gray-600 mb-1 block">{T('phone', 'Phone')}</label><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" /></div>
                            <div><label className="text-sm text-gray-600 mb-1 block">{T('address', 'Address')}</label><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" /></div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm">{T('cancel', 'Cancel')}</button>
                                <button type="submit" className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-sm hover:bg-pink-600">{editMode ? T('update', 'Update') : T('add', 'Add')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}