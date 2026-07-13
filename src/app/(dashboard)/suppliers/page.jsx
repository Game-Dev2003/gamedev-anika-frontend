'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, X, Plus } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonRow } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

export default function SuppliersPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [suppliers, setSuppliers] = useState([])
    const [selected, setSelected] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [form, setForm] = useState({ supplierName: '', phone: '', address: '' })

    useEffect(() => { setMounted(true); fetchSuppliers() }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchSuppliers = async () => {
        try { const res = await api.get('/suppliers'); setSuppliers(res.data) }
        catch { toast.error('Failed to load suppliers') }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editMode) { await api.put(`/suppliers/${selected.supplierId}`, form); toast.success(T('supplierUpdated', 'Updated!')) }
            else { await api.post('/suppliers', form); toast.success(T('supplierAdded', 'Added!')) }
            setShowModal(false); setForm({ supplierName: '', phone: '', address: '' }); setEditMode(false); fetchSuppliers()
        } catch (err) { toast.error(err.response?.data?.message || T('failed', 'Failed')) }
    }

    const handleEdit = (supplier) => {
        setForm({ supplierName: supplier.supplierName, phone: supplier.phone || '', address: supplier.address || '' })
        setSelected(supplier); setEditMode(true); setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!confirm(T('confirmDeleteSupplier', 'Delete this supplier?'))) return
        try {
            await api.delete(`/suppliers/${id}`)
            toast.success(T('supplierDeleted', 'Deleted!')); setSelected(null); fetchSuppliers()
        } catch { toast.error(T('failedToDelete', 'Failed')) }
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search) ||
        s.address?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex h-screen bg-white">
            <Toaster />
            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg lg:text-xl font-bold text-gray-800">{T('suppliers', 'Suppliers')}</h1>
                        <p className="text-sm text-gray-400 mt-1 hidden lg:block">{T('manageSuppliers', 'Manage your suppliers')}</p>
                    </div>
                    <button onClick={() => { setEditMode(false); setForm({ supplierName: '', phone: '', address: '' }); setShowModal(true) }} className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600">
                        <Plus size={16} /><span className="hidden lg:inline">{T('addSupplier', 'Add Supplier')}</span><span className="lg:hidden">Add</span>
                    </button>
                </div>
                <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder={T('searchSuppliers', 'Search...')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr className="text-xs text-pink-500 border-b border-gray-100">
                                <th className="text-left py-3 px-2">{T('supplierName', 'SUPPLIER')}</th>
                                <th className="text-left py-3 px-2">{T('phone', 'PHONE')}</th>
                                <th className="text-left py-3 px-2 hidden lg:table-cell">{T('address', 'ADDRESS')}</th>
                                <th className="text-left py-3 px-2">{T('actions', 'ACTIONS')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <><SkeletonRow cols={4} /><SkeletonRow cols={4} /><SkeletonRow cols={4} /><SkeletonRow cols={4} /><SkeletonRow cols={4} /></>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr><td colSpan={4}>
                                    <EmptyState
                                        icon={search ? '🔍' : '🏭'}
                                        title={search ? 'ไม่พบ Supplier' : 'ยังไม่มี Supplier'}
                                        description={search ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม Add เพื่อเพิ่ม'}
                                        action={!search ? { label: '+ Add Supplier', onClick: () => { setEditMode(false); setForm({ supplierName: '', phone: '', address: '' }); setShowModal(true) } } : undefined}
                                    />
                                </td></tr>
                            ) : filteredSuppliers.map(supplier => (
                                <tr key={supplier.supplierId} onClick={() => setSelected(supplier)} className={`border-b border-gray-50 cursor-pointer hover:bg-pink-50 transition ${selected?.supplierId === supplier.supplierId ? 'bg-pink-50' : ''}`}>
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-xs font-bold text-pink-500 flex-shrink-0">{supplier.supplierName?.slice(0, 2).toUpperCase()}</div>
                                            <span className="text-sm font-medium text-gray-800 truncate">{supplier.supplierName}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">{supplier.phone || '-'}</td>
                                    <td className="py-3 px-2 text-sm text-gray-500 truncate max-w-xs hidden lg:table-cell">{supplier.address || '-'}</td>
                                    <td className="py-3 px-2">
                                        <div className="flex gap-1 lg:gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(supplier) }} className="text-xs px-2 lg:px-3 py-1 border border-pink-200 text-pink-500 rounded-lg hover:bg-pink-50">{T('edit', 'Edit')}</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(supplier.supplierId) }} className="text-xs px-2 lg:px-3 py-1 border border-red-200 text-red-400 rounded-lg hover:bg-red-50">{T('delete', 'Del')}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">{editMode ? T('editSupplier', 'Edit') : T('addSupplier', 'Add Supplier')}</h3>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label className="text-sm text-gray-600 mb-1 block">{T('supplierName', 'Name')}</label><input type="text" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required /></div>
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