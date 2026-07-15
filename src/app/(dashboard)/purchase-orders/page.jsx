'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, X, Plus, Printer, Trash2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonRow } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

export default function PurchaseOrdersPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [orders, setOrders] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [products, setProducts] = useState([])
    const [selected, setSelected] = useState(null)
    const [selectedItems, setSelectedItems] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [loadingItems, setLoadingItems] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({
        poNo: '',
        supplierId: '',
        poDate: new Date().toISOString().split('T')[0],
        items: [{ productId: '', quantity: '' }]
    })

    useEffect(() => {
        setMounted(true)
        fetchOrders()
        fetchSuppliers()
        fetchProducts()
    }, [])

    // ຕິດຕາມການຄລິກເລືອກໃບສັ່ງຊື້ ເພື່ອດຶງລາຍການສິນຄ້າທາງໃນອອກມາສະແດງ
    useEffect(() => {
        if (selected?.poId) {
            fetchOrderItems(selected.poId)
        } else {
            setSelectedItems([])
        }
    }, [selected])

    const T = (key, fallback) => mounted ? t(key) : fallback

    // ຟັງຊັນດຶງຂໍ້ມູນໃບສັ່ງຊື້ທັງໝົດ
    const fetchOrders = async () => {
        try {
            const res = await api.get('/purchase-orders')
            setOrders([...res.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
        } catch {
            toast.error('Failed to load orders')
        } finally {
            setLoading(false)
        }
    }

    // ຟັງຊັນດຶງລາຍການສິນຄ້າທີ່ຜູກກັບໃບສັ່ງຊື້
    const fetchOrderItems = async (poId) => {
        setLoadingItems(true)
        try {
            const res = await api.get(`/purchase-orders/${poId}/items`)
            setSelectedItems(res.data)
        } catch {
            toast.error('Failed to load order items')
        } finally {
            setLoadingItems(false)
        }
    }

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers')
            setSuppliers(res.data)
        } catch { }
    }

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products')
            setProducts(res.data.filter(p => p.status === 'active'))
        } catch { }
    }

    const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: '' }] })
    const removeItem = (index) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
    const updateItem = (index, field, value) => {
        const newItems = [...form.items]
        newItems[index][field] = value
        setForm({ ...form, items: newItems })
    }

    // ຟັງຊັນບັນທຶກການສ້າງໃບສັ່ງຊື້ໃໝ່
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post('/purchase-orders', {
                poNo: form.poNo,
                supplierId: parseInt(form.supplierId),
                poDate: form.poDate,
                items: form.items.map(item => ({ productId: parseInt(item.productId), quantity: parseInt(item.quantity) }))
            })
            toast.success(T('poCreated', 'PO created!'))
            setShowModal(false)
            setForm({ poNo: '', supplierId: '', poDate: new Date().toISOString().split('T')[0], items: [{ productId: '', quantity: '' }] })
            fetchOrders()
        } catch (err) {
            toast.error(err.response?.data?.message || T('failed', 'Failed'))
        }
    }

    // 💡 ຟັງຊັນສົ່ງຄຳສັ່ງຍົກເລີກໃບສັ່ງຊື້ທີ່ມີສິນຄ້າ (PENDING -> CANCELLED)
    const handleCancelOrder = async (poId) => {
        if (!window.confirm('ທ່ານແນ່ໃຈຫຼືບໍ່ທີ່ຈະຍົກເລີກໃບສັ່ງຊື້ນີ້?')) return
        try {
            await api.put(`/purchase-orders/${poId}/cancel`)
            toast.success('ຍົກເລີກໃບສັ່ງຊື້ຮຽບຮ້ອຍແລ້ວ')
            setSelected(null)
            fetchOrders()
        } catch (err) {
            toast.error(err.response?.data?.message || 'ບໍ່ສາມາດຍົກເລີກໃບສັ່ງຊື້ໄດ້')
        }
    }

    // 💡 ຟັງຊັນສົ່ງຄຳສັ່ງລົບໃບສັ່ງຊື້ເປົ່າອອກຈາກຖານຂໍ້ມູນຖາວອນ (Items = 0)
    const handleDeleteOrder = async (poId) => {
        if (!window.confirm('ໃບສັ່ງຊື້ນີ້ບໍ່ມີລາຍການສິນຄ້າ, ທ່ານຕ້ອງການລົບອອກຈາກລະບົບຖາວອນຫຼືບໍ່?')) return
        try {
            await api.delete(`/purchase-orders/${poId}`)
            toast.success('ລົບໃບສັ່ງຊື້ເປົ່າສຳເລັດແລ້ວ')
            setSelected(null)
            fetchOrders()
        } catch (err) {
            toast.error(err.response?.data?.message || 'ບໍ່ສາມາດລົບຂໍ້ມູນໄດ້')
        }
    }

   // ✅ ປ່ຽນຟັງຊັນ handlePrint ໃຫ້ເປັນລະບົບສ້າງ Format ໃບ PO ສວຍງາມອັດໂຕນມັດ
