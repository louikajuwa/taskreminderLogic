// Dates are stored and compared in the app timezone (UTC) and displayed as the
// same wall-clock value the user entered — no timezone shifting, which keeps a
// personal task tracker predictable.

const pad = (n) => String(n).padStart(2, '0');

/** Format an ISO datetime as "Jun 20, 2026". */
export function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Format an ISO datetime as "Jun 20, 2026 · 15:30". */
export function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    return `${formatDate(value)} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Convert an ISO datetime to the value expected by <input type="datetime-local">. */
export function toDateTimeLocal(value) {
    if (!value) return '';
    const d = new Date(value);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
