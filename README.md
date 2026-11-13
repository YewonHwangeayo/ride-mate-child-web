# RideMate_web — 자녀 픽업 모바일 웹

자녀는 SMS 픽업 링크를 로그인 없이 엽니다. QR 운전자 인증·차량번호 등록·차량용 화면은 이 빌드에 포함하지 않습니다.

## 연결된 API

- `GET /api/v1/Pickup/W/DetailChildPickup`
- `POST /api/v1/Pickup/W/AddPickupLinkOpen`
- `GET /api/v1/Pickup/W/DetailChildPickupStream` (fetch SSE, `X-Pickup-Token`)
- `POST /api/v1/Pickup/W/AddChildLeave`
- `DELETE /api/v1/Pickup/W/DeleteChildLeave`

토큰은 URL에서만 읽고 `X-Pickup-Token` 헤더로만 전달합니다. localStorage에 넣지 않습니다. 자녀 GPS는 지도 표시에만 쓰고 서버로 보내지 않습니다.

## 실행

```bash
npm install          # 처음 한 번
npm run dev          # http://localhost:5173
```

- `.env.local`: `VITE_KAKAO_MAP_APP_KEY`(카카오 JavaScript 키), 배포용 `VITE_API_BASE_URL`
- `.env.development.local`: 개발 시 `/api`를 Vite 프록시로 `API_PROXY_TARGET`(실제 서버)에 연결 → CORS 설정 없이 동작
- 카카오디벨로퍼스 > 앱 > 플랫폼 > Web 사이트 도메인에 `http://localhost:5173` 등록 필요 (휴대폰 테스트 시 `http://<맥 IP>:5173`도 추가)
- 픽업 링크로 접속: `http://localhost:5173/p/<43자리 토큰>` 또는 `/pickup?token=<토큰>`
- 지도 SDK만 점검: `http://localhost:5173/map-check`

토큰 없이 `/`에 접속하면 무한 로딩 대신 링크 안내가 나옵니다.

## 검증

- `npm test`
- `npm run build`
