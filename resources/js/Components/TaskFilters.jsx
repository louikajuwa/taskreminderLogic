import SecondaryButton from '@/Components/SecondaryButton';
import Spinner from '@/Components/Spinner';
import TextInput from '@/Components/TextInput';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SELECT_CLASS =
    'w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 sm:w-auto';
const compact = (o) => JSON.stringify(Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v)));
const FILTER_KEYS = ['search', 'status', 'priority', 'overdue'];

export default function TaskFilters({
    routeName,
    filters,
    statuses,
    priorities,
    showStatus = true,
    showSort = true,
}) {
    const [values, setValues] = useState(filters ?? {});
    const [loading, setLoading] = useState(false);
    const isFirstRender = useRef(true);
    const lastSent = useRef(compact(filters));

    const current = useRef('');
    current.current = compact(filters);

    const visit = (query) => {
        lastSent.current = compact(query);
        router.get(route(routeName), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    };

    // Debounce navigation so typing in the search box doesn't fire a request per keystroke.
    // `overdue` lives in `values` (seeded from props) so it is preserved across filter changes.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const handle = setTimeout(() => {
            const query = {};
            Object.entries(values).forEach(([key, value]) => {
                if (value) query[key] = value;
            });
            if (compact(query) !== current.current) visit(query);
        }, 300);

        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values, routeName]);

    // Keep local state in sync when the server filters change externally (e.g. a Clear button elsewhere).
    useEffect(() => {
        if (compact(filters) !== lastSent.current) {
            lastSent.current = compact(filters);
            setValues(filters ?? {});
        }
    }, [filters]);

    const update = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
    const hasActive = FILTER_KEYS.some((k) => values[k]);
    const clear = () =>
        setValues((prev) => {
            const next = { ...prev };
            FILTER_KEYS.forEach((k) => delete next[k]);
            return next;
        });

    return (
        <div className="flex flex-wrap items-center gap-3" role="search">
            <div className="w-full min-w-[12rem] grow sm:w-auto">
                <label htmlFor={`${routeName}-search`} className="sr-only">Search tasks</label>
                <TextInput
                    id={`${routeName}-search`}
                    type="search"
                    placeholder="Search tasks…"
                    value={values.search ?? ''}
                    onChange={(e) => update('search', e.target.value)}
                    className="block w-full text-sm"
                />
            </div>

            {showStatus && (
                <>
                    <label htmlFor={`${routeName}-status`} className="sr-only">Filter by status</label>
                    <select
                        id={`${routeName}-status`}
                        className={SELECT_CLASS}
                        value={values.status ?? ''}
                        onChange={(e) => update('status', e.target.value)}
                    >
                        <option value="">All statuses</option>
                        {statuses.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                        ))}
                    </select>
                </>
            )}

            <label htmlFor={`${routeName}-priority`} className="sr-only">Filter by priority</label>
            <select
                id={`${routeName}-priority`}
                className={SELECT_CLASS}
                value={values.priority ?? ''}
                onChange={(e) => update('priority', e.target.value)}
            >
                <option value="">All priorities</option>
                {priorities.map((p) => (
                    <option key={p} value={p}>{capitalize(p)}</option>
                ))}
            </select>

            {showSort && (
                <>
                    <label htmlFor={`${routeName}-sort`} className="sr-only">Sort by</label>
                    <select
                        id={`${routeName}-sort`}
                        className={SELECT_CLASS}
                        value={values.sort ?? 'created_at'}
                        onChange={(e) => update('sort', e.target.value)}
                    >
                        <option value="created_at">Sort: Created</option>
                        <option value="due_date">Sort: Due date</option>
                        <option value="priority">Sort: Priority</option>
                        <option value="title">Sort: Title</option>
                        <option value="status">Sort: Status</option>
                    </select>
                    <label htmlFor={`${routeName}-direction`} className="sr-only">Sort direction</label>
                    <select
                        id={`${routeName}-direction`}
                        className={SELECT_CLASS}
                        value={values.direction ?? 'desc'}
                        onChange={(e) => update('direction', e.target.value)}
                    >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </>
            )}

            {hasActive && (
                <SecondaryButton onClick={clear} className="!py-2">
                    Clear filters
                </SecondaryButton>
            )}
            <span className="inline-flex h-4 w-4 items-center text-indigo-600" role="status" aria-live="polite">
                {loading && (
                    <>
                        <Spinner />
                        <span className="sr-only">Loading…</span>
                    </>
                )}
            </span>
        </div>
    );
}
