import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    // No preloading: every loader can call the API, and a research request
    // costs allowance. Hovering over a list must not spend requests.
    defaultPreload: false,
    // Show the skeleton when the API takes a moment, without a flash.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
