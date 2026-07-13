'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import api from '@/lib/api'
import { Search, X, Plus, Edit2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonRow } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

export default function ProductsPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [editProduct, setEditProduct] = useState(null)

    const [form, setForm] = useState({
        productName: '',
        unitPrice: '',
        status: 'active',
        categoryId: '',
        imageUrl: ''
    })

    useEffect(() => {
        setMounted(true)
        fetchProducts()
        fetchCategories()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    // ດຶງຂໍ້ມູນລາຍການສິນຄ້າທັງໝົດຈາກ API ຫຼັງບ້ານ
    const fetchProducts = async () => {
        try {
            const res = await api.get('/products')
            setProducts(res.data || [])
        } catch {
            toast.error(T('failedLoadProducts', 'Failed to load products'))
        } finally {
            setLoading(false)
        }
    }

    // ດຶງຂໍ້ມູນໝວດໝູ່ທັງໝົດເພື່ອເອົາມາສະແດງໃນ Dropdown ກັ່ນຕອງ
    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories')
            setCategories(res.data || [])
        } catch (err) {
            console.error(err)
        }
    }

    // ຈັດການປ່ຽນແປງ Path ຂອງຮູບພາບໃຫ້ຊີ້ຫາ Server ຢ່າງຖືກຕ້ອງ
    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null
        const BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8800'
        return `${BASE}${imageUrl}`
    }

    // ຟັງຊັນອັບໂຫລດຮູບພາບຜະລິດຕະພັນໄປຫາເຊີເວີ
    const handleImageUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return
        const formData = new FormData(); formData.append('file', file)
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8800'
        try {
            const res = await axios.post(`${BASE_URL}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setForm(prev => ({ ...prev, imageUrl: res.data.url }))
            toast.success(T('imageUploaded', 'Image uploaded!'))
        } catch {
            toast.error(T('uploadFailed', 'Upload failed'))
        }
    }

    // ກຽມຂໍ້ມູນສິນຄ້າທີ່ເລືອກເຂົ້າສູ່ຟອມເພື່ອດຳເນີນການແກ້ໄຂ
    const handleEdit = (product) => {
        setForm({
            productName: product.productName,
            unitPrice: product.unitPrice?.toString() || '',
            status: product.status,
            categoryId: product.category?.id?.toString() || product.category?.categoryId?.toString() || '',
            imageUrl: product.imageUrl || ''
        })
        setEditProduct(product)
        setEditMode(true)
        setShowModal(true)
    }

    // ເຄຼຍຂໍ້ມູນໃນຟອມ ແລະ ປິດໜ້າຕ່າງ Modal
    const resetForm = () => {
        setForm({
            productName: '',
            unitPrice: '',
            status: 'active',
            categoryId: '',
            imageUrl: ''
        })
        setEditMode(false)
        setEditProduct(null)
        setShowModal(false)
    }

    // ຟັງຊັນສົ່ງຂໍ້ມູນໄປບັນທຶກສ້າງສິນຄ້າໃໝ່
    const handleSubmit = async (e) => {
        e.preventDefault()
        const rawPrice = parseFloat(form.unitPrice.toString().replace(/[^0-9.]/g, ''))
        try {
            await api.post(`/products?categoryId=${form.categoryId}`, {
                productName: form.productName,
                unitPrice: rawPrice,
                status: form.status,
                imageUrl: form.imageUrl
            })
            toast.success(T('productAdded', 'Product added!'))
            resetForm()
            fetchProducts()
        } catch (err) {
            toast.error(err.response?.data?.message || T('failed', 'Failed'))
        }
    }

    // ຟັງຊັນສົ່ງຂໍ້ມູນໄປອັບເດດແກ້ໄຂສິນຄ້າຕົວເດີມ
    const handleUpdate = async (e) => {
        e.preventDefault()
        const rawPrice = parseFloat(form.unitPrice.toString().replace(/[^0-9.]/g, ''))
        try {
            await api.put(`/products/${editProduct.productId}?categoryId=${form.categoryId}`, {
                productName: form.productName,
                unitPrice: rawPrice,
                status: form.status,
                imageUrl: form.imageUrl
            })
            toast.success(T('productUpdated', 'Product updated!'))
            resetForm()
            fetchProducts()
        } catch (err) {
            toast.error(err.response?.data?.message || T('failed', 'Failed'))
        }
    }

    // 💡 ຟັງຊັນສະຫຼັບສະຖານະ ເປີດ (Activate) ຫຼື ປິດ (Deactivate) ການໃຊ້ງານສິນຄ້າ
    const handleToggle = async (product) => {
        try {
            if (product.status === 'active') {
                await api.delete(`/products/${product.productId}`)
                toast.success(T('productDeactivated', 'Deactivated!'))
            } else {
                await api.put(`/products/${product.productId}/activate`)
                toast.success(T('productActivated', 'Activated!'))
            }
            fetchProducts()
        } catch {
            toast.error(T('failed', 'Failed'))
        }
    }

    // ຟັງຊັນກຳນົດປ້າຍເຕືອນຕາມຈຳນວນສະຕັອກ
    const getStockStatus = (qty) => {
        if (qty <= 0) return { label: T('outOfStock', 'ໝົດສະຕັອກ'), style: 'bg-red-100 text-red-500' }
        if (qty <= 10) return { label: T('lowStock', 'ສະຕັອກໜ້ອຍ'), style: 'bg-orange-100 text-orange-500' }
        return { label: T('inStock', 'ມີສິນຄ້າ'), style: 'bg-green-100 text-green-600' }
    }

    const getStockBarWidth = (qty) => {
        if (qty <= 0) return 'w-0'
        if (qty <= 10) return 'w-1/4'
        if (qty <= 50) return 'w-1/2'
        return 'w-full'
    }

    const getStockBarColor = (qty) => {
        if (qty <= 0) return 'bg-red-400'
        if (qty <= 10) return 'bg-orange-400'
        return 'bg-green-400'
    }

    // ການກັ່ນຕອງຄົ້ນຫາສິນຄ້າຕາມຊື່ ແລະ ໝວດໝູ່
    const filteredProducts = products.filter(p => {
        const matchSearch = p.productName?.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.categoryName?.toLowerCase().includes(search.toLowerCase())
        const pCatId = p.category?.id || p.category?.categoryId
        const matchCategory = selectedCategory === 'all' || pCatId === parseInt(selectedCategory)
        return matchSearch && matchCategory
    })

    return (
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
            <Toaster />

            {/* ສ່ວນຫົວ: ຄົ້ນຫາ, ເລືອກໝວດໝູ່ ແລະ ປຸ່ມເພີ່ມສິນຄ້າ */}
            <div className="flex items-center gap-2 lg:gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                        type="text"
                        placeholder={T('searchProducts', 'ຄົ້ນຫາສິນຄ້າ...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 lg:px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-300"
                >
                    <option value="all">{T('allCategories', 'ທັງໝົດ')}</option>
                    {categories.map((c) => (
                        <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                            {c.categoryName}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => { resetForm(); setShowModal(true) }}
                    className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 whitespace-nowrap"
                >
                    <Plus size={16} />
                    <span className="hidden lg:inline">{T('addNewProduct', 'ເພີ່ມສິນຄ້າໃໝ່')}</span>
                    <span className="lg:hidden">{T('add', 'ເພີ່ມ')}</span>
                </button>
            </div>

            {/* ຕາຕະລາງສະແດງລາຍການສິນຄ້າ */}
            <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[600px]">
                    <thead>
                        <tr className="text-xs text-pink-500 border-b border-gray-100">
                            <th className="text-left py-3 px-2">{T('productNameLabel', 'ສິນຄ້າ')}</th>
                            <th className="text-left py-3 px-2">{T('categoryLabel', 'ໝວດໝູ່')}</th>
                            <th className="text-left py-3 px-2">{T('priceLabel', 'ລາຄາຂາຍ')}</th>
                            <th className="text-left py-3 px-2">{T('stockLevelLabel', 'ສິນຄ້າໃນສະຕັອກ')}</th>
                            <th className="text-left py-3 px-2">{T('statusLabel', 'ສະຖານະ')}</th>
                            <th className="text-left py-3 px-2">{T('actionsLabel', 'ຈັດການ')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /></>
                        ) : filteredProducts.length === 0 ? (
                            <tr Sispan="6"><td>
                                <EmptyState
                                    icon={search || selectedCategory !== 'all' ? '🔍' : '✿'}
                                    title={search || selectedCategory !== 'all' ? T('noProductFound', 'ບໍ່ພົບສິນຄ້າ') : T('noProductYet', 'ຍັງບໍ່ມີສິນຄ້າ')}
                                    description={search || selectedCategory !== 'all' ? T('tryAnotherSearch', 'ລອງຄົ້ນຫາດ້ວຍຄຳອື່ນ') : T('clickAddProductHint', 'ກົດປຸ່ມ ເພີ່ມສິນຄ້າ ເພື່ອເລີ່ມຕົ້ນ')}
                                    action={!search && selectedCategory === 'all' ? { label: T('addNewProduct', '+ ເພີ່ມສິນຄ້າ'), onClick: () => { resetForm(); setShowModal(true) } } : undefined}
                                />
                            </td></tr>
                        ) : filteredProducts.map(product => {
                            const currentQty = product.quantityOnHand !== undefined ? product.quantityOnHand : (product.quantity_on_hand || 0)
                            const stockStatus = getStockStatus(currentQty)
                            
                            return (
                                <tr key={product.productId} className="border-b border-gray-50 hover:bg-pink-50 transition">
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-pink-50 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                                {product.imageUrl ? (
                                                    <img src={getImageUrl(product.imageUrl)} alt={product.productName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                                                ) : (
                                                    <span className="text-lg">✿</span>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{product.productName}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-500 whitespace-nowrap">{product.category?.categoryName || '-'}</td>
                                    <td className="py-3 px-2 text-sm font-medium text-pink-500 whitespace-nowrap">{Number(product.unitPrice || 0).toLocaleString('lo-LA')} ₭</td>
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-100 rounded-full hidden lg:block">
                                                <div className={`h-full rounded-full ${getStockBarWidth(currentQty)} ${getStockBarColor(currentQty)}`} />
                                            </div>
                                            <span className="text-xs text-gray-500 whitespace-nowrap">{currentQty}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${stockStatus.style}`}>{stockStatus.label}</span>
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex gap-1 lg:gap-2">
                                            <button onClick={() => handleEdit(product)} className="text-xs px-2 lg:px-3 py-1 rounded-lg border border-blue-200 text-blue-400 hover:bg-blue-50 transition flex items-center gap-1">
                                                <Edit2 size={11} /><span className="hidden lg:inline">{T('edit', 'ແກ້ໄຂ')}</span>
                                            </button>
                                            <button onClick={() => handleToggle(product)} className={`text-xs px-2 lg:px-3 py-1 rounded-lg border transition whitespace-nowrap ${product.status === 'active' ? 'border-red-200 text-red-400 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'}`}>
                                                {product.status === 'active' ? T('deactivate', 'ປິດ') : T('activate', 'ເປີດ')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* ໜ້າຕ່າງ Modal ຟອມ (ເພີ່ມສິນຄ້າໃໝ່ / ແກ້ໄຂສິນຄ້າ) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">
                                {editMode ? T('editProduct', 'ແກ້ໄຂສິນຄ້າ') : T('addNewProduct', 'ເພີ່ມສິນຄ້າໃໝ່')}
                            </h3>
                            <button onClick={resetForm}><X size={18} className="text-gray-400" /></button>
                        </div>

                        <form onSubmit={editMode ? handleUpdate : handleSubmit} className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-sm text-gray-600 mb-1 block">{T('productImage', 'ຮູບພາບສິນຄ້າ')}</label>
                                {form.imageUrl && (
                                    <div className="mb-2 relative">
                                        <img src={getImageUrl(form.imageUrl)} alt="preview" className="w-full h-32 object-cover rounded-lg" onError={(e) => { e.target.style.display = 'none' }} />
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                                    </div>
                                )}
                                <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-4 cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition">
                                    <span className="text-2xl">📷</span>
                                    <span className="text-sm text-gray-500">{form.imageUrl ? T('changeImage', 'ป່ຽນຮູບ') : T('uploadImage', 'ອັບໂຫຼດຮູບ')}</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            </div>

                            <div className="col-span-2">
                                <label className="text-sm text-gray-600 mb-1 block">{T('productName', 'ຊື່ສິນຄ້າ')}</label>
                                <input type="text" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required />
                            </div>

                            <div className="col-span-1">
                                <label className="text-sm text-gray-600 mb-1 block">{T('unitPrice', 'ລາຄາຂາຍ/ໜ່ວຍ')}</label>
                                <input
                                    type="text"
                                    value={form.unitPrice ? Number(form.unitPrice.toString().replace(/[^0-9]/g, '')).toLocaleString('lo-LA') : ''}
                                    onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm({ ...form, unitPrice: raw }) }}
                                    placeholder="0 ₭"
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                                    required
                                />
                            </div>

                            <div className="col-span-1">
                                <label className="text-sm text-gray-600 mb-1 block">{T('category', 'ໝວດໝູ່')}</label>
                                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required>
                                    <option value="">{T('select', 'ເລືອກ...')}</option>
                                    {categories.map(c => (
                                        <option key={c.id || c.categoryId} value={c.id || c.categoryId}>
                                            {c.categoryName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 flex gap-3 pt-2">
                                <button type="button" onClick={resetForm} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                                    {T('cancel', 'ຍົກເລີກ')}
                                </button>
                                <button type="submit" className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-sm hover:bg-pink-600">
                                    {editMode ? T('update', 'ອັບເດດ') : T('addProduct', 'ເພີ່ມ')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}