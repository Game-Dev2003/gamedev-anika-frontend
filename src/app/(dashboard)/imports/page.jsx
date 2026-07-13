'use client'

import { useState, useEffect } from 'react'
import api, { importService } from '@/lib/api'
import { Plus, X, Search, Edit2, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonRow } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function ImportsPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [imports, setImports] = useState([])
    const [pendingOrders, setPendingOrders] = useState([])
    const [products, setProducts] = useState([]) // สำหรับกรณีแก้ไขข้อมูลเดี่ยว
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [selectedImportId, setSelectedImportId] = useState(null)
    const [selectedPoId, setSelectedPoId] = useState('')
    const [importItems, setImportItems] = useState([])
    const [search, setSearch] = useState('')
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleteId, setDeleteId] = useState(null)

    const [editForm, setEditForm] = useState({
        productId: '',
        quantity: '',
        costPrice: '',
        importDate: new Date().toISOString().split('T')[0],
        expiryDate: ''
    })

    useEffect(() => {
        setMounted(true)
        fetchImports()
        fetchPendingOrders()
        fetchProducts()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchImports = async () => {
        try {
            setLoading(true)
            const res = await api.get('/imports')
            setImports(res.data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const fetchPendingOrders = async () => {
        try {
            const pos = await importService.getPendingOrders()
            setPendingOrders(pos || [])
        } catch (err) {
            console.error(err)
        }
    }

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products')
            setProducts(res.data || [])
        } catch (err) { }
    }

    const handleSelectPO = async (poId) => {
        setSelectedPoId(poId)
        if (!poId) {
            setImportItems([])
            return
        }
        try {
            const items = await importService.getPoItems(poId)
            const formattedItems = items.map(item => ({
                productId: item.product?.productId,
                productName: item.product?.productName,
                categoryName: item.product?.category?.categoryName || '-',
                quantity: item.quantity,
                costPrice: '',
                expiryDate: ''
            }))
            setImportItems(formattedItems)
        } catch (err) {
            toast.error(T('failedToGetItems', 'failedToGetItems'))
        }
    }

    const handleItemChange = (index, field, value) => {
        const updated = [...importItems]
        updated[index][field] = value
        setImportItems(updated)
    }

    const handleEditClick = (imp) => {
        setIsEditing(true)
        setSelectedImportId(imp.importId)
        setEditForm({
            productId: imp.product?.productId || '',
            quantity: imp.quantity,
            costPrice: imp.costPrice,
            importDate: imp.importDate || new Date().toISOString().split('T')[0],
            expiryDate: imp.expiryDate || ''
        })
        setShowModal(true)
    }

    const resetForm = () => {
        setSelectedPoId('')
        setImportItems([])
        setIsEditing(false)
        setSelectedImportId(null)
        setEditForm({
            productId: '',
            quantity: '',
            costPrice: '',
            importDate: new Date().toISOString().split('T')[0],
            expiryDate: ''
        })
        setShowModal(false)
    }

   const handleSubmit = async (e) => {
    e.preventDefault()
    try {
        if (isEditing) {
            const prodId = editForm.productId;
            if (!prodId) {
                // 💡 แก้ไขจุดที่ 1: แจ้งเตือนเมื่อลืมเลือกสินค้า
                toast.error(T('pleaseSelectProduct', 'ກະລຸນາເລືອກສິນຄ້າກ່ອນ! / Please select a product!'))
                return
            }

            const rawCost = parseInt(editForm.costPrice.toString().replace(/[^0-9]/g, '')) || 0
            
            await api.put(`/imports/${selectedImportId}?productId=${prodId}`, {
                quantity: parseInt(editForm.quantity),
                costPrice: rawCost,
                importDate: editForm.importDate,
                expiryDate: editForm.expiryDate || null
            })
            // 💡 แก้ไขจุดที่ 2: แก้ไขสำเร็จ
            toast.success(T('importUpdatedSuccess', 'ອັບເດດຂໍ້ມູນສຳເລັດ! / Updated successfully!'))
        } else {
            if (!selectedPoId || importItems.length === 0) return
            for (const item of importItems) {
                const rawCostPrice = parseInt(item.costPrice.toString().replace(/[^0-9]/g, '')) || 0
                await api.post(`/imports?productId=${item.productId}`, {
                    quantity: parseInt(item.quantity),
                    costPrice: rawCostPrice,
                    importDate: new Date().toISOString().split('T')[0],
                    expiryDate: item.expiryDate || null,
                    poId: parseInt(selectedPoId)
                })
            }
            // 💡 แก้ไขจุดที่ 3: นำเข้าสำเร็จ
            toast.success(T('importAddedSuccess', 'ນຳເຂົ້າສິນຄ້າສຳເລັດ! / Import completed!'))
        }
        resetForm()
        fetchImports()
        fetchPendingOrders()
    } catch (err) {
        // 💡 แก้ไขจุดที่ 4: ดึงข้อความเอเรอร์จากหลังบ้าน หรือพ่นข้อความกลาง
        const errorMsg = err.response?.data?.message || 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ! / System error occurred!'
        toast.error(errorMsg)
    }
}

   const handleDelete = async (id) => {
    try {
        await api.delete(`/imports/${id}`)
        // 💡 แก้ไขจุดที่ 5: ลบข้อมูลสำเร็จ
        toast.success(T('importDeletedSuccess', 'ລຶບຂໍ້ມູນຮຽບຮ້ອຍແລ້ວ! / Record deleted successfully!'))
        fetchImports()
        fetchPendingOrders()
    } catch (err) {
        // 💡 แก้ไขจุดที่ 6: ดักจับกรณีสต็อกไม่พอหักคืน (ที่หลังบ้านโยน RuntimeException ออกมา)
        const errorMsg = err.response?.data?.message || 'ລຶບບໍ່ສຳເລັດ! / Delete failed!'
        toast.error(errorMsg)
    }
}
    const triggerDelete = (id) => {
        setDeleteId(id)
        setConfirmOpen(true)
    }

    const filteredImports = imports.filter(imp => {
        if (!search) return true
        return imp.product?.productName?.toLowerCase().includes(search.toLowerCase())
    })

    const totalCost = imports.reduce((sum, imp) => sum + (Number(imp.costPrice) * Number(imp.quantity)), 0)
    const totalItems = imports.length
    const thisMonthImports = imports.filter(imp => {
        if (!imp.importDate) return false
        const d = new Date(imp.importDate)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return (
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <Toaster />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">{T('imports', 'นำเข้าสินค้า')}</h1>
                    <p className="text-sm text-gray-400 mt-1">{T('manageImports', 'จัดการประวัตินำเข้าคลัง')}</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600"
                >
                    <Plus size={16} />
                    {T('addImport', 'นำเข้าสินค้า')}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400">{T('totalCost', 'ต้นทุนรวม')}</p>
                    <p className="text-xl font-bold text-red-500 mt-1">{totalCost.toLocaleString('lo-LA')} ₭</p>
                </div>
                <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400">{T('totalImports', 'จำนวนรายการ')}</p>
                    <p className="text-xl font-bold text-gray-800 mt-1">{totalItems}</p>
                </div>
                <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-400">{T('thisMonth', 'เดือนนี้')}</p>
                    <p className="text-xl font-bold text-pink-500 mt-1">{thisMonthImports}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                    type="text"
                    placeholder={T('searchImports', 'ค้นหาด้วยชื่อสินค้า...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
            </div>

            {/* Table หลัก */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-xs text-pink-500 border-b border-gray-100">
                            <th className="text-left py-3 px-2">#</th>
                            <th className="text-left py-3 px-2">{T('productName', 'ສິນຄ້າ')}</th>
                            <th className="text-right py-3 px-2">{T('qty', 'ຈຳນວນ')}</th>
                            <th className="text-right py-3 px-2">{T('costPrice', 'ລາຄາຕົ້ນທຶນ')}</th>
                            <th className="text-right py-3 px-2">{T('totalCost', 'ລວມຕົ້ນທຶນ')}</th>
                            <th className="text-left py-3 px-2">{T('importDate', 'ວันทีนำเข้า')}</th>
                            <th className="text-left py-3 px-2">{T('expiryDate', 'ວັນໝົດອາຍຸ')}</th>
                            <th className="text-left py-3 px-2">{T('status', 'status')}</th>
                            <th className="text-center py-3 px-2">{T('actions', 'ຈັດการ')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <><SkeletonRow cols={9} /><SkeletonRow cols={9} /></>
                        ) : filteredImports.length === 0 ? (
                            <tr>
                                <td colSpan={9}>
                                    <EmptyState icon="📦" title={T('noImports', 'ยังไม่มีการนำเข้า')} />
                                </td>
                            </tr>
                        ) : filteredImports.map((imp, index) => {
                            const totalLineCost = Number(imp.costPrice) * Number(imp.quantity)
                            const isExpired = imp.expiryDate && new Date(imp.expiryDate) <= new Date()

                            return (
                                /* ✅ บล็อกความปลอดภัย 1: ตั้งค่า key ตารางหลักไม่ให้ซ้ำเด็ดขาด */
                                <tr key={`main-import-row-${imp.importId || index}-${index}`} className="border-b border-gray-50 hover:bg-pink-50 transition">
                                    <td className="py-3 px-2 text-sm text-gray-400">{index + 1}</td>
                                    <td className="py-3 px-2">
                                        <p className="text-sm font-medium text-gray-800">{imp.product?.productName || '-'}</p>
                                        <p className="text-xs text-gray-400">{imp.product?.category?.categoryName || '-'}</p>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-600 text-right">{Number(imp.quantity).toLocaleString('lo-LA')}</td>
                                    <td className="py-3 px-2 text-sm text-gray-600 text-right">{Number(imp.costPrice).toLocaleString('lo-LA')} ₭</td>
                                    <td className="py-3 px-2 text-sm font-bold text-red-500 text-right">{totalLineCost.toLocaleString('lo-LA')} ₭</td>
                                    <td className="py-3 px-2 text-sm text-gray-500">{imp.importDate}</td>
                                    <td className="py-3 px-2">
                                        {imp.expiryDate ? (
                                            <span className={`text-xs px-2 py-1 rounded-full ${isExpired ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                                                {imp.expiryDate}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 font-medium">
                                            Success
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleEditClick(imp)} className="p-1 text-gray-400 hover:text-blue-500 transition">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => triggerDelete(imp.importId)} className="p-1 text-gray-400 hover:text-red-500 transition">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal Form แบบ Dynamic */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">
                                {isEditing ? T('editImport', 'แก้ไขการนำเข้า') : T('addImport', 'นำเข้าสินค้าจากใบสั่งซื้อ')}
                            </h3>
                            <button onClick={resetForm}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">สินค้า</label>
                                        <select
                                            value={editForm.productId}
                                            onChange={(e) => setEditForm({ ...editForm, productId: e.target.value })}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
                                            required
                                        >
                                            {products.map(p => <option key={`edit-p-opt-${p.productId}`}_value={p.productId}>{p.productName}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-gray-600 mb-1 block">จำนวน</label>
                                            <input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm" required />
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-600 mb-1 block">ราคาต้นทุน</label>
                                            <input type="text" value={editForm.costPrice} onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-gray-600 mb-1 block">วันนำเข้า</label>
                                            <input type="date" value={editForm.importDate} onChange={(e) => setEditForm({ ...editForm, importDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm" required />
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-600 mb-1 block">วันหมดอายุ</label>
                                            <input type="date" value={editForm.expiryDate} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-sm text-gray-600 mb-1 block">{T('selectPO', 'เลือกใบสั่งซื้อ')}</label>
                                        <select
                                            value={selectedPoId}
                                            onChange={(e) => handleSelectPO(e.target.value)}
                                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
                                            required
                                        >
                                            <option value="">{T('select', 'เลือกใบสั่งซื้อ...')}</option>
                                            {pendingOrders.map(order => (
                                                <option key={`po-opt-${order.poId}`} value={order.poId}>{order.poNo}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {importItems.length > 0 && (
                                        <div className="border border-gray-100 rounded-xl overflow-hidden mt-4">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 p-3 font-semibold">
                                                        <th className="p-3">สินค้า</th>
                                                        <th className="p-3">จำนวน</th>
                                                        <th className="p-3">ราคาต้นทุน/ชิ้น</th>
                                                        <th className="p-3">วันหมดอายุ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 text-sm">
                                                    {importItems.map((item, index) => (
                                                        /* ✅ บล็อกความปลอดภัย 2: ตั้งค่า key ตารางเลือกใบ PO ป้องกันคีย์ซ้ำกัน */
                                                        <tr key={`modal-po-item-${item.productId}-${index}`}>
                                                            <td className="p-3">{item.productName}</td>
                                                            <td className="p-3 font-semibold">{item.quantity} ชิ้น</td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="text"
                                                                    placeholder="0 ₭"
                                                                    value={item.costPrice}
                                                                    onChange={(e) => handleItemChange(index, 'costPrice', e.target.value)}
                                                                    className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                                                                    required
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="date"
                                                                    value={item.expiryDate}
                                                                    onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                                                                    className="w-36 border border-gray-200 rounded-lg px-2 py-1 text-sm"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={resetForm} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                                    {T('cancel', 'ยกเลิก')}
                                </button>
                                <button type="submit" className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-sm hover:bg-pink-600">
                                    {T('submit', 'บันทึก')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => { handleDelete(deleteId); setConfirmOpen(false); }}
                title={T('confirmDeleteTitle', 'ยืนยันการลบ?')}
                message={T('confirmDeleteMessage', 'ต้องการลบประวัตินี้ใช่หรือไม่?')}
            />
        </div>
    )
}