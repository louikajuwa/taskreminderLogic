import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { toastError } from '@/lib/swal';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4F46E5',
    },
});

// Expired CSRF token / session: reload instead of showing Inertia's raw-response modal.
router.on('invalid', (event) => {
    if (event.detail.response?.status === 419) {
        event.preventDefault();
        toastError('Your session expired. Reloading…');
        setTimeout(() => window.location.reload(), 1500);
    }
});

// Network failure or unexpected client exception.
router.on('exception', (event) => {
    event.preventDefault();
    toastError('Network error. Please check your connection and try again.');
});
