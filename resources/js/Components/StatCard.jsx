import { Link } from '@inertiajs/react';

const ACCENTS = {
    gray: 'text-gray-900',
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
};

export default function StatCard({ label, value, accent = 'gray', href }) {
    const className =
        'block rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100' +
        (href
            ? ' transition hover:ring-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
            : '');
    const body = (
        <>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className={`mt-2 text-3xl font-semibold ${ACCENTS[accent] ?? ACCENTS.gray}`}>{value}</p>
        </>
    );

    return href ? (
        <Link href={href} className={className}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
}
