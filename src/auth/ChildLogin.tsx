import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { ApiError, pickupApi } from '../api';
import { Shell } from '../components/Shell';
import type { Pickup } from '../types';
import { digitsOnly, formatPhone, isValidPhone, maskPhone } from './phone';

/**
 * SMS 픽업 링크 → 로그인 화면 (화면 미리보기)
 *
 * ⚠️ 서버에 이 흐름용 API가 아직 없다.
 *   - 웹 로그인(AddWebSession)은 차 화면 QR userCode 가 필수라 픽업 링크에서는 쓸 수 없음
 *   - 차량번호 조회 API 없음 → 픽업 조회(DetailChildPickup)의 car.noLast4 로 보여 줌
 * 그래서 지금은 인증번호를 보내거나 검증하지 않는다(아무 6자리 통과).
 * VITE_CHILD_LOGIN_PREVIEW=true 일 때만 켜지며, 배포 기본값은 꺼짐.
 * TODO(backend): 번호 로그인·가입·차량 확인 API가 생기면 아래 TODO 지점에 연결.
 */
export const CHILD_LOGIN_ENABLED = import.meta.env.VITE_CHILD_LOGIN_PREVIEW === 'true';
const DONE_KEY = 'rm-child-login';
const KNOWN_KEY = 'rm-child-known';

