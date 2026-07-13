export default function ConfirmDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',  // ✅ เพิ่ม prop
    confirmStyle = 'bg-red-500 hover:bg-red-600'
}) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-6">{message}</p>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
                    >
                        {cancelText}  {/* ✅ ใช้ prop แทน hardcode */}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 text-white py-2 rounded-lg text-sm ${confirmStyle}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}