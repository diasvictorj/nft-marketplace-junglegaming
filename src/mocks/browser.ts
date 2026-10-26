import { setupWorker } from 'msw/browser'
import { restHandlers } from './handlers'
import { socketHandlers } from './socket'

export const worker = setupWorker(...restHandlers, ...socketHandlers)
