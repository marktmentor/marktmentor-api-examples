import { defineConfig, loadEnv } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "MARKTMENTOR_")
  return {
    resolve: { tsconfigPaths: true },
    // Local use only: the server listens on 127.0.0.1 (see package.json).
    // MARKTMENTOR_ALLOWED_HOSTS adds host names, e.g. behind a reverse proxy.
    server: {
      host: "127.0.0.1",
      allowedHosts: String(env.MARKTMENTOR_ALLOWED_HOSTS || "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean),
    },
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
  }
})
