import PrimaryButton from '@/Components/PrimaryButton';
import PriorityBadge from '@/Components/PriorityBadge';
import SecondaryButton from '@/Components/SecondaryButton';
import StatusBadge from '@/Components/StatusBadge';
import TaskFilters from '@/Components/TaskFilters';
import TaskFormModal from '@/Components/TaskFormModal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/dates';
import { confirmDelete, toastSuccess } from '@/lib/swal';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const ACTION_BASE =
    'rounded px-1.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';

// Laravel paginator labels are HTML ("&laquo; Previous"); render them as plain text.
const pageLabel = (label) =>
    label
        .replace(/&laquo;|«/g, '‹')
        .replace(/&raquo;|»/g, '›')
        .replace(/&[a-z]+;/g, '')
        .trim();

export default function Index({ tasks, filters = {}, statuses, priorities }) {
    const [pending, setPending] = useState(() => new Set());
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Derive the task being edited from the live props so it stays in sync
    // (e.g. after an attachment is added or removed).
    const editingTask = useMemo(
        () => (editingId ? tasks.data.find((t) => t.id === editingId) ?? null : null),
        [editingId, tasks.data],
    );

    const hasFilters = Boolean(filters.search || filters.status || filters.priority || filters.overdue);

    const openCreate = () => {
        setEditingId(null);
        setModalOpen(true);
    };

    const openEdit = (task) => {
        setEditingId(task.id);
        setModalOpen(true);
    };

    const trackPending = (id, on) =>
        setPending((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });

    const clearFilters = () =>
        router.get(route('tasks.index'), {}, { preserveScroll: true, replace: true });

    const toggleComplete = (task) => {
        if (pending.has(task.id)) return;
        const status = task.status === 'completed' ? 'pending' : 'completed';
        router.patch(
            route('tasks.status', task.id),
            { status },
            {
                preserveScroll: true,
                onStart: () => trackPending(task.id, true),
                onFinish: () => trackPending(task.id, false),
                onSuccess: () =>
                    toastSuccess(status === 'completed' ? 'Task completed!' : 'Task reopened.'),
            },
        );
    };

    const destroy = (task) => {
        confirmDelete({ text: `"${task.title}" will be permanently deleted.` }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('tasks.destroy', task.id), {
                    preserveScroll: true,
                    onStart: () => trackPending(task.id, true),
                    onFinish: () => trackPending(task.id, false),
                });
            }
        });
    };

    const renderActions = (task) => {
        const busy = pending.has(task.id);
        const done = task.status === 'completed';
        return (
            <div className="flex flex-wrap items-center gap-1 text-sm">
                <button
                    type="button"
                    onClick={() => toggleComplete(task)}
                    disabled={busy}
                    className={`${ACTION_BASE} text-gray-600 hover:text-green-700`}
                    aria-label={`${done ? 'Reopen' : 'Mark complete'}: ${task.title}`}
                >
                    {done ? '↺ Reopen' : '✓ Complete'}
                </button>
                <button
                    type="button"
                    onClick={() => openEdit(task)}
                    disabled={busy}
                    className={`${ACTION_BASE} text-indigo-600 hover:text-indigo-800`}
                    aria-label={`Edit task: ${task.title}`}
                >
                    Edit
                </button>
                <button
                    type="button"
                    onClick={() => destroy(task)}
                    disabled={busy}
                    className={`${ACTION_BASE} text-red-600 hover:text-red-800`}
                    aria-label={`Delete task: ${task.title}`}
                >
                    Delete
                </button>
            </div>
        );
    };

    const renderDue = (task) =>
        task.due_date ? (
            <span className={task.is_overdue ? 'font-medium text-red-600' : 'text-gray-600'}>
                {formatDateTime(task.due_date)}
                {task.is_overdue && ' (overdue)'}
            </span>
        ) : (
            <span className="text-gray-400">—</span>
        );

    const attachmentCount = (task) =>
        task.attachments?.length > 0 && (
            <div className="mt-1 text-xs text-gray-400">
                <span aria-hidden="true">📎</span> {task.attachments.length} attachment
                {task.attachments.length > 1 ? 's' : ''}
            </div>
        );

    const emptyState = hasFilters ? (
        <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No tasks match your filters</p>
            <p className="mt-1 text-sm text-gray-500">Try adjusting or clearing your filters.</p>
            <SecondaryButton onClick={clearFilters} className="mt-4">
                Clear filters
            </SecondaryButton>
        </div>
    ) : (
        <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No tasks yet</p>
            <p className="mt-1 text-sm text-gray-500">Create your first task to get started.</p>
            <PrimaryButton type="button" onClick={openCreate} className="mt-4">
                + New Task
            </PrimaryButton>
        </div>
    );

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold leading-tight text-gray-800">Tasks</h1>
                    <PrimaryButton type="button" onClick={openCreate}>
                        + New Task
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Tasks" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
                        <TaskFilters
                            routeName="tasks.index"
                            filters={filters}
                            statuses={statuses}
                            priorities={priorities}
                        />
                        {filters.overdue && (
                            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Overdue filter on: showing overdue tasks only
                            </p>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
                        {tasks.data.length === 0 && emptyState}

                        {tasks.data.length > 0 && (
                            <>
                                {/* Mobile: card list */}
                                <ul className="divide-y divide-gray-100 md:hidden">
                                    {tasks.data.map((task) => (
                                        <li key={task.id} className="space-y-2 p-4">
                                            <p className="break-words font-medium text-gray-900">{task.title}</p>
                                            {task.description && (
                                                <p className="line-clamp-2 break-words text-sm text-gray-500">
                                                    {task.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <PriorityBadge priority={task.priority} />
                                                <StatusBadge status={task.status} />
                                            </div>
                                            <p className="text-sm">
                                                <span className="text-gray-500">Due: </span>
                                                {renderDue(task)}
                                            </p>
                                            {attachmentCount(task)}
                                            {renderActions(task)}
                                        </li>
                                    ))}
                                </ul>

                                {/* md+: table */}
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                                <th scope="col" className="px-6 py-3">Task</th>
                                                <th scope="col" className="px-6 py-3">Priority</th>
                                                <th scope="col" className="px-6 py-3">Status</th>
                                                <th scope="col" className="px-6 py-3">Due</th>
                                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {tasks.data.map((task) => (
                                                <tr key={task.id} className="hover:bg-gray-50">
                                                    <td className="max-w-md px-6 py-4">
                                                        <div
                                                            className="truncate font-medium text-gray-900"
                                                            title={task.title}
                                                        >
                                                            {task.title}
                                                        </div>
                                                        {task.description && (
                                                            <div className="mt-0.5 line-clamp-1 break-words text-sm text-gray-500">
                                                                {task.description}
                                                            </div>
                                                        )}
                                                        {attachmentCount(task)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <PriorityBadge priority={task.priority} />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={task.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">{renderDue(task)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex justify-end">{renderActions(task)}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {tasks.links?.length > 3 && (
                        <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-1">
                            {tasks.links.map((link, i) => {
                                const label = pageLabel(link.label);
                                const base = 'rounded-lg px-3 py-1.5 text-sm';
                                return link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        preserveScroll
                                        preserveState
                                        aria-current={link.active ? 'page' : undefined}
                                        className={`${base} focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {label}
                                    </Link>
                                ) : (
                                    <span key={i} aria-disabled="true" className={`${base} text-gray-300`}>
                                        {label}
                                    </span>
                                );
                            })}
                        </nav>
                    )}
                </div>
            </div>

            <TaskFormModal
                show={modalOpen}
                onClose={() => setModalOpen(false)}
                task={editingTask}
                statuses={statuses}
                priorities={priorities}
            />
        </AuthenticatedLayout>
    );
}
