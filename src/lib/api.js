import axios from 'axios'

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8800/api',
})

// ✅ แนบ Token ทุก request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    console.log("TOKEN =", token);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// ✅ Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 ||
            error.response?.status === 403) {
            localStorage.clear()
            document.cookie =
                'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            document.cookie =
                'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// ==========================================
// 📥 รวมฟังก์ชันดักยิงข้อมูลสำหรับหน้าจอ Import (ลอจิกผูกกับ PO)
// ==========================================
export const importService = {
    // 1. ดึงข้อมูลใบสั่งซื้อทั้งหมดที่มีสถานะเป็น "PENDING" (รอรับของ)
    getPendingOrders: async () => {
        const res = await api.get('/purchase-orders')
        // กรองเอาเฉพาะใบที่สถานะยังไม่เสร็จสิ้น เพื่อไม่ให้นำเข้าซ้ำซ้อน
        return res.data.filter(order => order.status === 'PENDING' || !order.status)
    },

    // 2. ดึงรายการสินค้าทั้งหมดข้างในใบสั่งซื้อตาม poId
    getPoItems: async (poId) => {
        const res = await api.get(`/purchase-orders/${poId}/items`)
        return res.data
    },

    // 3. บันทึกข้อมูลการนำเข้าสินค้า (เพิ่มสต็อกสินค้า พร้อมเปลี่ยนสถานะใบ PO)
    createImportFromPo: async (importPayload) => {
        const res = await api.post('/imports', importPayload)
        return res.data
    }
}

export default api