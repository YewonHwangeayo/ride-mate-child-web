# RideMate_web — 자녀 픽업 모바일 웹 + 차량 QR 로그인

## 실행

```bash
npm install          # 처음 한 번
npm run dev          # http://localhost:5173
```

### 화면 전체 점검 (데모 모드, 개발 서버 전용)

`http://localhost:5173/dev` → 로그인 → 픽업 → 출발 시간 → 곧 도착 → 도착 → 장소 변경 → 탑승 완료까지
브라우저 안의 가짜 응답으로 확인합니다. 오른쪽 아래 **DEMO** 버튼으로 차량 상태를 바꿉니다.
데모 코드는 `npm run build` 결과물에 포함되지 않습니다. 끄기: `?demo=0`

- 인증번호: 아무 6자리 (`000000` = 틀린 번호)
- 내 위치: 학원 → 픽업 장소로 걷는 시뮬레이션 (패널에서 실제 GPS로 전환)

### 실제 서버로 확인

- 픽업: `http://localhost:5173/p/<43자리 토큰>`
- 차량 QR 로그인: Swagger `POST /api/v1/Auth/M/DeviceAuthorization` → `user_code` →
  3분 안에 `http://localhost:5173/qr?code=<user_code>` (`/qr`만 열면 개발용 입력칸이 나옴)
- 지도 SDK 점검: `/map-check`

## 환경 변수

| 파일 | 키 | 용도 |
|---|---|---|
| `.env.local` | `VITE_KAKAO_MAP_APP_KEY` | 카카오 JavaScript 키 |
| `.env.development.local` | `VITE_API_BASE_URL=` (비움) | 개발 시 /api 를 Vite 프록시로 |
| | `API_PROXY_TARGET` | 실제 API 서버 |
| | `TMAP_APP_KEY` | 보행자 경로(T map). 서버 쪽에서만 사용 |

카카오디벨로퍼스 Web 도메인: `http://localhost:5173` (+ 휴대폰 테스트 시 `http://<맥 IP>:5173`, 배포 도메인)

## 지도

- 다크 모드: 카카오 타일 이미지에만 CSS 필터 (핀·선은 영향 없음)
- 흰 선: 차 → 픽업 장소 (실시간)
- 연두 선: 내 위치(휴대폰 GPS) → 픽업 장소. T map 보행자 경로 → 학원 근처면 서버 walkPath → 둘 다 없으면 점선 직선
- 연한 점선: 지금까지 걸어온 동선 (휴대폰 메모리에만 보관, 서버 저장 없음)
- 보행 경로 요청: 처음 / 30m 이상 이동 / 픽업 장소 변경 시, 10초에 최대 1번 (`/api/walk-route`)

## Vercel 배포

- `vercel.json`: `/api/*` → API 서버 프록시 (같은 도메인 → CORS·웹 세션 쿠키 문제 없음)
- `api/walk-route.ts`: 보행자 경로 서버리스 함수 (T map 키 숨김)
- Vercel 환경 변수: `VITE_KAKAO_MAP_APP_KEY`, `TMAP_APP_KEY` (`VITE_API_BASE_URL`은 비워 둠)
- 백엔드: QR `verification_uri`와 픽업 SMS 링크를 Vercel 도메인의 `/qr?code=…`, `/p/<토큰>`으로 변경

## 검증

- `npm test`
- `npm run build`
