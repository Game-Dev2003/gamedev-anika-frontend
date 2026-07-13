'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Plus, X, Edit2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonRow } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

export default function CategoriesPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [selected, setSelected] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false) // 💡 ຕິດຕາມສະຖານະວ່າກຳລັງແກ້ໄຂຫຼືບໍ່
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ categoryName: '' })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setMounted(true)
        fetchCategories()
        fetchProducts()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    // ດຶງຂໍ້ມູນໝວດໝູ່ທັງໝົດ
    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories')
            setCategories(res.data)
        } catch (err) {
            toast.error('Failed to load categories')
        } finally {
            setLoading(false)
        }
    }

    // ດຶງຂໍ້ມູນສິນຄ້າທັງໝົດເພື່ອເອົາມານັບຈຳນວນໃນໝວດໝູ່
    const fetchProducts = async () => {
        try {
            const res = await api.get('/products')
            setProducts(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    // ຟັງຊັນບັນທຶກຂໍ້ມູນ (ຮອງຮັບທັງການສ້າງໃໝ່ ແລະ ການອັບເດດແກ້ໄຂ)
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (isEditMode) {
                // ສົ່ງ Method PUT ໄປຫາຫຼັງບ້ານເພື່ອແກ້ໄຂ
                await api.put(`/categories/${editId}`, form)
                toast.success(T('categoryUpdated', 'Category updated!'))
            } else {
                // ສົ່ງ Method POST ໄປຫາຫຼັງບ້านເພື່ອສ້າງໃໝ່
                await api.post('/categories', form)
                toast.success(T('categoryCreated', 'Category created!'))
            }
            closeModal()
            fetchCategories()
        } catch (err) {
            toast.error(err.response?.data?.message || T('failed', 'Failed'))
        }
    }

    // ຟັງຊັນສົ່ງຄຳສັ່ງລົບໝວດໝູ່
    const handleDelete = async (id) => {
        if (!confirm(T('confirmDelete', 'Delete this category?'))) return
        try {
            await api.delete(`/categories/${id}`)
            toast.success(T('deleted', 'Deleted!'))
            if (selected?.id === id) setSelected(null)
            fetchCategories()
        } catch (err) {
            toast.error(err.response?.data?.message || T('failedToDelete', 'Failed to delete'))
        }
    }

    // ເປີດ Modal ເພື່ອແກ້ໄຂຂໍ້ມູນ
    const openEditModal = (cat) => {
        setIsEditMode(true)
        setEditId(cat.id)
        setForm({ categoryName: cat.categoryName })
        setShowModal(true)
    }

    // ປິດໜ້າຕ່າງ Modal ແລະ Reset ຟອມ
    const closeModal = () => {
        setShowModal(false)
        setIsEditMode(false)
        setEditId(null)
        setForm({ categoryName: '' })
    }

    const categoryProducts = selected
        ? products.filter(p => p.category?.id === selected.id)
        : []

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null
        const BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8800'
        return `${BASE}${imageUrl}`
    }

    const getStockStyle = (qty) => {
        if (qty <= 0) return 'bg-red-100 text-red-500'
        if (qty <= 10) return 'bg-orange-100 text-orange-500'
        return 'bg-green-100 text-green-600'
    }

    const getStockLabel = (qty) => {
        if (qty <= 0) return T('outOfStock', 'Out of Stock')
        if (qty <= 10) return T('lowStock', 'Low Stock')
        return T('inStock', 'In Stock')
    }

    return (
        <div className="flex h-screen bg-white">
            <Toaster />

            {/* ເຄິ່ງຊ້າຍ: ສະແດງຕາຕະລາງລາຍການໝວດໝູ່ */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{T('categories', 'Categories')}</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {categories.length} {T('categories', 'Categories')} · {products.length} {T('products', 'Products')}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600"
                    >
                        <Plus size={16} /> {T('addCategory', 'Add Category')}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 overflow-y-auto">
                    {loading ? (
                        <p className="text-gray-400 col-span-3 text-center py-8">{T('loading', 'Loading...')}</p>
                    ) : categories.map(cat => {
                        const catProducts = products.filter(p => p.category?.id === cat.id)
                        const isSelected = selected?.id === cat.id

                        return (
                            <div
                                key={cat.id}
                                onClick={() => setSelected(isSelected ? null : cat)}
                                className={`border rounded-xl p-4 cursor-pointer transition Relative group ${
                                    isSelected ? 'border-pink-400 bg-pink-50 shadow-sm' : 'border-gray-100 hover:border-pink-200 hover:bg-pink-50'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isSelected ? 'bg-pink-500' : 'bg-pink-100'}`}>
                                    <span className={`text-xl ${isSelected ? 'text-white' : 'text-pink-500'}`}>✿</span>
                                </div>

                                <p className="font-semibold text-gray-800">{cat.categoryName}</p>
                                <p className="text-xs text-gray-400 mt-1">{catProducts.length} {T('products', 'Products')}</p>
                                <p className="text-xs text-gray-400">
                                    {T('createdAt', 'Created')} {new Date(cat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>

                                <div className="flex gap-3 mt-3">
                                    {/* 💡 ປຸ່ມແກ້ໄຂ (Edit) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            openEditModal(cat)
                                        }}
                                        className="text-xs text-pink-500 hover:text-pink-700 hover:underline flex items-center gap-1"
                                    >
                                        <Edit2 size={12} /> {T('edit', 'Edit')}
                                    </button>
                                    
                                    {/* ປຸ່ມລົບ (Delete) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDelete(cat.id)
                                        }}
                                        className="text-xs text-red-400 hover:text-red-600 hover:underline"
                                    >
                                        {T('delete', 'Delete')}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ເຄິ່ງຂວາ: ສະແດງລາຍການສິນຄ້າພາຍໃນໝວດໝູ່ທີ່ຖືກເລືອກ */}
            {selected && (
                <div className="w-96 border-l border-gray-100 flex flex-col p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-gray-800">{selected.categoryName}</h3>
                            <p className="text-xs text-gray-400 mt-1">{categoryProducts.length} {T('products', 'Products')}</p>
                        </div>
                        <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {categoryProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                                <span className="text-4xl mb-2">📦</span>
                                <p className="text-sm">{T('noProducts', 'No products yet')}</p>
                                <p className="text-xs mt-1">{T('addProductsHint', 'Add products in the Products page')}</p>
                            </div>
                        ) : categoryProducts.map(product => (
                            <div key={product.productId} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-pink-200 transition">
                                <div className="w-12 h-12 bg-pink-50 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {product.imageUrl ? (
                                        <img src={getImageUrl(product.imageUrl)} alt={product.productName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                                    ) : (
                                        <span className="text-xl">✿</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{product.productName}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{T('stockLevel', 'Stock')}: {product.quantityOnHand}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-pink-500">{Number(product.unitPrice).toLocaleString('lo-LA')} ₭</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStockStyle(product.quantityOnHand)}`}>{getStockLabel(product.quantityOnHand)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {categoryProducts.length > 0 && (
                        <div className="border-t border-gray-100 pt-4 mt-4">
                            <div className="flex justify-between text-sm text-gray-500 mb-1">
                                <span>{T('totalProducts', 'Total Products')}</span>
                                <span className="font-medium text-gray-800">{categoryProducts.length}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500 mb-1">
                                <span>{T('totalStock', 'Total Stock')}</span>
                                <span className="font-medium text-gray-800">{categoryProducts.reduce((sum, p) => sum + Number(p.quantityOnHand), 0)} units</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{T('totalValue', 'Total Value')}</span>
                                <span className="font-bold text-pink-500">{categoryProducts.reduce((sum, p) => sum + (Number(p.unitPrice) * Number(p.quantityOnHand)), 0).toLocaleString('lo-LA')} ₭</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ໜ້າຕ່າງ Modal ຟອມສ້າງໃໝ່ / ແກ້ໄຂ */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">
                                {isEditMode ? T('editCategory', 'Edit Category') : T('addCategory', 'Add Category')}
                            </h3>
                            <button onClick={closeModal}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-600 mb-1 block">{T('categoryName', 'Category Name')}</label>
                                <input
                                    type="text"
                                    value={form.categoryName}
                                    onChange={(e) => setForm({ categoryName: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                                    placeholder="e.g. Lipstick, Foundation..."
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm">{T('cancel', 'Cancel')}</button>
                                <button type="submit" className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-sm hover:bg-pink-600">
                                    {isEditMode ? T('save', 'Save') : T('add', 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}