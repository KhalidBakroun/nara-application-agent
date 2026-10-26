import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    // The build laptop has 8 GB RAM and little of it free: one worker avoids out-of-memory crashes in jsdom.
    pool: "threads",
    maxWorkers: 1,
  },
});
