import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/doggo-tower-defense/" : "/",
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
