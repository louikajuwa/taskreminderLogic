const PRIORITY_STYLES = {
    low: { label: 'Low', className: 'bg-gray-100 text-gray-600 ring-gray-500/30', dot: 'bg-gray-400' },
    medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 ring-amber-600/30', dot: 'bg-amber-500' },
    high: { label: 'High', className: 'bg-red-100 text-red-700 ring-red-600/30', dot: 'bg-red-500' },
};

export default function PriorityBadge({ priority }) {
    const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium;

    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
        >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {style.label}
        </span>
    );
}
