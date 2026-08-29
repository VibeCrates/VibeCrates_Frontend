export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface AccessTokenResponse {
  accessToken: string
}
