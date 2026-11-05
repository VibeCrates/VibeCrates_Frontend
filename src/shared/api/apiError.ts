export class ApiError extends Error {
  readonly status: number
  /** 실패 응답에 함께 온 data. 대개 null이고, 보드 중복 거절이면 이미 있는 보드의 id가 들어 있다. */
  readonly data: unknown

  constructor(status: number, message: string, data: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}
