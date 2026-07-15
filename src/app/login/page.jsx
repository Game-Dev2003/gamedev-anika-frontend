'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Eye, EyeOff, Lock } from 'lucide-react'
import Cookies from 'js-cookie'
import '@/lib/i18n'
import { useTranslation } from 'react-i18next'
import LanguageToggle from '@/components/LanguageToggle'

export default function LoginPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [mounted, setMounted] = useState(false)
    const [form, setForm] = useState({
        usernameOrEmail: '',
        password: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        setMounted(true)
    }, [])

    const T = (key, fallback) => mounted ? t(key) : fallback

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/auth/login', {
                usernameOrEmail: form.usernameOrEmail,
                password: form.password
            })
            
            // 🚀 [ຈຸດທີ່ປັບປຸງ]: ບັນທຶກທັງ Token, Username, Role ແລະ ID ຂອງພະນັກງານຕົວຈິງ
            localStorage.setItem('token', res.data.token)
            localStorage.setItem('userId', res.data.id || res.data.userId || 1) // 🔥 ເກັບ ID ເຂົ້າລະບົບເພື່ອໄປຜູກກັບ verifiedBy
            localStorage.setItem('username', res.data.username)
            localStorage.setItem('role', res.data.role)
            
            Cookies.set('token', res.data.token, { expires: 1 })
            Cookies.set('role', res.data.role, { expires: 1 })
            router.push('/dashboard')
        } catch (err) {
            setError(T('incorrectCredentials',
                'Incorrect Employee ID or Password. Please try again.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✿</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">
                        Anika Beauty Shop
                    </span>
                </div>

                {/* Language Toggle + Support */}
                <div className="flex items-center gap-2">
                    <LanguageToggle />
                    <button className="text-sm text-pink-500 border border-pink-200 px-3 py-1 rounded-md hover:bg-pink-50">
                        {T('support', 'Help')}
                    </button>
                </div>
            </div>

            {/* Login Form */}
            <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 bg-pink-500 rounded-full flex items-center justify-center mb-4">
                            <span className="text-white text-2xl">✿</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">
                            Anika Beauty Shop
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">
                            Point of Sale System
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                {T('username', 'Username or Email')}
                            </label>
                            <input
                                type="text"
                                placeholder={T('username', 'Enter your username or email')}
                                value={form.usernameOrEmail}
                                onChange={(e) => setForm({
                                    ...form, usernameOrEmail: e.target.value
                                })}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                {T('password', 'PIN/Password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({
                                        ...form, password: e.target.value
                                    })}
                                    className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 pr-10
                                        ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {error && (
                                <p className="text-red-500 text-xs mt-1.5">{error}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-50 text-sm mt-2"
                        >
                            {loading
                                ? T('signingIn', 'Signing in...')
                                : T('signIn', 'Sign In')
                            }
                        </button>
                    </form>

                    {/* Secure Note */}
                    <div className="flex items-center justify-center gap-1 mt-5">
                        <Lock size={11} className="text-gray-400" />
                        <p className="text-xs text-gray-400">
                            {T('secureAccess', 'Secure POS terminal access only')}
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex items-center justify-center gap-3 mt-3">
                        <button className="text-xs text-pink-500 hover:underline">
                            {T('forgotPassword', 'Forgot Password?')}
                        </button>
                        <span className="text-gray-300 text-xs">|</span>
                        <button className="text-xs text-pink-500 hover:underline">
                            {T('support', 'Support')}
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-300 mt-6">
                        © 2024 Anika Beauty Shop. All rights reserved.
                        Terminal ID: ABS-POS-042
                    </p>
                </div>
            </div>
        </div>
    )
}