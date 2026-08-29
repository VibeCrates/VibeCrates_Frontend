type AccessTokenListener = () => void

let accessToken: string | null = null
const listeners = new Set<AccessTokenListener>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(nextAccessToken: string | null): void {
  if (accessToken === nextAccessToken) {
    return
  }

  accessToken = nextAccessToken
  listeners.forEach((listener) => listener())
}

export function subscribeToAccessToken(listener: AccessTokenListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
