import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        chunkSizeWarningLimit: 750,
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.indexOf('node_modules') === -1) {
                        return undefined;
                    }
                    if (id.indexOf('@react-three/fiber') !== -1) {
                        return 'r3f-core';
                    }
                    if (id.indexOf('@react-three/drei') !== -1) {
                        return 'r3f-drei';
                    }
                    if (id.indexOf('/three/examples/jsm/') !== -1) {
                        return 'three-examples';
                    }
                    if (id.indexOf('/three/') !== -1) {
                        return 'three-runtime';
                    }
                    return undefined;
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './vitest.setup.ts',
    },
});