export function childLoginDone() {
  try {
    return sessionStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

type Step = 'phone' | 'otp' | 'signup' | 'car' | 'done';
const COLOR: Record<string, string> = { WHITE: '흰색', BLACK: '검은색', GRAY: '회색', ETC: '' };

export function ChildLogin({ token, onDone }: { token: string; onDone: () => void }) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState({ terms: false, privacy: false });
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [msg, setMsg] = useState('');
  const otpRef = useRef<HTMLInputElement>(null);

  // 링크가 끝났거나(CLOSED/BOARDED) 없는 링크(404)면 로그인할 이유가 없으므로 바로 상태 화면으로 넘긴다
  useEffect(() => {
    let alive = true;
    pickupApi
      .detail(token)
      .then((r) => {
        if (!alive) return;
        if (r.data.linkStatus !== 'ACTIVE') onDone();
        else setPickup(r.data);
      })
      .catch((e) => {
        if (alive && e instanceof ApiError && e.status === 404) onDone();
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
    if (step === 'car' && !pickup) {
      pickupApi
        .detail(token)
        .then((r) => setPickup(r.data))
        .catch(() => setMsg('차 정보를 불러오지 못했어요.'));
    }
  }, [step, pickup, token]);

  const go = (s: Step) => {
    setMsg('');
    setStep(s);
  };

  const finish = () => {
    try {
      sessionStorage.setItem(DONE_KEY, '1');
      localStorage.setItem(KNOWN_KEY, '1');
    } catch {
      /* noop */
    }
    onDone();
  };

  const known = (() => {
    try {
      return localStorage.getItem(KNOWN_KEY) === '1';
    } catch {
      return false;
    }
  })();

  const notice = msg && (
    <p className="auth-msg" role="alert">
      {msg}
    </p>
  );

  if (step === 'done') {
    return (
      <Shell>
        <div className="done-screen">
          <div className="done-check">
            <Check size={34} strokeWidth={3.2} />
          </div>
          <h2>로그인됐어요!</h2>
          <p>이제 차가 언제 오는지 확인하고 나갈 시간을 정할 수 있어요.</p>
          <button type="button" className="auth-primary done-next" onClick={finish}>
            픽업 안내 보기
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="auth">
        {step === 'phone' && (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO(backend): 인증번호 발송 API (픽업 링크용)
              if (isValidPhone(phone)) go('otp');
            }}
          >
            <h1 className="auth-title">휴대폰 번호를 입력해 주세요</h1>
            <p className="auth-sub">픽업 안내를 받을 번호예요</p>
            <input
              className="auth-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="010-1234-5678"
              aria-label="휴대폰 번호"
              value={formatPhone(phone)}
              onChange={(e) => setPhone(digitsOnly(e.target.value))}
              autoFocus
            />
            <p className="auth-help">인증번호를 문자로 보내 드려요</p>
            <p className="preview-note">미리보기: 서버 API가 생기기 전이라 실제 문자는 가지 않아요</p>
            <div className="auth-bottom">
              <button type="submit" className="auth-primary" disabled={!isValidPhone(phone)}>
                인증번호 받기
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO(backend): 인증번호 확인 + 가입 여부 응답
              if (code.length === 6) go(known ? 'car' : 'signup');
            }}
          >
            <h1 className="auth-title">인증번호 6자리를 입력해 주세요</h1>
            <p className="auth-sub">{maskPhone(phone)}로 보냈어요</p>
            <label className="otp" onClick={() => otpRef.current?.focus()}>
              <input
                ref={otpRef}
                className="otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                aria-label="인증번호 6자리"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`otp-box ${i === Math.min(code.length, 5) ? 'active' : ''}`}>
                  {code[i] ?? ''}
                </span>
              ))}
            </label>
            <div className="otp-row">
              <button type="button" className="otp-resend" onClick={() => go('phone')}>
                번호 다시 입력
              </button>
            </div>
            <div className="auth-bottom">
              <button type="submit" className="auth-primary" disabled={code.length !== 6}>
                확인
              </button>
            </div>
          </form>
        )}

        {step === 'signup' && (
          <>
            <h1 className="auth-title">처음 오셨네요</h1>
            <p className="auth-sub">차 화면에 보일 이름을 알려 주세요</p>
            <input
              className="auth-input small"
              placeholder="이름"
              aria-label="이름"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <div className="agree-box">
              <label className="agree-row all">
                <input
                  type="checkbox"
                  checked={agree.terms && agree.privacy}
                  onChange={(e) => setAgree({ terms: e.target.checked, privacy: e.target.checked })}
                />
                <span className="check" aria-hidden="true" />
                전체 동의
              </label>
              <div className="agree-line" />
              {(
                [
                  ['terms', '[필수] 서비스 이용약관'],
                  ['privacy', '[필수] 개인정보 수집·이용'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="agree-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={agree[key]}
                      onChange={(e) => setAgree((a) => ({ ...a, [key]: e.target.checked }))}
                    />
                    <span className="check" aria-hidden="true" />
                    {label}
                  </label>
                </div>
              ))}
            </div>
            <div className="auth-bottom">
              <button
                type="button"
                className="auth-primary"
                disabled={!name.trim() || !agree.terms || !agree.privacy}
                onClick={() => go('car')} // TODO(backend): 가입 API
              >
                동의하고 계속
              </button>
            </div>
          </>
        )}

        {step === 'car' && (
          <>
            <h1 className="auth-title">이 차가 맞나요?</h1>
            <p className="auth-sub">
              {pickup
                ? [pickup.driverName, pickup.car?.model, pickup.car?.color ? COLOR[pickup.car.color] : null]
                    .filter(Boolean)
                    .join(' · ') || '픽업 차량'
                : '차 정보를 불러오고 있어요'}
            </p>
            <p className="match-label">차 번호 뒤 4자리</p>
            <div className="match-code" aria-label={`차 번호 뒤 4자리 ${pickup?.car?.noLast4 ?? ''}`}>
              {pickup?.car?.noLast4 ? (
                pickup.car.noLast4.split('').map((d, i) => <span key={i}>{d}</span>)
              ) : (
                <span className="dim">----</span>
              )}
            </div>
            {pickup && !pickup.car?.noLast4 && <p className="auth-help">차량 앱에 차 번호가 아직 등록되지 않았어요.</p>}
            {notice}
            <div className="auth-bottom stack">
              <button type="button" className="auth-primary" onClick={() => go('done')}>
                맞아요
              </button>
              <button
                type="button"
                className="auth-secondary"
                onClick={() => setMsg('다른 차라면 보호자에게 확인해 주세요.')}
              >
                아니에요
              </button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
