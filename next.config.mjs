/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'https://gamedev-anika-backend.onrender.com/api/:path*', // ส่งผ่าน Vercel ไปหา Render
            },
        ];
    },
};

export default nextConfig;