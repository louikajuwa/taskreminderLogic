import BrandMark from '@/Components/BrandMark';
import { CheckIcon } from '@/Components/icons';
import { Link } from '@inertiajs/react';

const FEATURES = [
    'Organize tasks by priority, status & due date',
    'Drag-and-drop Kanban board',
    'Attach files and set reminders',
    'Private & secure — your data, only yours',
];

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Brand panel (desktop) */}
            <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
                <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />

                <Link href="/" className="relative flex items-center gap-3 text-white">
                    <BrandMark className="h-11 w-11" />
                    <span className="text-xl font-semibold tracking-tight">Task Manager</span>
                </Link>

                <div className="relative">
                    <h1 className="max-w-md text-3xl font-bold leading-tight text-white">
                        Plan it. Track it. Finish it.
                    </h1>
                    <p className="mt-3 max-w-md text-indigo-100">
                        Your personal workspace to stay on top of everything that matters.
                    </p>
                    <ul className="mt-8 space-y-3">
                        {FEATURES.map((feature) => (
                            <li key={feature} className="flex items-center gap-3 text-indigo-50">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                                    <CheckIcon className="h-3.5 w-3.5 text-white" />
                                </span>
                                <span className="text-sm">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-sm text-indigo-200">© Task Manager</p>
            </div>

            {/* Form panel */}
            <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
                <div className="w-full max-w-md">
                    {/* Mobile brand */}
                    <Link href="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
                        <BrandMark className="h-10 w-10" />
                        <span className="text-lg font-semibold tracking-tight text-gray-900">Task Manager</span>
                    </Link>

                    <div className="rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/60 ring-1 ring-gray-100">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
