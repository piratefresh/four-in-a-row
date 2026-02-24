import { createRouter } from '@tanstack/react-router'
import { ConvexQueryClient } from '@convex-dev/react-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  if (!convexUrl) {
    throw new Error('Missing VITE_CONVEX_URL')
  }
  const convexQueryClient = new ConvexQueryClient(convexUrl)

  const router = createRouter({
    routeTree,
    context: {
      convexQueryClient,
    },

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}
