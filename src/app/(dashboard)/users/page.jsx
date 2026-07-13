'use client'

import { useState, useEffect } from 'react'
import axios from 'axios' // 💡 ເພີ່ມ axios ເພື່ອໃຊ້ອັບໂຫຼດຮູບ
import api from '@/lib/api'
import { Search, X, Plus, Shield, User, Edit2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { SkeletonRow, SkeletonCard } from '@/components/Skeleton'
import EmptyState from '@/components/EmptyState'

export default function UsersPage() {
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [users, setUsers] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [editUserId, setEditId] = useState(null)
    
    // 💡 ເພີ່ມຟີວ imageUrl ໄວ້ໃນ State ຂອງຟອມ
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'CASHIER', imageUrl: '' })

    useEffect(() => { 
        setMounted(true)
        fetchUsers() 
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const fetchUsers = async () => {
        try { 
            const res = await api.get('/users')
            setUsers(res.data) 
        } catch { 
            toast.error('Failed to load users') 
        } finally { 
            setLoading(false) 
        }
    }

    // 💡 ຟັງຊັນແປງ Path ຮູບພາບໃຫ້ຊີ້ຫາ URL ຂອງ Server
    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null
        const BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8800'
        return `${BASE}${imageUrl}`
    }

    // 💡 ຟັງຊັນຈັດການການອັບໂຫລດຮູບພາບພະນັກງານ (ຄືກັນກັບໜ້າ Product)
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
            toast.success(T('imageUploaded', 'ອັບໂຫຼດຮູບພາບສຳເລັດ!'))
        } catch {
            toast.error(T('uploadFailed', 'ອັບໂຫຼດຮູບພາບລົ້ມເຫຼວ'))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (isEditMode) {
                // ສົ່ງຂໍ້ມູນໄປອັບເດດ ລວມທັງ imageUrl
                await api.put(`/users/${editUserId}`, {
                    username: form.username,
                    email: form.email,
                    role: form.role,
                    imageUrl: form.imageUrl // 💡 ສົ່ງ Path ຮູບພາບໄປຫຼັງບ້ານ
                })
                toast.success(T('userUpdated', 'ອັບເດດຂໍ້ມູນພະນັກງານສຳເລັດ!'))
            } else {
                // ສ້າງບັນຊີໃໝ່ ພ້ອມຮູບພາບ
                await api.post('/auth/register', form)
                toast.success(T('userCreated', 'ສ້າງບັນຊີພະນັກງານໃໝ່ສຳເລັດ!'))
            }
            closeModal()
            fetchUsers()
        } catch (err) { 
            toast.error(err.response?.data?.message || T('failed', 'Failed')) 
        }
    }

    const handleToggle = async (user) => {
        try {
            await api.put(`/users/${user.id}/toggle`)
            toast.success(user.isActive ? T('userDeactivated', 'Deactivated!') : T('userActivated', 'Activated!'))
            fetchUsers()
        } catch { 
            toast.error(T('failed', 'Failed')) 
        }
    }

    const openEditModal = (user) => {
        setIsEditMode(true)
        setEditId(user.id)
        setForm({
            username: user.username,
            email: user.email,
            password: '••••••••',
            role: user.role,
            imageUrl: user.imageUrl || '' // 💡 ດຶງຮູບເດີມມາສະແດງ
        })
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setIsEditMode(false)
        setEditId(null)
        setForm({ username: '', email: '', password: '', role: 'CASHIER', imageUrl: '' })
    }

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden bg-gray-50/30">
            <Toaster />
            
            <div className="flex items-center justify-between mb-6">
                <div className="text-left">
                    <h1 className="text-lg lg:text-xl font-bold text-gray-800">{T('usersManagement', 'ຈັດການຂໍ້ມູນພະນັກງານ')}</h1>
                    <p className="text-sm text-gray-400 mt-1 hidden lg:block">{T('manageStaff', 'ບໍລິຫານຈັດການບັນຊີ ແລະ ສິດການເຂົ້າໃຊ້ລະບົບພາຍໃນຮ້ານ')}</p>
                </div>
                <button onClick={() => { setIsEditMode(false); setShowModal(true) }} className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition shadow-sm">
                    <Plus size={16} /><span className="hidden lg:inline">{T('addNewUser', 'ເພີ່ມພະນັກງານໃໝ່')}</span>
                </button>
            </div>

            {/* ແຜງສະແດງສະຖິຕິ */}
            {!loading && (
                <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
                    <div className="bg-white border border-gray-100 rounded-xl p-3 lg:p-4 flex items-center gap-2 lg:gap-3 shadow-sm text-left">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0"><Shield size={16} className="text-pink-500" /></div>
                        <div><p className="text-[10px] lg:text-xs text-gray-400 font-bold">{T('totalUsers', 'ພະນັກງານທັງໝົດ')}</p><p className="text-lg lg:text-xl font-black text-gray-800">{users.length}</p></div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 lg:p-4 flex items-center gap-2 lg:gap-3 shadow-sm text-left">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0"><User size={16} className="text-purple-500" /></div>
                        <div><p className="text-[10px] lg:text-xs text-gray-400 font-bold">{T('admins', 'ຜູ້ດູແລລະບົບ (ADMIN)')}</p><p className="text-lg lg:text-xl font-black text-gray-800">{users.filter(u => u.role === 'ADMIN').length}</p></div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 lg:p-4 flex items-center gap-2 lg:gap-3 shadow-sm text-left">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><User size={16} className="text-blue-500" /></div>
                        <div><p className="text-[10px] lg:text-xs text-gray-400 font-bold">{T('cashiers', 'ພະນັກງານຂາຍ (CASHIER)')}</p><p className="text-lg lg:text-xl font-black text-gray-800">{users.filter(u => u.role === 'CASHIER').length}</p></div>
                    </div>
                </div>
            )}

            <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input type="text" placeholder={T('searchUsers', 'ຄົ້ນຫາດ້ວຍຊື່ພະນັກງານ ຫຼື ອີເມວ...')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition bg-white" />
            </div>

            {/* ຕາຕະລາງພະນັກງານ */}
            <div className="flex-1 overflow-auto bg-white rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full min-w-[550px]">
                    <thead>
                        <tr className="text-xs text-pink-500 border-b border-gray-100 font-bold bg-gray-50/50">
                            <th className="text-left py-3 px-3">{T('user', 'ຊື່ພະນັກງານ')}</th>
                            <th className="text-left py-3 px-2 hidden lg:table-cell">{T('email', 'ອີເມວ')}</th>
                            <th className="text-left py-3 px-2">{T('role', 'ສິດລະບົບ (ROLE)')}</th>
                            <th className="text-left py-3 px-2">{T('status', 'ສະຖານະ')}</th>
                            <th className="text-left py-3 px-2 hidden lg:table-cell">{T('createdAt', 'ວันທີສ້າງບັນຊີ')}</th>
                            <th className="text-left py-3 px-3">{T('actions', 'ຈັດການ')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-left">
                        {loading ? (
                            <><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /></>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={6}><EmptyState icon={search ? '🔍' : '👤'} title="ບໍ່ພົບຂໍ້ມູນພະນັກງານ" description="ລອງຄົ້ນຫາດ້ວຍຄຳສັບອື່ນ" /></td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="border-b border-gray-50 hover:bg-pink-50/40 transition">
                                <td className="py-3 px-3">
                                    <div className="flex items-center gap-2 lg:gap-3">
                                        {/* 💡 ສະແດງຮູບພະນັກງານຕົວຈິງ ຫາກບໍ່ມີໃຫ້ສະແດງອັກສອນຍໍ້ເດີມ */}
                                        <div className="w-8 h-8 bg-pink-100 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-pink-500 flex-shrink-0">
                                            {user.imageUrl ? (
                                                <img src={getImageUrl(user.imageUrl)} alt={user.username} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                                            ) : (
                                                user.username?.slice(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-gray-800 truncate">{user.username}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-2 text-sm text-gray-500 hidden lg:table-cell">{user.email}</td>
                                <td className="py-3 px-2">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600 border border-purple-200' : 'bg-blue-100 text-blue-500 border border-blue-200'}`}>{user.role}</span>
                                </td>
                                <td className="py-3 px-2">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${user.isActive ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-500 border border-red-200'}`}>{user.isActive ? 'ເປີດໃຊ້ງານ' : 'ປິດໃຊ້ງານ'}</span>
                                </td>
                                <td className="py-3 px-2 text-sm text-gray-400 hidden lg:table-cell">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('lo-LA') : '-'}</td>
                                <td className="py-3 px-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(user)} className="text-xs px-2 lg:px-2.5 py-1 rounded-lg border border-blue-200 text-blue-400 hover:bg-blue-50 transition flex items-center gap-1">
                                            <Edit2 size={12} /> <span className="hidden lg:inline">ແກ້ໄຂ</span>
                                        </button>
                                        <button onClick={() => handleToggle(user)} className={`text-xs px-2 lg:px-2.5 py-1 rounded-lg border font-medium transition whitespace-nowrap ${user.isActive ? 'border-red-200 text-red-400 hover:bg-red-50' : 'border-green-200 text-green-500 hover:bg-green-50'}`}>
                                            {user.isActive ? 'ປິດບັນຊີ' : 'ເປີດບັນຊີ'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal ຟອມ */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-left max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-base">{isEditMode ? 'ແກ້ໄຂຂໍ້ມູນພະນັກງານ' : 'ເພີ່ມບັນຊີພະນັກງານໃໝ່'}</h3>
                            <button onClick={closeModal}><X size={18} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            {/* 💡 ສ່ວນອັບໂຫລດຮູບພາບພະນັກງານ */}
                            <div>
                                <label className="text-sm text-gray-600 mb-1 block font-medium">ຮູບພາບພະນັກງານ</label>
                                {form.imageUrl && (
                                    <div className="mb-2 relative w-20 h-20 mx-auto">
                                        <img src={getImageUrl(form.imageUrl)} alt="preview" className="w-full h-full object-cover rounded-full border border-gray-200" onError={(e) => { e.target.style.display = 'none' }} />
                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                                    </div>
                                )}
                                <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-3 cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition">
                                    <span className="text-sm text-gray-500">{form.imageUrl ? 'ປ່ຽນຮູບພາບ' : '📷 ອັບໂຫຼດຮູບພະນັກງານ'}</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                            </div>

                            <div>
                                <label className="text-sm text-gray-600 mb-1 block font-medium">ຊື່ຜູ້ໃຊ້ (Username)</label>
                                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white" required placeholder="ຕົວຢ່າງ: anika_staff" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 mb-1 block font-medium">ອີເມວ (Email)</label>
                                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required placeholder="example@gmail.com" />
                            </div>
                            
                            {!isEditMode && (
                                <div>
                                    <label className="text-sm text-gray-600 mb-1 block font-medium">ระຫັດຜ່ານ (Password)</label>
                                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" required placeholder="••••••••" />
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-gray-600 mb-1 block font-medium">ກຳນົດສິດລະບົບ (Role)</label>
                                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white">
                                    <option value="CASHIER">CASHIER (ພະນັກງານາຍໜ້າຮ້ານ)</option>
                                    <option value="ADMIN">ADMIN (ຜູ້ດູແລລະບົບຫຼັງບ້ານ)</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button type="button" onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">{T('cancel', 'ຍົກເລີກ')}</button>
                                <button type="submit" className="flex-1 bg-pink-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-pink-600 transition shadow-sm">
                                    {isEditMode ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກສ້າງ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}