import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        // Listen on all interfaces inside the container
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        cors: true,
        // The browser reaches the dev server through the mapped host port 5273
        hmr: {
            host: 'localhost',
            clientPort: 5273,
        },
        // Polling is more reliable for file watching on Docker + Windows bind mounts
        watch: {
            usePolling: true,
        },
    },
});
