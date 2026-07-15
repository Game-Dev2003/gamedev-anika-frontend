'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, Printer } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

const formatCurrency = (amount) => {
    const num = Number(amount)
    return `${num.toLocaleString('lo-LA')} ₭`
}

export default function BillingPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [sales, setSales] = useState([])
    const [selected, setSelected] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
        fetchSales()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const getMethodLabel = (method) => {
        if (!mounted) return method
        switch (method?.toLowerCase()) {
            case 'cash': return t('methodCash') || 'ເງິນສົດ'
            case 'transfer': return t('methodTransfer') || 'ເງິນໂອນ'
            case 'hybrid': return t('methodHybrid') || 'ຜะສົມ'
            default: return method || '-'
        }
    }

    const getStatusLabel = (status) => {
        if (!mounted) return status
        switch (status) {
            case 'verified': return t('statusVerified') || 'ຊຳລະແແລ້ວ'
            case 'paid': return t('statusPaid') || 'ຈ່າຍແລ້ວ'
            case 'refunded': return t('statusRefunded') || 'ຄືນເງິນ'
            case 'pending': return t('statusPending') || 'ລໍຖ້າ'
            default: return status
        }
    }

    const fetchSales = async () => {
        try {
            const res = await api.get('/sales')
            const sorted = res.data.sort((a, b) =>
                new Date(b.saleDatetime) - new Date(a.saleDatetime)
            )
            setSales(sorted)
            
            // ✅ ຮັກສາບິນຕົວເກົ່າທີ່ກຳລັງເບິ່ງຢູ່ໃຫ້ບໍ່ຫຼຸດ ຖ້າບໍ່ມີໃຫ້ fallback ເອົາບິນທຳອິດ
            if (sorted.length > 0) {
                if (selected) {
                    const updatedSelected = sorted.find(s => s.saleId === selected.saleId)
                    setSelected(updatedSelected || sorted[0])
                } else {
                    setSelected(sorted[0])
                }
            }
        } catch (err) {
            toast.error(T('failedToLoad', 'Failed to load invoices'))
        } finally {
            setLoading(false)
        }
    }

    // 🔥 [ເພີ່ມໃໝ່]: ຟັງຊັນຍິງອັບເດດສະຖານະການໂອນເງິນເຂົ້າ Supabase
    const handleVerifyPayment = async (paymentId) => {
        try {
            // ດຶງ ID ພະນັກງານທີ່ລັອກອິນຂາຍເຄື່ອງປະຈຸບັນອອກມາ
            const currentUserId = localStorage.getItem('userId') || '1'; 
            
            // 🚀 ຍິງ PUT ໄປຫາ Backend ຜ່ານ Vercel Proxy
            await api.put(`/payments/${paymentId}/verify`, {
                verifiedBy: parseInt(currentUserId),
                verifiedAt: new Date().toISOString()
            })

            toast.success('ຢືນຢັນຍອດເງິນໂອນສຳເລັດແລ້ວ! / Payment verified!')
            fetchSales() // ໂຫຼດຂໍ້ມູນໃໝ່ເພື່ອອັບເດດໜ້າຈໍ
        } catch (err) {
            toast.error('ບໍ່ສາມາດຢືນຢັນຍອດເງິນໄດ້ / Failed to verify payment')
        }
    }

    const getPaymentStatus = (sale) => {
        if (!sale.payments || sale.payments.length === 0) return 'pending'
        return sale.payments[0].status
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'paid': return 'bg-orange-100 text-orange-600' // ຈ່າຍແລ້ວ (ລໍຖ້າກວດສອບ)
            case 'verified': return 'bg-green-100 text-green-600'  // ກວດສອບແລ້ວ
            case 'refunded': return 'bg-red-100 text-red-500'
            default: return 'bg-gray-100 text-gray-500'
        }
    }

    const handlePrint = () => {
        const status = getPaymentStatus(selected)
        const statusColor = status === 'paid' || status === 'verified' ? '#16a34a' : status === 'refunded' ? '#ef4444' : '#6b7280'

        const cashPayment = selected.payments?.find(p => p.method === 'cash')
        const transferPayment = selected.payments?.find(p => p.method === 'transfer')

        const html = `
        <html>
            <head>
                <title>ໃບບິນ #${selected.billNo}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700&display=swap');
                    @page { size: 80mm auto; margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        width: 76mm; margin: 0 auto;
                        font-family: 'Noto Sans Lao', monospace; font-size: 11px; color: #000; padding: 6px 8px;
                        display: flex; flex-direction: column; align-items: center;
                    }
                    .shop-name, .shop-sub, .shop-address, .divider-solid, .divider-dash, .bill-no, .info-row, .customer-box, table, .total-section, .payment-section, .footer, .footer-brand { width: 100%; }
                    .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; }
                    .shop-name { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 2px; }
                    .shop-sub { text-align: center; font-size: 10px; color: #ec4899; margin-bottom: 2px; }
                    .divider-solid { border-top: 1.5px solid #000; margin: 5px 0; }
                    .divider-dash { border-top: 1px dashed #aaa; margin: 5px 0; }
                    .info-row { display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0; }
                    .status-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; color: ${statusColor}; border: 1px solid ${statusColor}; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 4px 0; }
                    th { text-align: left; font-size: 9px; padding: 3px 0; border-bottom: 1px solid #000; }
                    td { padding: 3px 0; vertical-align: top; font-size: 10px; }
                    .grand-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 15px; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; margin: 3px 0; padding: 4px 0; }
                </style>
            </head>
            <body>
                <div class="shop-name">✿ Anika Beauty ✿</div>
                <div class="shop-sub">LUXURY EXPERIENCE</div>
                <div class="shop-address">ວຽງຈັນ, ສປປ ລາວ</div>
                <div class="divider-solid"></div>
                <div class="bill-no">ໃບບິນ / RECEIPT #${selected.billNo}</div>
                <div class="divider-dash"></div>
                <div class="info-row"><span>📅 ວັນທີ:</span><span class="bold">${new Date(selected.saleDatetime).toLocaleString('lo-LA')}</span></div>
                <div class="info-row"><span>👤 ພະນັກງານ:</span><span>${selected.user?.username || 'N/A'}</span></div>
                <div class="info-row"><span>📋 ສະຖານະ:</span><span class="status-badge">${status === 'verified' ? '✓ ຊຳລະແລ້ວ' : status === 'paid' ? '✓ ຈ່າຍແລ້ວ' : '⏳ ລໍຖ້າ'}</span></div>
                <div class="customer-box"><span class="bold">${selected.customer?.customerName || 'ລູກຄ້າທົ່ວໄປ'}</span></div>
                <div class="divider-dash"></div>
                <table>
                    <thead><tr><th>ລາຍການສິນຄ້າ</th><th class="right">ຈຳ</th><th class="right">ລາຄ完整</th></tr></thead>
                    <tbody>
                        ${selected.items?.map(item => `
                            <tr><td>${item.product?.productName || '-'}</td><td class="center">${item.quantity}</td><td class="right">${Number(item.lineTotal).toLocaleString('lo-LA')}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider-dash"></div>
                <div class="grand-total"><span>ຍອດລວມທັງໝົດ</span><span style="color:#ec4899">${Number(selected.grandTotal).toLocaleString('lo-LA')} ₭</span></div>
                <div class="footer">ຂອບໃຈທີ່ໃຊ້ບໍລິການ! 💕</div>
            </body>
        </html>`

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const printWindow = window.open(url, '_blank')
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print()
                URL.revokeObjectURL(url)
                printWindow.onafterprint = () => printWindow.close()
            }, 800)
        }
    }

    const filteredSales = sales.filter(s =>
        s.billNo?.toLowerCase().includes(search.toLowerCase()) ||
        s.customer?.customerName?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex h-screen bg-white">
            <Toaster />

            {/* Left - Invoice List */}
            <div className="w-72 border-r border-gray-100 flex flex-col p-4 overflow-hidden">
                <h2 className="font-bold text-gray-800 mb-4">{T('invoices', 'Invoices')}</h2>
                <div className="relative mb-4">
                    <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={T('search', 'Search...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <p className="text-center text-gray-400 text-sm py-8">{T('loading', 'Loading...')}</p>
                    ) : filteredSales.map(sale => (
                        <div
                            key={sale.saleId}
                            onClick={() => setSelected(sale)}
                            className={`p-3 rounded-xl cursor-pointer transition border
                                ${selected?.saleId === sale.saleId ? 'border-pink-300 bg-pink-50' : 'border-gray-100 hover:border-pink-200'}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-pink-500">#{sale.billNo}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(getPaymentStatus(sale))}`}>
                                    {getStatusLabel(getPaymentStatus(sale))}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">{sale.customer?.customerName || T('walkInCustomer', 'Walk-in Customer')}</p>
                            <p className="text-sm font-bold text-gray-800 mt-1">{formatCurrency(sale.grandTotal)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Middle - Invoice Detail */}
            {selected ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-2xl mx-auto">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center"><span className="text-white">✿</span></div>
                                    <div>
                                        <p className="font-bold text-gray-800">Anika Beauty Shop</p>
                                        <p className="text-xs text-pink-400">LUXURY EXPERIENCE</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-pink-500">{T('INVOICE', 'ໃບບິນ')}</p>
                                    <p className="text-sm font-medium text-gray-700">#{selected.billNo}</p>
                                </div>
                            </div>

                            {/* Bill To */}
                            <div className="flex justify-between mb-6">
                                <div>
                                    <p className="text-xs text-pink-500 font-medium mb-2">{T('billTo', 'BILL TO')}</p>
                                    <p className="font-bold text-gray-800">{selected.customer?.customerName || T('walkInCustomer', 'Walk-in Customer')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-1">{T('status', 'Status')}</p>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusStyle(getPaymentStatus(selected))}`}>
                                        {getStatusLabel(getPaymentStatus(selected))}
                                    </span>
                                </div>
                            </div>

                            {/* Items Table */}
                            <table className="w-full mb-6">
                                <thead>
                                    <tr className="text-xs text-pink-500 border-b-2 border-pink-100">
                                        <th className="py-3">{T('description', 'ລາຍການ')}</th>
                                        <th className="text-center py-3">{T('qty', 'ຈຳນວນ')}</th>
                                        <th className="text-right py-3">{T('total', 'ລວມ')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selected.items?.map(item => (
                                        <tr key={item.saleItemId} className="border-b border-gray-50">
                                            <td className="py-3 text-sm font-medium text-gray-800">{item.product?.productName}</td>
                                            <td className="py-3 text-center text-sm text-gray-600">{item.quantity}</td>
                                            <td className="py-3 text-right text-sm font-medium text-gray-800">{formatCurrency(item.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm font-bold text-gray-800 border-t pt-2">
                                        <span>{T('total', 'ຍອດລວມ')}</span>
                                        <span className="text-pink-500 text-lg">{formatCurrency(selected.grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-300"><p>{T('selectInvoice', 'ກະລຸນາເລືອກໃບບິນ')}</p></div>
            )}

            {/* Right - Payment Summary */}
            {selected && (
                <div className="w-72 border-l border-gray-100 flex flex-col p-6">
                    <h3 className="font-bold text-gray-800 mb-4">{T('paymentSummary', 'ສະຫຼຸບການຊຳລະ')}</h3>

                    {selected.payments?.map(payment => (
                        <div key={payment.paymentId} className="border border-gray-100 rounded-xl p-4 mb-3">
                            <p className="text-xs text-gray-400 mb-2">{T('paidVia', 'ວິທີຊຳລະ')}</p>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    {payment.method === 'cash' ? '💵' : '📱'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{getMethodLabel(payment.method)}</p>
                                    <p className="text-xs text-gray-400">{formatCurrency(payment.amount)}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(payment.status)}`}>
                                    {getStatusLabel(payment.status)}
                                </span>
                            </div>

                            {/* 🔥 [ຈຸດສຳຄັນ]: ຖ້າສະຖານະເປັນ 'paid' (ເງິນໂອນລໍຖ້າກວດ) ໃຫ້ສະແດງປຸ່ມກົດຢືນຢັນເງິນເຂົ້າ */}
                            {payment.status === 'paid' && (
                                <button
                                    onClick={() => handleVerifyPayment(payment.paymentId)}
                                    className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                                >
                                    ✓ ຢືນຢັນເງິນເຂົ້າ (Verify)
                                </button>
                            )}

                            {payment.verifiedBy && (
                                <div className="mt-3 pt-2 border-t border-gray-50 text-[10px] text-gray-400 space-y-0.5">
                                    <p>👤 ຜູ້ກວດສອບ ID: {payment.verifiedBy}</p>
                                    <p>📅 ວັນວັນທີ: {new Date(payment.verifiedAt).toLocaleString('lo-LA')}</p>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="space-y-2 mt-auto">
                        <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 bg-pink-500 text-white py-2 rounded-lg text-sm hover:bg-pink-600"><Printer size={14} />{T('printInvoice', 'ພິມໃບບິນ')}</button>
                        <button onClick={() => router.push('/sales')} className="w-full border border-pink-200 text-pink-500 py-2 rounded-lg text-sm hover:bg-pink-50">{T('returnToSales', 'ກັບໄປໜ້າຂາຍ')}</button>
                    </div>
                </div>
            )}
        </div>
    )
}