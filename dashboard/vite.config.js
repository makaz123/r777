import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@partnership-utils': path.resolve(
        __dirname,
        '../backend/utils/partnershipCommissionUtils.js'
      ),
      '@dashboard-week-range': path.resolve(
        __dirname,
        '../backend/utils/dashboardWeekRange.js'
      ),
    },
  },
});
