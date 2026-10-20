import { BellIcon } from '@/Components/icons';
import { Link, usePage } from '@inertiajs/react';

/** Bell with a due-reminder count; links to the dashboard reminders section. */
export default function ReminderBell({ className = '', showLabel = false }) {
    const count = usePage().props.reminders?.count ?? 0;
    const label = count > 0 ? `${count} reminder${count === 1 ? '' : 's'} due` : 'No reminders due';

    return (
        <Link
            href={route('dashboard') + '#reminders'}
            aria-label={label}
            className={`relative inline-flex items-center gap-2 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
        >
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {showLabel && <span className="text-base font-medium" aria-hidden="true">Reminders</span>}
            {count > 0 && (
                <span
                    aria-hidden="true"
                    className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold leading-5 text-white ${
                        showLabel ? '' : 'absolute -right-0.5 -top-0.5'
                    }`}
                >
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </Link>
    );
}
