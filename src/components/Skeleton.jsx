export function SkeletonRow({ cols = 5 }) {
    return (
        <tr className="border-b border-gray-50">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="py-3 px-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </td>
            ))}
        </tr>
    )
}

export function SkeletonCard() {
    return (
        <div className="border border-gray-100 rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-5 bg-gray-100 rounded w-1/3" />
                </div>
            </div>
        </div>
    )
}

export function SkeletonProductCard() {
    return (
        <div className="bg-white border border-gray-100 rounded-xl p-3 animate-pulse">
            <div className="w-full h-28 bg-gray-100 rounded-lg mb-3" />
            <div className="h-3 bg-gray-100 rounded mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
        </div>
    )
}

export function SkeletonText({ width = 'w-full', height = 'h-4' }) {
    return (
        <div className={`${height} ${width} bg-gray-100 rounded animate-pulse`} />
    )
}