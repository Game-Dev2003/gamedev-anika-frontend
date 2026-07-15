'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Search, X, ShoppingCart, User, Smartphone, DollarSign } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonProductCard } from '@/components/Skeleton'

export default function SalesPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [products, setProducts] = useState([])
    const [customers, setCustomers] = useState([])
    const [categories, setCategories] = useState([])
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [orderItems, setOrderItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [productsLoading, setProductsLoading] = useState(true)
    const [billNo, setBillNo] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [showCustomerSearch, setShowCustomerSearch] = useState(false)
    const [customerSearch, setCustomerSearch] = useState('')

    // 🎯 State สำหรับแยกยอดเงินผสมหน้าร้าน (Hybrid Payment)
    const [cashAmount, setCashAmount] = useState('')
    const [transferAmount, setTransferAmount] = useState('')

    useEffect(() => {
        setMounted(true)
        const num = Math.floor(Math.random() * 9000) + 1000
        setBillNo(`POS-${num}`)
        fetchProducts()
        fetchCustomers()
        fetchCategories()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products')
            setProducts(res.data.filter(p => p.status === 'active'))
        } catch { toast.error('Failed to load products') }
        finally { setProductsLoading(false) }
    }

    const fetchCustomers = async () => {
        try { const res = await api.get('/customers'); setCustomers(res.data) } catch { }
    }

    const fetchCategories = async () => {
        try { const res = await api.get('/categories'); setCategories(res.data) } catch { }
    }

    const filteredProducts = products.filter(p => {
        const matchSearch = p.productName.toLowerCase().includes(search.toLowerCase()) ||
            p.category?.categoryName?.toLowerCase().includes(search.toLowerCase())
        const matchCategory = selectedCategory === 'all' ||
            p.category?.id === parseInt(selectedCategory)
        return matchSearch && matchCategory
    })

    const filteredCustomers = customers.filter(c =>
        c.customerName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
    )

    const addToOrder = (product) => {
        const pId = product.id || product.productId
        const existing = orderItems.find(item => item.productId === pId)

        if (existing) {
            setOrderItems(orderItems.map(item =>
                item.productId === pId
                    ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
                    : item
            ))
        } else {
            setOrderItems([...orderItems, {
                productId: pId,
                productName: product.productName,
                category: product.category?.categoryName || '',
                quantity: 1,
                unitPrice: product.unitPrice,
                lineTotal: product.unitPrice
            }])
        }
    }

    const removeItem = (productId) =>
        setOrderItems(orderItems.filter(item => item.productId !== productId))

    const updateQty = (productId, qty) => {
        if (qty <= 0) { removeItem(productId); return }
        setOrderItems(orderItems.map(item =>
            item.productId === productId
                ? { ...item, quantity: qty, lineTotal: qty * item.unitPrice }
                : item
        ))
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0)

    // ตัวแปรแปลงข้อความในช่อง Input มาคำนวณคณิตศาสตร์หลังบ้าน
    const cashAmountNum = cashAmount ? parseInt(cashAmount.replace(/[^0-9]/g, '')) : 0
    const transferAmountNum = transferAmount ? parseInt(transferAmount.replace(/[^0-9]/g, '')) : 0
    const totalPaid = cashAmountNum + transferAmountNum
    const remainingToPay = subtotal - totalPaid

    const completeSale = async () => {
        if (orderItems.length === 0) {
            toast.error(T('pleaseAddItems', 'Please add items to order'))
            return
        }

        if (totalPaid < subtotal) {
            toast.error(`ຍັງຂາດເງິນອີກ: ${remainingToPay.toLocaleString('lo-LA')} ₭ / Insufficient amount paid!`)
            return
        }

        setLoading(true)
        try {
            // STEP 1: ส่งข้อมูลไปสร้างบิลขายหลัก (POST /sales)
            const determineMethod = cashAmountNum > 0 && transferAmountNum > 0 ? 'hybrid' : (cashAmountNum > 0 ? 'cash' : 'transfer');
            const saleRes = await api.post('/sales', {
                billNo,
                customerId: selectedCustomer?.id || selectedCustomer?.customerId || null,
                paymentMethod: determineMethod,
                items: orderItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                }))
            })

            const createdSaleId = saleRes.data?.saleId || saleRes.data?.id

            // STEP 2: บันทึกข้อมูลเข้าตาราง payments แยกเป็น 2 แถวผูกกับ sale_id เดียวกัน (ManyToOne)

            // แถวเงินสด
            // ✅ ປັບປຸງໃນ SalesPage.tsx ໃຫ້ສົ່ງ "verifiedBy" ຕົງໆ
            if (cashAmountNum > 0) {
                const currentUserId = localStorage.getItem('userId') || 1;

                await api.post(`/payments?saleId=${createdSaleId}`, {
                    method: 'cash',
                    amount: cashAmountNum,
                    qrPayload: null,
                    status: 'verified',
                    verifiedAt: new Date().toISOString(),
                    verifiedBy: parseInt(currentUserId) // 🔥 ປ່ຽນຈາກ verifiedById ມາເປັນ verifiedBy
                });
            }
            // แถวเงินโอน
            if (transferAmountNum > 0) {
                await api.post(`/payments?saleId=${createdSaleId}`, {
                    method: 'transfer',
                    amount: transferAmountNum,
                    qrPayload: 'STATIC_SHOP_QR_ACCOUNT', // บันทึกว่าเป็นสแตติกคิวอาร์ของร้าน
                    status: 'paid' // ตั้งสถานะ "จ่ายแล้ว/รอพนักงานกวดสลิปส่องดูยอด"
                })
            }

            toast.success(T('saleCompleted', 'Sale completed!'))
            setOrderItems([])
            setSelectedCustomer(null)
            setCashAmount('')
            setTransferAmount('')
            const num = Math.floor(Math.random() * 9000) + 1000
            setBillNo(`POS-${num}`)
            router.push('/billing')
        } catch (err) {
            toast.error(err.response?.data?.message || T('saleFailed', 'Sale failed'))
        } finally {
            setLoading(false)
        }
    }

    const cardColors = [
        'bg-pink-50', 'bg-amber-50', 'bg-rose-50',
        'bg-purple-50', 'bg-yellow-50', 'bg-green-50'
    ]

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null
        const BACKEND_RENDER = 'https://gamedev-anika-backend.onrender.com'
        return `${BACKEND_RENDER}${imageUrl}`
    }

    const quickCash = [5000, 10000, 20000, 50000, 100000, 500000]

    return (
        <div className="flex h-screen bg-gray-50">
            <Toaster />
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder={T('searchProducts', 'Search by name, category, or SKU...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer"
                        >
                            <option value="all">{T('allCategories', 'All Categories')}</option>
                            {categories.map(c => (
                                <option key={`cat-${c.id}`} value={c.id}>{c.categoryName}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-2.5 pointer-events-none text-gray-400">▾</div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 overflow-y-auto pb-4">
                    {productsLoading ? (
                        [...Array(8)].map((_, i) => <SkeletonProductCard key={`skeleton-pos-${i}`} />)
                    ) : filteredProducts.map((product, index) => (
                        <div
                            key={`sales-p-${product.id || product.productId}-${index}`}
                            onClick={() => addToOrder(product)}
                            className="bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:border-pink-300 hover:shadow-md transition relative"
                        >
                            <div className="absolute top-2 left-2 z-10">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium
                                    ${Number(product.quantityOnHand || 0) > 10
                                        ? 'bg-green-500 text-white'
                                        : Number(product.quantityOnHand || 0) > 0
                                            ? 'bg-orange-400 text-white'
                                            : 'bg-gray-400 text-white'
                                    }`}>
                                    {Number(product.quantityOnHand || 0) > 10
                                        ? T('inStock', 'IN STOCK')
                                        : Number(product.quantityOnHand || 0) > 0
                                            ? T('lowStock', 'LOW STOCK')
                                            : T('outOfStock', 'OUT')}
                                </span>
                            </div>
                            <div className={`w-full h-28 ${cardColors[index % cardColors.length]} rounded-lg mb-3 flex items-center justify-center overflow-hidden`}>
                                {product.imageUrl ? (
                                    <img src={getImageUrl(product.imageUrl)} alt={product.productName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                                ) : <span className="text-4xl">✿</span>}
                            </div>
                            <p className="text-sm font-medium text-gray-800 truncate">{product.productName}</p>
                            <p className="text-xs text-gray-400 mb-1">{product.category?.categoryName}</p>
                            <p className="text-pink-500 font-bold text-sm">{Number(product.unitPrice).toLocaleString('lo-LA')} ₭</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right - Order Cart */}
            <div className="w-80 bg-white border-l border-gray-100 flex flex-col p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-800">{T('currentOrder', 'Current Order')}</h2>
                    <span className="text-xs text-pink-500 font-medium">#{billNo}</span>
                </div>

                {/* Customer Section */}
                <div className="mb-4 relative">
                    <div onClick={() => setShowCustomerSearch(!showCustomerSearch)} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-pink-300 transition">
                        <User size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600 flex-1">{selectedCustomer ? selectedCustomer.customerName : T('walkInCustomer', 'Walk-in Customer')}</span>
                        {selectedCustomer && (
                            <button onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null) }} className="text-gray-400 hover:text-red-400"><X size={14} /></button>
                        )}
                    </div>
                    {showCustomerSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 rounded-lg shadow-lg bg-white z-20">
                            <div className="p-2">
                                <input type="text" placeholder={T('searchCustomer', 'Search customer...')} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300" autoFocus />
                            </div>
                            <div className="max-h-40 overflow-y-auto">
                                <div onClick={() => { setSelectedCustomer(null); setShowCustomerSearch(false); setCustomerSearch('') }} className="px-3 py-2 text-sm text-gray-600 hover:bg-pink-50 cursor-pointer">{T('walkInCustomer', 'Walk-in Customer')}</div>
                                {filteredCustomers.map((customer, idx) => (
                                    <div key={`cust-pos-${customer.id || idx}`} onClick={() => { setSelectedCustomer(customer); setShowCustomerSearch(false); setCustomerSearch('') }} className="px-3 py-2 hover:bg-pink-50 cursor-pointer">
                                        <p className="text-sm font-medium text-gray-800">{customer.customerName}</p>
                                        {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {orderItems.length > 0 && (
                    <div className="flex text-xs text-pink-500 font-medium mb-2 px-1">
                        <span className="flex-1">ITEM</span>
                        <span className="w-12 text-center">QTY</span>
                        <span className="w-16 text-right">PRICE</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-3">
                    {orderItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                            <ShoppingCart size={32} />
                            <p className="text-sm mt-2">{T('noItemsYet', 'No items yet')}</p>
                            <p className="text-xs mt-1">{T('clickToAdd', 'Click product to add')}</p>
                        </div>
                    ) : orderItems.map((item, index) => (
                        <div key={`cart-item-${item.productId}-${index}`} className="flex items-start gap-2">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                                {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200">-</button>
                                <span className="w-6 text-center text-sm">{item.quantity}</span>
                                <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-200">+</button>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-14 text-right text-sm font-medium text-pink-500">{Number(item.lineTotal).toLocaleString('lo-LA')} ₭</span>
                                <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-400"><X size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {orderItems.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>{T('subtotal', 'Subtotal')}</span>
                            <span>{Number(subtotal).toLocaleString('lo-LA')} ₭</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t border-gray-100 mb-2">
                            <span>{T('total', 'Total')}</span>
                            <span className="text-pink-500 text-base">{subtotal.toLocaleString('lo-LA')} ₭</span>
                        </div>

                        {/* แผงคีย์แยกยอดชำระแบบสัดส่วนผสม */}
                        <div className="border-t pt-2 space-y-2">
                            <p className="text-[10px] text-gray-400 font-bold">💵 ແຍກຍອດຊຳລະເງິນ (Hybrid Payment)</p>
                            <div className="space-y-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                <div>
                                    <div className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-gray-600 font-bold">💵 ຮັບເງິນສົດ (เงินสด)</span>
                                        <button onClick={() => { setCashAmount(subtotal.toString()); setTransferAmount('') }} className="text-pink-500 hover:underline text-[9px]">จ่ายสดเต็มจำนวน</button>
                                    </div>
                                    <input type="text" placeholder="0 ₭" value={cashAmount ? parseInt(cashAmount.replace(/[^0-9]/g, '') || '0').toLocaleString('lo-LA') : ''} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setCashAmount(val); const numVal = val ? parseInt(val) : 0; if (numVal < subtotal) { setTransferAmount((subtotal - numVal).toString()) } else { setTransferAmount('') } }} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs text-right font-bold text-gray-800 focus:ring-1 focus:ring-pink-300 outline-none" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] mb-0.5">
                                        <span className="text-blue-600 font-bold">📱 ສະແກນໂອນ (เงินโอน)</span>
                                        <button onClick={() => { setTransferAmount(subtotal.toString()); setCashAmount('') }} className="text-blue-500 hover:underline text-[9px]">โอนเต็มจำนวน</button>
                                    </div>
                                    <input type="text" placeholder="0 ₭" value={transferAmount ? parseInt(transferAmount.replace(/[^0-9]/g, '') || '0').toLocaleString('lo-LA') : ''} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setTransferAmount(val); const numVal = val ? parseInt(val) : 0; if (numVal < subtotal) { setCashAmount((subtotal - numVal).toString()) } else { setCashAmount('') } }} className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs text-right font-bold text-gray-800 focus:ring-1 focus:ring-blue-300 outline-none" />
                                </div>
                            </div>

                            {/* แผงประเมินความครบถ้วนของเงิน */}
                            {remainingToPay > 0 ? (
                                <div className="text-center text-[11px] p-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg font-bold">⚠️ ຍັງຂາດເງິນອີກ: {remainingToPay.toLocaleString('lo-LA')} ₭</div>
                            ) : remainingToPay < 0 ? (
                                <div className="text-center text-[11px] p-1 bg-green-50 text-green-600 border border-green-100 rounded-lg font-bold">💵 ເງິນທອນ (เงินทอน): {Math.abs(remainingToPay).toLocaleString('lo-LA')} ₭</div>
                            ) : (
                                <div className="text-center text-[11px] p-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-black">✅ ຍອດເງິນຄົບພໍດີ (ยอดครบพอดี)</div>
                            )}
                        </div>

                        {/* 🎯 [จุดสำคัญวิธีที่ 2]: กล่องโชว์รูป QR บัญชีของร้านจริง ๆ พ่วงตัวเลขยอดที่ลูกค้าต้องโอน */}
                        {transferAmountNum > 0 && (
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center animate-fadeIn space-y-2">
                                <div className="w-32 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
                                    {/* 📸 นำรูป QR ร้านไปแปะไว้ที่ public/images/shop-qr.png ได้เลยครับ */}
                                    <img
                                        src="/images/shop-qr.png"
                                        alt="Anika Beauty QR Account"
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentNode.innerHTML = "<span class='text-xs text-gray-400 font-bold'>📸 QR ACCOUNT</span>";
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium">
                                    📱 ຍອດເງິນທີ່ຕ້ອງສະແກນໂอน: <br />
                                    <span className="text-blue-600 font-black text-sm">
                                        {transferAmountNum.toLocaleString('lo-LA')} ₭
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4 space-y-2">
                    {orderItems.length > 0 && (
                        <div className="flex gap-2">
                            <button onClick={() => { setOrderItems([]); setCashAmount(''); setTransferAmount('') }} className="flex-1 flex items-center justify-center gap-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">✕ {T('cancel', 'Cancel')}</button>
                            <button onClick={() => router.push('/billing')} className="flex-1 flex items-center justify-center gap-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">🧾 {T('receipt', 'Receipt')}</button>
                        </div>
                    )}
                    <button onClick={completeSale} disabled={loading || orderItems.length === 0} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-40">{loading ? T('processing', 'Processing...') : T('completeSale', 'Complete Sale →')}</button>
                </div>
            </div>
        </div>
    )
}