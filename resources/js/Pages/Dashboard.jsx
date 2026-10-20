import PriorityBadge from '@/Components/PriorityBadge';
import SecondaryButton from '@/Components/SecondaryButton';
import StatCard from '@/Components/StatCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/dates';
import { toastInfo } from '@/lib/swal';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function TaskRow({ task, danger = false }) {
    return (
        <li className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900" title={task.title}>{task.title}</p>
                <p className={`text-xs ${danger ? 'text-red-600' : 'text-gray-500'}`}>
                    Due {formatDateTime(task.due_date)}
                </p>
            </div>
            <PriorityBadge priority={task.priority} />
        </li>
    );
}

function RemindersPanel({ reminders }) {
    const [pending, setPending] = useState(() => new Set());
    const items = reminders?.items ?? [];
    if (!reminders || items.length === 0) return null;

    const dismiss = (id) => {
        const track = (on) =>
            setPending((prev) => {
                const next = new Set(prev);
                if (on) next.add(id);
                else next.delete(id);
                return next;
            });
        router.patch(route('tasks.reminder.dismiss', id), {}, {
            preserveScroll: true,
            onStart: () => track(true),
            onFinish: () => track(false),
        });
    };

    return (
        <section id="reminders" aria-labelledby="reminders-heading" className="scroll-mt-4 rounded-lg bg-amber-50 p-6 ring-1 ring-amber-200">
            <h2 id="reminders-heading" className="flex items-center gap-2 text-base font-semibold text-amber-900">
                <span aria-hidden="true">🔔</span>
                Reminders
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
                    {reminders.count ?? items.length}
                </span>
            </h2>
            <ul className="mt-2 divide-y divide-amber-200">
                {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900" title={item.title}>{item.title}</p>
                            <p className="text-xs text-amber-800">
                                Reminder {formatDateTime(item.reminder_at)}
                                {item.due_date && ` · Due ${formatDateTime(item.due_date)}`}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <PriorityBadge priority={item.priority} />
                            <SecondaryButton
                                onClick={() => dismiss(item.id)}
                                processing={pending.has(item.id)}
                                aria-label={`Dismiss reminder: ${item.title}`}
                                className="!px-3 !py-1 text-xs"
                            >
                                Dismiss
                            </SecondaryButton>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function Dashboard({ stats, overdueTasks = [], upcomingTasks = [] }) {
    const { reminders } = usePage().props;

    // In-app reminder: nudge the user about overdue tasks when the dashboard loads.
    // Shown once per browser session so navigating back to the dashboard doesn't re-nag.
    useEffect(() => {
        if (stats.overdue > 0) {
            try {
                if (window.sessionStorage.getItem('overdueToastShown')) return;
                window.sessionStorage.setItem('overdueToastShown', '1');
            } catch {
                // Storage unavailable: fall through and show the toast.
            }
            toastInfo(`You have ${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''}.`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-gray-800">Dashboard</h1>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <RemindersPanel reminders={reminders} />

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard label="Total tasks" value={stats.total} href={route('tasks.index')} />
                        <StatCard label="Completed" value={stats.completed} accent="green" href={route('tasks.index', { status: 'completed' })} />
                        <StatCard label="Pending" value={stats.pending} accent="blue" href={route('tasks.index', { status: 'pending' })} />
                        <StatCard label="Overdue" value={stats.overdue} accent="red" href={route('tasks.index', { overdue: 1 })} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-semibold text-gray-900">Overdue</h2>
                                <Link
                                    href={route('tasks.index', { overdue: 1, sort: 'due_date', direction: 'asc' })}
                                    className="rounded text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                >
                                    View all
                                </Link>
                            </div>
                            {overdueTasks.length > 0 ? (
                                <ul className="mt-2 divide-y divide-gray-100">
                                    {overdueTasks.map((task) => (
                                        <TaskRow key={task.id} task={task} danger />
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-4 text-sm text-gray-500">Nothing overdue. <span aria-hidden="true">🎉</span></p>
                            )}
                        </div>

                        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-semibold text-gray-900">Upcoming</h2>
                                <Link
                                    href={route('tasks.index', { sort: 'due_date', direction: 'asc' })}
                                    className="rounded text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                >
                                    View all
                                </Link>
                            </div>
                            {upcomingTasks.length > 0 ? (
                                <ul className="mt-2 divide-y divide-gray-100">
                                    {upcomingTasks.map((task) => (
                                        <TaskRow key={task.id} task={task} />
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-4 text-sm text-gray-500">No upcoming due dates.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
