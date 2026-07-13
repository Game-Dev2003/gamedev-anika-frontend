import { Geist, Geist_Mono, Noto_Sans_Lao } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers" // ✅ เปลี่ยนเป็น ./providers

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

const notoSansLao = Noto_Sans_Lao({
    variable: "--font-noto-lao",
    subsets: ["lao"],
    weight: ["400", "500", "600", "700"],
})

export const metadata = {
    title: "Anika Beauty Shop",
    description: "Point of Sale System",
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} ${notoSansLao.variable}`}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}