const handlePrint = () => {
    if (!selected) return;

    const html = `
    <html>
        <head>
            <title>ໃບສັ່ງຊື້ # ${selected.poNo}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700&display=swap');
                @page { size: A4; margin: 20mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Noto Sans Lao', sans-serif;
                    padding: 40px;
                    color: #333;
                }
                .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #ec4899; padding-bottom: 15px; }
                .shop-title { font-size: 24px; font-weight: bold; color: #ec4899; }
                .po-title { font-size: 24px; font-weight: bold; text-align: right; color: #374151; }
                .info-grid { display: grid; grid-cols: 2; gap: 20px; margin-bottom: 30px; font-size: 14px; }
                .info-block { line-height: 1.6; }
                .bold { font-weight: bold; }
                .label { color: #6b7280; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th { background-color: #fce7f3; color: #db2777; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #fbcfe8; }
                td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
                .text-center { text-align: center; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="shop-title">✿ Anika Beauty Shop ✿</div>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">Point of Sale & Stock Management System</p>
                </div>
                <div>
                    <div class="po-title">ໃບສັ່ງຊື້ສິນຄ້າ</div>
                    <p style="text-align: right; font-size: 14px; font-weight: bold; color: #db2777;">${selected.poNo}</p>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px;">
                <div class="info-block">
                    <p class="bold" style="color: #db2777; margin-bottom: 5px;">🏢 ຜູ້ສະໜອງ (Supplier):</p>
                    <p class="bold">${selected.supplier?.supplierName || 'N/A'}</p>
                    <p class="label">ເບີໂທ: ${selected.supplier?.phone || '-'}</p>
                    <p class="label">ທີ່ຢູ່: ${selected.supplier?.address || '-'}</p>
                </div>
                <div class="info-block" style="text-align: right;">
                    <p><span class="label">📅 ວັນທີສັ່ງຊື້ (Date):</span> <span class="bold">${selected.poDate}</span></p>
                    <p><span class="label">📋 ສະຖານະ (Status):</span> <span class="bold" style="color: #orange-500">${selected.status}</span></p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 15%" class="text-center">ລຳດັບ</th>
                        <th style="width: 60%">ລາຍການສິນຄ້າ (Product Name)</th>
                        <th style="width: 25%" class="text-center">ຈຳນວນທີ່ສັ່ງຊື້ (Qty)</th>
                    </tr>
                </thead>
                <tbody>
                    ${selectedItems.map((item, index) => `
                        <tr>
                            <td class="text-center">${index + 1}</td>
                            <td class="bold">${item.product?.productName || '-'}</td>
                            <td class="text-center bold" style="color: #db2777; font-size: 15px;">${item.quantity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <p>ໃບສັ່ງຊື້ສິນຄ້ານີ້ຖືກສ້າງຂຶ້ນອັດໂຕນມັດຜ່ານລະບົບອານິກາບິວຕີ້ຊັອບ POS</p>
                <p style="margin-top: 5px;">© 2026 Anika Beauty Shop. All rights reserved.</p>
            </div>
        </body>
    </html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print()
            URL.revokeObjectURL(url)
            printWindow.onafterprint = () => printWindow.close()
        }, 600)
    }
}

    const filteredOrders = orders.filter(o =>
        o.poNo?.toLowerCase().includes(search.toLowerCase()) ||
        o.supplier?.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
        o.poDate?.includes(search)
    )

    return (
        <div className="flex h-screen bg-white print:p-0">
            <Toaster />
            {/* ເຄິ່ງຊ້າຍ: ຕາຕະລາງສະແດງລາຍການໃບສັ່ງຊື້ທັງໝົດ */}
            <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden print:hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg lg:text-xl font-bold text-gray-800">{T('purchaseOrders', 'Purchase Orders')}</h1>
                        <p className="text-sm text-gray-400 mt-1 hidden lg:block">{T('manageStockImports', 'Manage stock imports')}</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600">
                        <Plus size={16} /><span className="hidden lg:inline">{T('newPurchaseOrder', 'New PO')}</span><span className="lg:hidden">Add</span>
                    </button>
                </div>
                <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder={T('searchPO', 'Search PO...')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full min-w-[450px]">
                        <thead>
                            <tr className="text-xs text-pink-500 border-b border-gray-100">
                                <th className="text-left py-3 px-2">{T('poNumber', 'PO NUMBER')}</th>
                                <th className="text-left py-3 px-2">{T('supplier', 'SUPPLIER')}</th>
                                <th className="text-left py-3 px-2">{T('date', 'DATE')}</th>
                                <th className="text-left py-3 px-2">{T('items', 'ITEMS')}</th>
                                <th className="text-left py-3 px-2">{T('status', 'STATUS')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <><SkeletonRow cols={5} /><SkeletonRow cols={5} /><SkeletonRow cols={5} /><SkeletonRow cols={5} /><SkeletonRow cols={5} /></>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={5}>
                                    <EmptyState
                                        icon={search ? '🔍' : '📋'}
                                        title={search ? 'ไม่พบ PO' : 'ยังไม่มี Purchase Order'}
                                        description={search ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม Add เพื่อสร้าง PO'}
                                        action={!search ? { label: '+ New PO', onClick: () => setShowModal(true) } : undefined}
                                    />
                                </td></tr>
                            ) : filteredOrders.map(order => (
                                <tr key={order.poId} onClick={() => setSelected(order)} className={`border-b border-gray-50 cursor-pointer hover:bg-pink-50 transition ${selected?.poId === order.poId ? 'bg-pink-50' : ''}`}>
                                    <td className="py-3 px-2 text-sm font-medium text-pink-500">{order.poNo}</td>
                                    <td className="py-3 px-2 text-sm text-gray-700 truncate">{order.supplier?.supplierName}</td>
                                    <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">{order.poDate}</td>
                                    <td className="py-3 px-2 text-sm text-gray-500">{order.items?.length || 0} {T('items', 'items')}</td>
                                    <td className="py-3 px-2">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === 'COMPLETED'
                                            ? 'bg-green-100 text-green-600'
                                            : order.status === 'CANCELLED'
                                                ? 'bg-red-100 text-red-500'
                                                : 'bg-orange-100 text-orange-500'
                                            }`}>
                                            {order.status === 'COMPLETED' ? 'Completed' : order.status === 'CANCELLED' ? 'Cancelled' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ເຄິ່ງຂວາ: ສະແດງແຜງລາຍລະອຽດເນື້ອໃນຂອງໃບສັ່ງຊື້ທີ່ຖືກເລືອກ */}
            {selected && (
                <div className="w-64 lg:w-80 border-l border-gray-100 flex flex-col p-4 lg:p-6 print:w-full print:border-none print:p-0">
                    <div className="flex items-center justify-between mb-4 print:hidden">
                        <h3 className="font-bold text-gray-800">{T('orderDetails', 'Order Details')}</h3>
                        <button onClick={() => setSelected(null)}><X size={18} className="text-gray-400" /></button>
                    </div>

                    <div className="space-y-3 mb-4 border-b pb-4 border-gray-100">
                        <div className="hidden print:block mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Anika Beauty Shop</h2>
                            <p className="text-sm text-gray-500">ใบสั่งซื้อสินค้า / Purchase Order</p>
                        </div>
                        <div><p className="text-xs text-gray-400">{T('poNumber', 'PO NUMBER')}</p><p className="text-sm font-medium text-pink-500">{selected.poNo}</p></div>
                        <div><p className="text-xs text-gray-400">{T('supplier', 'SUPPLIER')}</p><p className="text-sm text-gray-700">{selected.supplier?.supplierName}</p></div>
                        <div><p className="text-xs text-gray-400">{T('date', 'DATE')}</p><p className="text-sm text-gray-700">{selected.poDate}</p></div>
                        <div>
                            <p className="text-xs text-gray-400">{T('status', 'STATUS')}</p>
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${selected.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : selected.status === 'CANCELLED' ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-500'
                                }`}>
                                {selected.status === 'COMPLETED' ? 'Completed' : selected.status === 'CANCELLED' ? 'Cancelled' : 'Pending'}
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-2">{T('items', 'ITEMS')}</p>
                    <div className="flex-1 overflow-y-auto space-y-2 print:overflow-visible">
                        {loadingItems ? (
                            <p className="text-sm text-gray-400 italic">Loading items...</p>
                        ) : selectedItems.length === 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs text-red-400 italic font-medium">⚠️ ໃບສັ່ງຊື້ນີ້ບໍ່ມີລາຍການສິນຄ້າ (ບິນເປົ່າ)</p>
                                {/* 🌟 ປຸ່ມລົບໃບສັ່ງຊື້ເປົ່າ (Delete): ຈະສະແດງສະເພາະຕອນທີ່ລາຍການສິນຄ້າທາງໃນເປັນ 0 ເທົ່ານັ້ນ */}
                                <button
                                    onClick={() => handleDeleteOrder(selected.poId)}
                                    className="flex items-center justify-center gap-2 w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
                                >
                                    <Trash2 size={16} /> ລົບໃບສັ່ງຊື້ເປົ່າ (Delete)
                                </button>
                            </div>
                        ) : (
                            selectedItems.map(item => (
                                <div key={item.poItemId} className="border border-gray-100 rounded-lg p-3 print:break-inside-avoid">
                                    <p className="text-sm font-medium text-gray-800">{item.product?.productName}</p>
                                    <p className="text-xs text-gray-400 mt-1">{T('qty', 'Qty')}: {item.quantity}</p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 🔐 ປ້ອງກັນຄວາມປອດໄພ: ປຸ່ມຍົກເລີກ (Cancel) ຈະກົດໄດ້ສະເພາະບິນທີ່ມີສິນຄ້າ ແລະ ສະຖານະເປັນ PENDING ເທົ່ານັ້ນ */}
                    {selected.status === 'PENDING' && selectedItems.length > 0 && (
                        <button
                            onClick={() => handleCancelOrder(selected.poId)}
                            className="mt-2 flex items-center justify-center gap-2 w-full bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition shadow-sm print:hidden"
                        >
                            <X size={16} /> ຍົກເລີກໃບສັ່ງຊື້ (Cancel)
                        </button>
                    )}

                    <button
                        onClick={handlePrint}
                        className="mt-2 flex items-center justify-center gap-2 w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition shadow-sm print:hidden"
                    >
                        <Printer size={16} />
                        {T('printPO', 'Print PO')}
                    </button>
                </div>
            )}

            {/* ໜ້າຕ່າງ Modal ຟອມສ້າງໃບສັ່ງຊື້ໃໝ່ */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 print:hidden">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">{T('newPurchaseOrder', 'New PO')}</h3>
                            <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-sm text-gray-600 mb-1 block">{T('poNumber', 'PO Number')}</label><input type="text" value={form.poNo} onChange={(e) => setForm({ ...form, poNo: e.target.value })} placeholder="PO-2024-001" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required /></div>
                                <div><label className="text-sm text-gray-600 mb-1 block">{T('date', 'Date')}</label><input type="date" value={form.poDate} onChange={(e) => setForm({ ...form, poDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required /></div>
                            </div>
                            <div><label className="text-sm text-gray-600 mb-1 block">{T('supplier', 'Supplier')}</label>
                                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required>
                                    <option value="">{T('selectSupplier', 'Select...')}</option>
                                    {suppliers.map(s => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-gray-600">{T('items', 'Items')}</label>
                                    <button type="button" onClick={addItem} className="text-xs text-pink-500 hover:underline">+ Add Item</button>
                                </div>
                                <div className="space-y-2">
                                    {form.items.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required>
                                                <option value="">Select...</option>
                                                {products.map(p => <option key={p.productId} value={p.productId}>{p.productName}</option>)}
                                            </select>
                                            <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required min="1" />
                                            {form.items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600"><X size={16} /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm">{T('cancel', 'Cancel')}</button>
                                <button type="submit" className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-sm hover:bg-pink-600">{T('createPO', 'Create PO')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}