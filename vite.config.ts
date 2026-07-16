import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/eda-primer-app/",
  server: {
    port: 5174,
  },
});
