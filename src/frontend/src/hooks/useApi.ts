import { createContext, useContext } from 'react';
import type { WhatsUpApi } from '../types/api';

export const ApiContext = createContext<WhatsUpApi | null>(null);

export function useApi(): WhatsUpApi {
  const api = useContext(ApiContext);
  if (api === null) {
    throw new Error('useApi must be used inside ApiContext.Provider.');
  }
  return api;
}
