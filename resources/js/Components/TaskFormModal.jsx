import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { toDateTimeLocal } from '@/lib/dates';
import { confirmDelete } from '@/lib/swal';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const FIELD_CLASS =
    'mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 aria-[invalid=true]:border-red-300';

export default function TaskFormModal({ show, onClose, task = null, statuses, priorities }) {
    const isEdit = Boolean(task);
    const fileInputRef = useRef(null);

    const { data, setData, post, processing, errors, reset, clearErrors, transform } = useForm({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        reminder_at: '',
        attachments: [],
    });

    // (Re)populate the form whenever the modal opens or targets a different task.
    useEffect(() => {
        if (!show) return;
        clearErrors();
        if (task) {
            setData({
                title: task.title ?? '',
                description: task.description ?? '',
                status: task.status ?? 'pending',
                priority: task.priority ?? 'medium',
                due_date: toDateTimeLocal(task.due_date),
                reminder_at: toDateTimeLocal(task.reminder_at),
                attachments: [],
            });
        } else {
            reset();
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, task?.id]);

    const close = () => {
        reset();
        clearErrors();
        onClose();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { forceFormData: true, preserveScroll: true, onSuccess: () => close() };

        if (isEdit) {
            // Method spoofing: PHP can't parse multipart PUT bodies.
            transform((d) => ({ ...d, _method: 'put' }));
            post(route('tasks.update', task.id), options);
        } else {
            transform((d) => d);
            post(route('tasks.store'), options);
        }
    };

    const removeAttachment = (attachment) => {
        confirmDelete({
            title: 'Remove attachment?',
            text: attachment.original_name,
            confirmButtonText: 'Remove',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('attachments.destroy', attachment.id), { preserveScroll: true });
            }
        });
    };

    const attachmentErrors = Object.keys(errors).filter((k) => k.startsWith('attachments.'));

    return (
        <Modal show={show} onClose={close} maxWidth="2xl">
            <form onSubmit={submit} className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900">
                    {isEdit ? 'Edit Task' : 'New Task'}
                </h2>

                <div className="mt-4 space-y-4">
                    <div>
                        <InputLabel htmlFor="title" value="Title" />
                        <TextInput
                            id="title"
                            error={errors.title}
                            className="mt-1 block w-full"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            isFocused
                            required
                        />
                        <InputError id="title-error" message={errors.title} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="description" value="Description" />
                        <textarea
                            id="description"
                        aria-invalid={errors.description ? true : undefined}
                        aria-describedby={errors.description ? 'description-error' : undefined}
                            rows={3}
                            className={FIELD_CLASS}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        <InputError id="description-error" message={errors.description} className="mt-1" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="status" value="Status" />
                            <select
                                id="status"
                            aria-invalid={errors.status ? true : undefined}
                            aria-describedby={errors.status ? 'status-error' : undefined}
                                className={FIELD_CLASS}
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                            >
                                {statuses.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                                ))}
                            </select>
                            <InputError id="status-error" message={errors.status} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="priority" value="Priority" />
                            <select
                                id="priority"
                            aria-invalid={errors.priority ? true : undefined}
                            aria-describedby={errors.priority ? 'priority-error' : undefined}
                                className={FIELD_CLASS}
                                value={data.priority}
                                onChange={(e) => setData('priority', e.target.value)}
                            >
                                {priorities.map((p) => (
                                    <option key={p} value={p}>{capitalize(p)}</option>
                                ))}
                            </select>
                            <InputError id="priority-error" message={errors.priority} className="mt-1" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="due_date" value="Due date" />
                            <TextInput
                                type="datetime-local"
                                id="due_date"
                            error={errors.due_date}
                                className="mt-1 block w-full"
                                value={data.due_date}
                                onChange={(e) => setData('due_date', e.target.value)}
                            />
                            <InputError id="due_date-error" message={errors.due_date} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="reminder_at" value="Reminder" />
                            <TextInput
                                type="datetime-local"
                                id="reminder_at"
                            error={errors.reminder_at}
                                className="mt-1 block w-full"
                                value={data.reminder_at}
                                onChange={(e) => setData('reminder_at', e.target.value)}
                            />
                            <p className="mt-1 text-xs text-gray-500">Must be on or before the due date.</p>
                            <InputError id="reminder_at-error" message={errors.reminder_at} className="mt-1" />
                        </div>
                    </div>

                    {isEdit && task.attachments?.length > 0 && (
                        <div>
                            <InputLabel value="Current attachments" />
                            <ul className="mt-1 divide-y divide-gray-100 rounded-lg border border-gray-200">
                                {task.attachments.map((a) => (
                                    <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <a
                                            href={route('attachments.download', a.id)}
                                            className="min-w-0 truncate rounded text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                        >
                                            {a.original_name}
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(a)}
                                            className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                            aria-label={`Remove attachment ${a.original_name}`}
                                        >
                                            <span aria-hidden="true">✕</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div>
                        <InputLabel htmlFor="attachments" value={isEdit ? 'Add attachments' : 'Attachments'} />
                        <input
                            ref={fileInputRef}
                            id="attachments"
                            type="file"
                            multiple
                            onChange={(e) => setData('attachments', Array.from(e.target.files))}
                            className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">Up to 10 files, 10 MB each.</p>
                        <InputError message={errors.attachments} className="mt-1" />
                        {attachmentErrors.map((k) => (
                            <InputError key={k} message={errors[k]} className="mt-1" />
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <SecondaryButton onClick={close} disabled={processing}>Cancel</SecondaryButton>
                    <PrimaryButton processing={processing}>
                        {isEdit ? 'Save changes' : 'Create task'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
