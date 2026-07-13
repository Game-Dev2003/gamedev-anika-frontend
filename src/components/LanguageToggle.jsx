'use client'

import { useState, useEffect } from 'react'
import i18n from '@/lib/i18n'

export default function LanguageToggle() {
    const [lang, setLang] = useState('en')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const savedLang = localStorage.getItem('language') || 'en'
        setLang(savedLang)
        i18n.changeLanguage(savedLang)
    }, [])

    if (!mounted) return null

    const toggleLang = () => {
        const newLang = lang === 'en' ? 'lo' : 'en'
        i18n.changeLanguage(newLang) // ✅ เปลี่ยนภาษาตรงๆ
        localStorage.setItem('language', newLang)
        setLang(newLang)
        // ✅ ไม่ต้อง reload แล้ว
    }

    return (
        <button
            onClick={toggleLang}
            className="w-full flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
        >
            <span className="text-base">
                {lang === 'en' ? '🇱🇦' : '🇬🇧'}
            </span>
            <span>
                {lang === 'en' ? 'ພາສາລາວ' : 'English'}
            </span>
        </button>
    )
}