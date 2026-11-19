import { useLoaderData } from "@tanstack/react-router"

/** True in demo mode: the app runs on the public test key. */
export const useDemo = () => useLoaderData({ from: "__root__" }).mode === "demo"
