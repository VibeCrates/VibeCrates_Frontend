# Crates Frontend

React, TypeScript, Vite 기반의 Crates 프론트엔드입니다.

## 로컬 실행

Spring Boot 백엔드를 `http://localhost:8080`에서 먼저 실행한 뒤 프론트엔드를 시작합니다.

```bash
npm install
npm run dev
```

프론트엔드는 자체 서명 인증서를 사용하는 `https://localhost:3000`에서 실행됩니다. 최초 접속 시 브라우저에서 인증서 사용을 허용해야 합니다.

## 환경별 요청 경로

- API 요청은 항상 `/api/*` 상대 경로를 사용합니다.
- 로컬에서는 Vite가 `/api`를 `http://localhost:8080`으로 프록시하며 접두사를 제거하지 않습니다.
- 운영에서는 프론트엔드와 API가 `https://crates.io`의 동일 오리진을 사용합니다.
- OAuth 시작 주소만 `VITE_AUTH_ORIGIN`을 사용합니다.
  - 개발: `http://localhost:8080`
  - 운영: 빈 문자열(동일 오리진)
- 프론트엔드 OAuth 완료 경로는 `/auth/callback`입니다.

## 인증 원칙

- access token은 브라우저 저장소가 아닌 메모리에만 저장합니다.
- 새로고침 시 `/api/auth/refresh`를 한 번 호출해 access token을 복구합니다.
- 여러 API 요청이 동시에 401을 받아도 refresh 요청은 하나만 실행합니다.
- refresh token은 백엔드가 발급하는 HttpOnly 쿠키로만 관리합니다.
- OAuth 임시 토큰 교환은 StrictMode에서도 한 번만 시작합니다.

## 디렉터리

```text
src/
├── app/                 # 전역 Provider와 라우팅
├── features/
│   ├── auth/
│   ├── board/
│   ├── content/
│   └── search/
└── shared/
    ├── api/             # API 응답 언랩, 인증 재시도
    └── types/           # 공통 API 타입
```

## 검증

```bash
npm run lint
npm run build
```
