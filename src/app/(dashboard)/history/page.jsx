'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Search, X, Printer, RefreshCw, Calendar } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useTranslation } from 'react-i18next'
import { SkeletonRow, SkeletonCard } from '@/components/Skeleton'

export default function HistoryPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [sales, setSales] = useState([])
    const [selected, setSelected] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)

    const totalSales = sales.reduce((sum, s) => sum + Number(s.grandTotal), 0)
    const totalOrders = sales.length
    const totalRefunds = sales.filter(s => s.payments?.some(p => p.status === 'refunded')).length

    useEffect(() => {
        setMounted(true)
        fetchSales()
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchSales = async () => {
        try {
            const res = await api.get('/sales')
            const sorted = res.data.sort((a, b) => new Date(b.saleDatetime) - new Date(a.saleDatetime))
            setSales(sorted)
        } catch (err) {
            toast.error('Failed to load sales')
        } finally {
            setLoading(false)
        }
    }

    const handleRefund = async (saleId) => {
        try {
            await api.post(`/sales/${saleId}/refund`)
            toast.success(T('refundIssued', 'Refund issued!'))
            fetchSales()
            setSelected(null)
        } catch (err) {
            toast.error(err.response?.data?.message || T('refundFailed', 'Refund failed'))
        }
    }

    const handlePrint = () => {
        const status = getStatus(selected)
        const statusColor = status === 'paid' || status === 'verified'
            ? '#16a34a'
            : status === 'refunded'
                ? '#ef4444'
                : '#6b7280'

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
                    width: 76mm;
                    margin: 0 auto;
                    font-family: 'Noto Sans Lao', 'Courier New', monospace;
                    font-size: 11px;
                    color: #000;
                    padding: 6px 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .shop-name, .shop-sub, .shop-address,
                .divider-solid, .divider-dash,
                .bill-no, .info-row, .customer-box,
                table, .total-section, .payment-section,
                .footer, .footer-brand { width: 100%; }
                .center { text-align: center; }
                .right { text-align: right; }
                .bold { font-weight: bold; }
                .shop-name {
                    text-align: center;
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 2px;
                    letter-spacing: 1px;
                }
                .shop-sub {
                    text-align: center;
                    font-size: 10px;
                    color: #ec4899;
                    letter-spacing: 2px;
                    margin-bottom: 2px;
                }
                .shop-address { text-align: center; font-size: 10px; color: #555; }
                .divider-solid { border-top: 1.5px solid #000; margin: 5px 0; }
                .divider-dash { border-top: 1px dashed #aaa; margin: 5px 0; }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    margin: 2px 0;
                }
                .label { color: #666; }
                .status-badge {
                    display: inline-block;
                    padding: 1px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: bold;
                    color: ${statusColor};
                    border: 1px solid ${statusColor};
                }
                .customer-box {
                    background: #f9f9f9;
                    border: 1px dashed #ddd;
                    padding: 4px 6px;
                    border-radius: 3px;
                    margin: 4px 0;
                    font-size: 10px;
                    width: 100%;
                }
                table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 4px 0; }
                th {
                    text-align: left;
                    font-size: 9px;
                    padding: 3px 0;
                    border-bottom: 1px solid #000;
                    text-transform: uppercase;
                    color: #444;
                }
                th.right { text-align: right; }
                td { padding: 3px 0; vertical-align: top; font-size: 10px; }
                td.right { text-align: right; }
                td.center { text-align: center; }
                .product-name { font-weight: bold; font-size: 10px; }
                .total-section { margin-top: 4px; width: 100%; }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    padding: 1.5px 0;
                    color: #555;
                }
                .grand-total {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 15px;
                    padding: 4px 0;
                    border-top: 1.5px solid #000;
                    border-bottom: 1.5px solid #000;
                    margin: 3px 0;
                }
                .grand-amount { color: #ec4899; }
                .payment-section { margin: 4px 0; font-size: 10px; width: 100%; }
                .payment-row { display: flex; justify-content: space-between; padding: 1.5px 0; }
                .payment-method { font-weight: bold; color: #333; }
                .change-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    font-weight: bold;
                    color: #16a34a;
                    padding: 2px 0;
                }
                .footer {
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                    margin-top: 6px;
                    padding-top: 5px;
                    border-top: 1px dashed #aaa;
                    line-height: 1.8;
                    width: 100%;
                }
                .footer-brand {
                    text-align: center;
                    font-size: 12px;
                    font-weight: bold;
                    color: #ec4899;
                    margin-top: 3px;
                    letter-spacing: 1px;
                }
                .bill-no {
                    text-align: center;
                    font-size: 11px;
                    font-weight: bold;
                    margin: 3px 0;
                    letter-spacing: 1px;
                }
            </style>
        </head>
        <body>
            <div class="shop-name">✿ Anika Beauty ✿</div>
            <div class="shop-sub">LUXURY EXPERIENCE</div>
            <div class="shop-address">ວຽງຈັນ, ສປປ ລາວ</div>
            <div class="shop-address">Tel: 020-XXXX-XXXX</div>
            <div class="divider-solid"></div>
            <div class="bill-no">ໃບບິນ / RECEIPT #${selected.billNo}</div>
            <div class="divider-dash"></div>
            <div class="info-row">
                <span class="label">📅 ວັນທີ:</span>
                <span class="bold">${new Date(selected.saleDatetime).toLocaleString('lo-LA', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })}</span>
            </div>
            <div class="info-row">
                <span class="label">👤 ພະນັກງານ:</span>
                <span>${selected.user?.username || 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="label">📋 ສະຖານະ:</span>
                <span class="status-badge">${
                    status === 'verified' ? '✓ ຊຳລະແລ້ວ' :
                    status === 'paid' ? '✓ ຈ່າຍແລ້ວ' :
                    status === 'refunded' ? '↩ ຄືນເງິນ' :
                    '⏳ ລໍຖ້າ'
                }</span>
            </div>
            <div class="customer-box">
                <span class="label">👥 ລູກຄ້າ: </span>
                <span class="bold">${selected.customer?.customerName || 'ລູກຄ້າທົ່ວໄປ'}</span>
                ${selected.customer?.phone
                    ? `<br/><span class="label">📞 ເບີ: </span>${selected.customer.phone}`
                    : ''}
            </div>
            <div class="divider-dash"></div>
            <table>
                <thead>
                    <tr>
                        <th style="width:45%">ລາຍການສິນຄ້າ</th>
                        <th class="right" style="width:15%">ຈຳ</th>
                        <th class="right" style="width:20%">ລາຄາ</th>
                        <th class="right" style="width:20%">ລວມ</th>
                    </tr>
                </thead>
                <tbody>
                    ${selected.items?.map((item, i) => `
                        <tr style="${i % 2 === 0 ? '' : 'background:#fafafa'}">
                            <td><div class="product-name">${item.product?.productName || '-'}</div></td>
                            <td class="center">${item.quantity}</td>
                            <td class="right">${Number(item.unitPrice).toLocaleString('lo-LA')}</td>
                            <td class="right bold">${Number(item.lineTotal).toLocaleString('lo-LA')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="divider-dash"></div>
            <div class="total-section">
                <div class="total-row">
                    <span>ລວມຍ່ອຍ (Subtotal)</span>
                    <span>${Number(selected.grandTotal).toLocaleString('lo-LA')} ₭</span>
                </div>
                <div class="grand-total">
                    <span>ຍອດລວມທັງໝົດ</span>
                    <span class="grand-amount">${Number(selected.grandTotal).toLocaleString('lo-LA')} ₭</span>
                </div>
            </div>
            <div class="payment-section">
                <div style="font-size:9px; color:#888; margin-bottom:3px; text-transform:uppercase;">
                    ການຊຳລະເງິນ / Payment
                </div>
                ${cashPayment ? `
                <div class="payment-row">
                    <span>💵 ເງິນສົດ (Cash)</span>
                    <span class="payment-method">${Number(cashPayment.amount).toLocaleString('lo-LA')} ₭</span>
                </div>` : ''}
                ${transferPayment ? `
                <div class="payment-row">
                    <span>📱 ເງິນໂອນ (Transfer)</span>
                    <span class="payment-method">${Number(transferPayment.amount).toLocaleString('lo-LA')} ₭</span>
                </div>` : ''}
                ${!cashPayment && !transferPayment && selected.payments?.[0] ? `
                <div class="payment-row">
                    <span>💳 ${selected.payments[0].method?.toUpperCase()}</span>
                    <span class="payment-method">${Number(selected.payments[0].amount).toLocaleString('lo-LA')} ₭</span>
                </div>` : ''}
                ${cashPayment && Number(cashPayment.amount) > Number(selected.grandTotal) ? `
                <div class="change-row">
                    <span>💵 ເງິນທອນ (Change)</span>
                    <span>${(Number(cashPayment.amount) - Number(selected.grandTotal)).toLocaleString('lo-LA')} ₭</span>
                </div>` : ''}
            </div>
            <div class="divider-dash"></div>
            <div class="footer">
                ຂອບໃຈທີ່ໃຊ້ບໍລິການ! 💕<br/>
                Thank you for shopping with us!<br/>
                ກະລຸນາມາອີກ / Please come again
            </div>
            <div class="footer-brand">✿ Anika Beauty ✿</div>
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

    // ✅ [ແກ້ໄຂ]: ເບິ່ງທຸກ payment ບໍ່ແມ່ນແຕ່ແຖວທຳອິດ
    // ລຳດັບຄວາມສຳຄັນ: refunded > paid (ລໍຖ້າກວດ) > verified
    const getStatus = (sale) => {
        if (!sale.payments || sale.payments.length === 0) return 'pending'
        // ຖ້າມີແຖວໃດແຖວໜຶ່ງເປັນ refunded → ບິນນີ້ຄືນເງິນແລ້ວ
        if (sale.payments.some(p => p.status === 'refunded')) return 'refunded'
        // ຖ້າມີແຖວໃດຍັງລໍຖ້າກວດສອບ (paid) → ບິນຍັງບໍ່ສົມບູນ
        if (sale.payments.some(p => p.status === 'paid')) return 'paid'
        return 'verified'
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'paid': case 'verified': return 'bg-green-100 text-green-600'
            case 'refunded': return 'bg-red-100 text-red-500'
            default: return 'bg-gray-100 text-gray-500'
        }
    }

    const filteredSales = sales.filter(s => {
        const matchSearch =
            s.billNo?.toLowerCase().includes(search.toLowerCase()) ||
            s.customer?.customerName?.toLowerCase().includes(search.toLowerCase()) ||
            new Date(s.saleDatetime).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toLowerCase().includes(search.toLowerCase())
        const saleDate = new Date(s.saleDatetime)
        const matchStart = startDate ? saleDate >= new Date(startDate.setHours(0, 0, 0, 0)) : true
        const matchEnd = endDate ? saleDate <= new Date(endDate.setHours(23, 59, 59, 999)) : true
        return matchSearch && matchStart && matchEnd
    })

    return (
        <div className="flex h-screen bg-white">
            <Toaster />
            <div className="flex-1 flex flex-col p-6 overflow-hidden">

                {/* Stats */}
                {loading ? (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="border border-gray-100 rounded-xl p-4">
                            <p className="text-xs text-gray-400">{T('totalSales', 'TOTAL SALES')}</p>
                            <p className="text-xl font-bold text-gray-800 mt-1">{totalSales.toLocaleString('lo-LA')} ₭</p>
                        </div>
                        <div className="border border-gray-100 rounded-xl p-4">
                            <p className="text-xs text-gray-400">{T('totalOrders', 'TOTAL ORDERS')}</p>
                            <p className="text-xl font-bold text-gray-800 mt-1">{totalOrders}</p>
                        </div>
                        <div className="border border-gray-100 rounded-xl p-4">
                            <p className="text-xs text-gray-400">{T('totalRefunds', 'TOTAL REFUNDS')}</p>
                            <p className="text-xl font-bold text-gray-800 mt-1">{totalRefunds}</p>
                        </div>
                    </div>
                )}

                {/* Search + Date Filter */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input type="text" placeholder={T('searchHistory', 'Search by Order ID, Customer, Date...')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300" />
                    </div>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                        <Calendar size={14} className="text-gray-400" />
                        <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} selectsStart startDate={startDate} endDate={endDate} placeholderText={T('startDate', 'Start date')} className="text-sm text-gray-600 outline-none w-24 cursor-pointer" dateFormat="dd MMM yyyy" />
                    </div>
                    <span className="text-gray-400 text-sm">→</span>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                        <Calendar size={14} className="text-gray-400" />
                        <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText={T('endDate', 'End date')} className="text-sm text-gray-600 outline-none w-24 cursor-pointer" dateFormat="dd MMM yyyy" />
                    </div>
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(null); setEndDate(null) }} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50">
                            <X size={12} />{T('clear', 'Clear')}
                        </button>
                    )}
                    <button onClick={fetchSales} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                        <RefreshCw size={14} />{T('refresh', 'Refresh')}
                    </button>
                </div>

                {(startDate || endDate) && (
                    <div className="mb-3 text-xs text-pink-500 bg-pink-50 px-3 py-2 rounded-lg">
                        {T('showing', 'Showing')}: {startDate ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : T('any', 'Any')} → {endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : T('any', 'Any')} ({filteredSales.length} {T('results', 'results')})
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-xs text-gray-400 border-b border-gray-100">
                                <th className="text-left py-3 px-2">{T('orderID', 'ORDER ID')}</th>
                                <th className="text-left py-3 px-2">{T('dateTime', 'DATE/TIME')}</th>
                                <th className="text-left py-3 px-2">{T('customer', 'CUSTOMER')}</th>
                                <th className="text-left py-3 px-2">{T('total', 'TOTAL')}</th>
                                <th className="text-left py-3 px-2">{T('status', 'STATUS')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <>
                                    <SkeletonRow cols={5} />
                                    <SkeletonRow cols={5} />
                                    <SkeletonRow cols={5} />
                                    <SkeletonRow cols={5} />
                                    <SkeletonRow cols={5} />
                                    <SkeletonRow cols={5} />
                                </>
                            ) : filteredSales.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-400">{T('noResults', 'No results found')}</td></tr>
                            ) : filteredSales.map(sale => (
                                <tr key={sale.saleId} onClick={() => setSelected(sale)} className={`border-b border-gray-50 cursor-pointer hover:bg-pink-50 transition ${selected?.saleId === sale.saleId ? 'bg-pink-50' : ''}`}>
                                    <td className="py-3 px-2 text-sm font-medium text-pink-500">#{sale.billNo}</td>
                                    <td className="py-3 px-2 text-sm text-gray-500">{new Date(sale.saleDatetime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="py-3 px-2 text-sm text-gray-700">{sale.customer?.customerName || T('walkInCustomer', 'Walk-in Customer')}</td>
                                    <td className="py-3 px-2 text-sm font-medium text-pink-500">{Number(sale.grandTotal).toLocaleString('lo-LA')} ₭</td>
                                    <td className="py-3 px-2">
                                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusStyle(getStatus(sale))}`}>{getStatus(sale)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right - Transaction Detail */}
            {selected && (
                <div className="w-80 border-l border-gray-100 flex flex-col p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-gray-800">{T('transactionDetails', 'Transaction Details')}</h3>
                            <p className="text-xs text-gray-400">Receipt for #{selected.billNo}</p>
                        </div>
                        <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 flex-1 overflow-y-auto">
                        <div className="text-center mb-4">
                            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white text-sm">✿</span>
                            </div>
                            <p className="font-bold text-sm">ANIKA BEAUTY SHOP</p>
                            <p className="text-xs text-gray-400">123 Elegance Blvd, Suite 100</p>
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="flex text-xs text-gray-400 pb-1 border-b border-gray-100">
                                <span className="flex-1">ITEM</span>
                                <span className="w-16 text-right">PRICE</span>
                            </div>
                            {selected.items?.map(item => (
                                <div key={item.saleItemId} className="flex items-start">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-700">{item.product?.productName}</p>
                                        <p className="text-xs text-gray-400">{T('qty', 'Qty')}: {item.quantity}</p>
                                    </div>
                                    <span className="text-sm font-medium w-16 text-right">{Number(item.lineTotal).toLocaleString('lo-LA')} ₭</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-3 space-y-1">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{T('subtotal', 'Subtotal')}</span>
                                <span>{Number(selected.grandTotal).toLocaleString('lo-LA')} ₭</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold">
                                <span>{T('total', 'TOTAL')}</span>
                                <span className="text-pink-500">{Number(selected.grandTotal).toLocaleString('lo-LA')} ₭</span>
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-4">{T('thankYou', 'Thank you for shopping with us!')}</p>
                    </div>
                    <div className="mt-4 space-y-2">
                        <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 border border-pink-200 text-pink-500 py-2 rounded-lg text-sm hover:bg-pink-50">
                            <Printer size={14} />{T('printReceipt', 'Print Receipt')}
                        </button>
                        {/* ✅ [ແກ້ໄຂ]: ສະແດງປຸ່ມຄືນເງິນທັງບິນທີ່ paid ແລະ verified */}
                        {(getStatus(selected) === 'paid' || getStatus(selected) === 'verified') && (
                            <button onClick={() => handleRefund(selected.saleId)} className="w-full border border-red-200 text-red-500 py-2 rounded-lg text-sm hover:bg-red-50">
                                ↩ {T('issueRefund', 'Issue Refund')}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}