import { useSyncExternalStore } from 'react'
import {
  getAccessToken,
  subscribeToAccessToken,
} from '../../../shared/api/accessToken'

export function useAccessToken(): string | null {
  return useSyncExternalStore(
    subscribeToAccessToken,
    getAccessToken,
    () => null,
  )
}
