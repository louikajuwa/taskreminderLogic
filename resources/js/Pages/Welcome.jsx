import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth, canLogin, canRegister }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-gray-100 px-6">
                <div className="w-full max-w-2xl text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Task Manager
                    </h1>
                    <p className="mx-auto mt-4 max-w-lg text-lg text-gray-600">
                        Your own private space to plan, track, and finish your work — with
                        priorities, statuses, due dates, reminders, attachments, and a Kanban board.
                    </p>

                    <div className="mt-10 flex items-center justify-center gap-4">
                        {auth?.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                {canLogin && (
                                    <Link
                                        href={route('login')}
                                        className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                                    >
                                        Log in
                                    </Link>
                                )}
                                {canRegister && (
                                    <Link
                                        href={route('register')}
                                        className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-300 transition hover:bg-gray-50"
                                    >
                                        Create an account
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <footer className="mt-16 text-sm text-gray-400">
                    Built with Laravel, Inertia &amp; React.
                </footer>
            </div>
        </>
    );
}
