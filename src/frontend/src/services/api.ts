import type { WhatsUpApi } from '../types/api';
import { liveApi } from './liveApi';

/**
 * Picks the API implementation at build time.
 * VITE_API_MODE=mock builds the in-memory demo (no back-office needed); anything else is live.
 * The mock is loaded through a dynamic import so a live build never executes its code.
 */
export async function loadApi(): Promise<WhatsUpApi> {
  if (import.meta.env.VITE_API_MODE === 'mock') {
    const { createMockApi } = await import('./mock/mockApi');
    return createMockApi();
  }
  return liveApi;
}
