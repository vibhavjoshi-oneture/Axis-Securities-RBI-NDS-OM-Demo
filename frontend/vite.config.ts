import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Axis-Securities-RBI-NDS-OM-Demo/',
  server: {
    port: 5173,
  },
});
