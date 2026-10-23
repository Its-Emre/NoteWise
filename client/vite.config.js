import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The /api proxy forwards frontend requests to the Express server in dev,
// so we don't hit CORS issues while developing.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
