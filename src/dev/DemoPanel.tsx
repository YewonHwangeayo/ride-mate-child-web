import { useEffect, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEMO_TOKEN, demo, demoGps, setDemo } from './mockServer';

/** 데모 모드에서만 뜨는 조작 패널 (차량 쪽 이벤트를 대신 발생) */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const off = demo.subscribe(rerender);
    return () => {
      off();
    };
  }, []);

  const onPickup = location.pathname === '/pickup' || location.pathname === '/leave';
  const onQr = location.pathname.startsWith('/qr');
  const st = demo.state();

  const act = (fn: () => void) => () => {
    fn();
    rerender();
  };

  return (
    <div className={`demo-panel ${open ? 'open' : ''}`}>
      <button type="button" className="demo-toggle" onClick={() => setOpen((v) => !v)}>
        DEMO {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="demo-body">
          {onQr && (
            <>
              <p>
                인증번호: 아무 6자리 (<b>000000</b> = 틀림)
                <br />
                {st.signedUp ? `가입됨: ${st.userName}` : '신규 사용자'}
              </p>
              <button type="button" onClick={act(demo.resetLogin)}>
                로그인 초기화
              </button>
              <button type="button" onClick={() => navigate(`/p/${DEMO_TOKEN}`)}>
                다음: 픽업 문자 링크 열기 →
              </button>
            </>
          )}
          {onPickup && (
            <>
              <p>차량 상태 바꾸기</p>
              <div className="demo-grid">
                <button type="button" onClick={act(demo.eta)}>
                  도착 예정
                </button>
                <button type="button" onClick={act(demo.soon)}>
                  곧 도착
                </button>
                <button type="button" onClick={act(demo.arrived)}>
                  도착
                </button>
                <button type="button" onClick={act(demo.placeChange)}>
                  장소 변경
                </button>
                <button type="button" onClick={act(demo.boarded)}>
                  탑승 완료
                </button>
                <button type="button" onClick={act(demo.closed)}>
                  링크 종료
                </button>
              </div>
              <label className="demo-check">
                <input
                  type="checkbox"
                  checked={demoGps.simulate}
                  onChange={(e) => {
                    demoGps.simulate = e.target.checked;
                    window.location.reload();
                  }}
                />
                내 위치 걷기 시뮬레이션
              </label>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              demo.reset();
              navigate('/dev');
            }}
          >
            처음부터 (/dev)
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setDemo(false);
              window.location.assign('/');
            }}
          >
            데모 끄기
          </button>
        </div>
      )}
    </div>
  );
}
