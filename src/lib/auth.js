// ตรวจสอบ token หมดอายุ
export const isAuthenticated = () => {
    if (typeof window === 'undefined') return false
    const token = localStorage.getItem('token')
    return !!token
}

export const getRole = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('role') || ''
}

export const getUsername = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('username') || ''
}

export const logout = (router) => {
    localStorage.clear()
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/login')
}