export default function EmptyState({ icon = '📦', title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">{icon}</span>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            {description && (
                <p className="text-xs text-gray-300 mt-1">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 px-4 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600 transition"
                >
                    {action.label}
                </button>
            )}
        </div>
    )
}