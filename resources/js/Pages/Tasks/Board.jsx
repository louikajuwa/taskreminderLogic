import PriorityBadge from '@/Components/PriorityBadge';
import TaskFilters from '@/Components/TaskFilters';
import TaskFormModal from '@/Components/TaskFormModal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/dates';
import { confirmDelete, toastError } from '@/lib/swal';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const COLUMN_META = {
    pending: { title: 'Pending', header: 'border-t-gray-400' },
    in_progress: { title: 'In Progress', header: 'border-t-blue-400' },
    completed: { title: 'Completed', header: 'border-t-green-400' },
};

export default function Board({ columns, filters, statuses, priorities }) {
    const [board, setBoard] = useState(columns);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [movePending, setMovePending] = useState(false);

    // Re-sync whenever the server sends fresh columns (filter change, edit, delete).
    useEffect(() => {
        setBoard(columns);
    }, [columns]);

    const allTasks = useMemo(() => Object.values(board).flat(), [board]);
    const editingTask = editingId ? allTasks.find((t) => t.id === editingId) ?? null : null;

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination || movePending) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sameColumn = source.droppableId === destination.droppableId;
        const sourceList = Array.from(board[source.droppableId]);
        const [moved] = sourceList.splice(source.index, 1);
        const destList = sameColumn ? sourceList : Array.from(board[destination.droppableId]);
        destList.splice(destination.index, 0, { ...moved, status: destination.droppableId });

        const previous = board;
        setBoard({
            ...board,
            [source.droppableId]: sourceList,
            [destination.droppableId]: destList,
        });

        // Persist; keep `columns` out of the partial reload so the board doesn't flicker back.
        let succeeded = false;
        router.patch(
            route('tasks.status', Number(draggableId)),
            { status: destination.droppableId, position: destination.index },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['flash'],
                onStart: () => setMovePending(true),
                onSuccess: () => {
                    succeeded = true;
                },
                // Covers validation errors, network failures and non-Inertia responses alike.
                onFinish: () => {
                    setMovePending(false);
                    if (!succeeded) {
                        setBoard(previous);
                        toastError('Could not move the task. Changes were reverted.');
                    }
                },
            },
        );
    };

    const openEdit = (task) => {
        setEditingId(task.id);
        setModalOpen(true);
    };

    const destroy = (task) => {
        confirmDelete({ text: `"${task.title}" will be permanently deleted.` }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('tasks.destroy', task.id), { preserveScroll: true });
            }
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold leading-tight text-gray-800">Board</h1>
                    <Link
                        href={route('tasks.index')}
                        className="rounded text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        List view →
                    </Link>
                </div>
            }
        >
            <Head title="Board" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
                        <TaskFilters
                            routeName="tasks.board"
                            filters={filters}
                            statuses={statuses}
                            priorities={priorities}
                            showStatus={false}
                            showSort={false}
                        />
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-busy={movePending}>
                            {statuses.map((status) => (
                                <Droppable droppableId={status} key={status}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            role="group"
                                            aria-labelledby={`col-${status}`}
                                            className={`rounded-lg border-t-4 bg-gray-50 p-3 ${COLUMN_META[status].header} ${
                                                snapshot.isDraggingOver ? 'bg-indigo-50' : ''
                                            }`}
                                        >
                                            <div className="mb-3 flex items-center justify-between px-1">
                                                <h2 id={`col-${status}`} className="text-sm font-semibold text-gray-700">
                                                    {COLUMN_META[status].title}
                                                </h2>
                                                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600" aria-label={`${board[status]?.length ?? 0} tasks`}>
                                                    {board[status]?.length ?? 0}
                                                </span>
                                            </div>

                                            <div className="min-h-[8rem] space-y-2">
                                                {(board[status]?.length ?? 0) === 0 && !snapshot.isDraggingOver && (
                                                    <p className="rounded-lg border-2 border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
                                                        No tasks here. Drag a card to this column.
                                                    </p>
                                                )}
                                                {board[status]?.map((task, index) => (
                                                    <Draggable
                                                        draggableId={String(task.id)}
                                                        index={index}
                                                        key={task.id}
                                                        isDragDisabled={movePending}
                                                    >
                                                        {(dragProvided, dragSnapshot) => (
                                                            <div
                                                                ref={dragProvided.innerRef}
                                                                {...dragProvided.draggableProps}
                                                                {...dragProvided.dragHandleProps}
                                                                onClick={() => openEdit(task)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && e.target === e.currentTarget) openEdit(task);
                                                                }}
                                                                aria-label={`${task.title}. Press Enter to edit, space to lift and move with arrow keys.`}
                                                                className={`cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-white p-3 shadow-sm ring-1 ring-gray-200 transition hover:ring-indigo-300 ${
                                                                    dragSnapshot.isDragging ? 'ring-indigo-400' : ''
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="min-w-0 break-words text-sm font-medium text-gray-900">
                                                                        {task.title}
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            destroy(task);
                                                                        }}
                                                                        className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                                                        aria-label={`Delete task: ${task.title}`}
                                                                    >
                                                                        <span aria-hidden="true">✕</span>
                                                                    </button>
                                                                </div>

                                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                                    <PriorityBadge priority={task.priority} />
                                                                    {task.attachments?.length > 0 && (
                                                                        <span className="text-xs text-gray-400">
                                                                            <span aria-hidden="true">📎</span> {task.attachments.length}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {task.due_date && (
                                                                    <p
                                                                        className={`mt-2 text-xs ${
                                                                            task.is_overdue ? 'font-medium text-red-600' : 'text-gray-500'
                                                                        }`}
                                                                    >
                                                                        Due {formatDateTime(task.due_date)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            ))}
                        </div>
                    </DragDropContext>
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
