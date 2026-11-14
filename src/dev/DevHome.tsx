import { Link } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { DEMO_TOKEN, demo } from './mockServer';

/** 개발용 화면 목록 (npm run dev 에서만 존재) */
export default function DevHome() {
  return (
    <Shell label="개발 메뉴">
      <div className="dev-home">
        <h1 className="auth-title">화면 점검 (데모 모드)</h1>
        <p className="auth-sub">
          실제 서버 대신 브라우저 안의 가짜 응답으로 전체 흐름을 확인해요. 오른쪽 아래 <b>DEMO</b> 버튼으로 차량 상태를
          바꿀 수 있어요.
        </p>
        <ol className="dev-steps">
          <li>
            <Link to="/qr?code=DEMO-QR" onClick={() => demo.resetLogin()}>
              ① 차량 QR 로그인 (신규 가입)
            </Link>
            <span>번호 → 인증번호 → 이름·약관 → 로그인 허용 → 완료</span>
          </li>
          <li>
            <Link to="/qr?code=DEMO-QR">② 차량 QR 로그인 (기존 사용자 / 세션 유지)</Link>
            <span>①을 끝낸 뒤 열면 바로 ‘로그인 허용’ 화면</span>
          </li>
          <li>
            <Link to={`/p/${DEMO_TOKEN}`} onClick={() => demo.reset()}>
              ③ 픽업 문자 링크 열기
            </Link>
            <span>도착 예정 → 출발 시간 설정 → 곧 도착 → 도착 → 장소 변경 → 탑승 완료</span>
          </li>
          <li>
            <Link to="/qr">④ QR 코드 없이 열기 (오류 화면)</Link>
          </li>
          <li>
            <a href="/pickup?token=wrong">⑤ 잘못된 픽업 링크</a>
          </li>
          <li>
            <a href="/map-check?demo=0">⑥ 지도 SDK 점검 (데모 끔)</a>
          </li>
        </ol>
        <p className="auth-help">
          실제 서버로 확인하려면 <a href="/?demo=0">데모 끄기</a> 후 실제 링크를 여세요. 보행 경로는
          .env.development.local 에 TMAP_APP_KEY 가 있으면 실제 T map 경로, 없으면 점선 직선으로 보여요.
        </p>
      </div>
    </Shell>
  );
}
