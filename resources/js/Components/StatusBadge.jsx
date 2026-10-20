const STATUS_STYLES = {
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700 ring-gray-500/30', dot: 'bg-gray-400' },
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 ring-blue-600/30', dot: 'bg-blue-500' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 ring-green-600/30', dot: 'bg-green-500' },
};

export default function StatusBadge({ status }) {
    const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
        >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {style.label}
        </span>
    );
}
