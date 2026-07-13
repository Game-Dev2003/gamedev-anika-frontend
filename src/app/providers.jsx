'use client'

import { useEffect } from 'react'
import i18n from '@/lib/i18n' // ✅ import ใน client component

export function Providers({ children }) {
    useEffect(() => {
        const savedLang = localStorage.getItem('language') || 'en'
        i18n.changeLanguage(savedLang)
    }, [])

    return <>{children}</>
}