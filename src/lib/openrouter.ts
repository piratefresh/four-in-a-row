import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export const openrouter = createOpenRouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
})

export const freeModel = 'stepfun/step-3.5-flash:free'
