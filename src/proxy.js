// src/proxy.js
import { NextResponse } from 'next/server'

export function proxy(request) {
    const token = request.cookies.get('token')?.value
    const role = request.cookies.get('role')?.value
    const path = request.nextUrl.pathname

    if (path === '/') {
        if (token) {
            return NextResponse.redirect(new URL('/sales', request.url))
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!token && path !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (token && path === '/login') {
        return NextResponse.redirect(new URL('/sales', request.url))
    }

    const adminOnlyPaths = [
        '/dashboard',
        '/products',
        '/suppliers',
        '/purchase-orders',
        '/users',
        '/reports',
        '/categories',
    ]

    if (role === 'CASHIER' &&
        adminOnlyPaths.some(p => path.startsWith(p))) {
        return NextResponse.redirect(new URL('/sales', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}