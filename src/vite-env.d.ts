/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 소셜 로그인 시작 주소의 오리진.
   * 로컬은 백엔드(8080)를 직접 가리키고, 운영은 빈 값이라 동일 오리진으로 동작한다.
   * .env 파일이 누락된 빌드에서는 undefined가 되므로 선택 속성으로 둔다.
   */
  readonly VITE_AUTH_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
