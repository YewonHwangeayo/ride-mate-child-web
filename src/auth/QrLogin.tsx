import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { ApiError } from '../api';
import { Shell, StateScreen } from '../components/Shell';
import { authApi, errorData, type WebQrLogin } from './authApi';
import { readUserCode } from './qrCode';
import { digitsOnly, formatPhone, isValidPhone, maskPhone, mmss } from './phone';

/** 차량 QR 로그인 (휴대폰 웹) — 디자인 1~5번 PNG
 *  QR 주소: /qr?code=<userCode>  (서버 DeviceAuthorization 의 verification_uri_complete)
 */
type Step = 'phone' | 'otp' | 'signup' | 'approve';
const NAMES = ['엄마', '아빠', '할머니'] as const;

function useCountdown(deadline: number | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (deadline === null) return setLeft(0);
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);
  return left;
}

const after = (sec: number | null | undefined) => (sec ? performance.now() + sec * 1000 : null);

function qrErrorText(info: WebQrLogin | undefined, status: number) {
  const state = info?.qrState;
  if (status === 404 || state === 'NOT_FOUND') return 'QR 정보를 찾을 수 없어요.';
  if (state === 'EXPIRED') return 'QR 유효 시간이 지났어요.';
  if (state === 'CANCELED') return '차 화면에서 로그인을 취소했어요.';
  if (state === 'APPROVED' || state === 'USED') return '이미 로그인에 사용된 QR이에요.';
  return 'QR 로그인을 이어갈 수 없어요.';
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Shell label="차량 로그인">
      <div className="auth">{children}</div>
    </Shell>
  );
}

export function QrLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const userCode = readUserCode(location.pathname, location.search);
  const [manualCode, setManualCode] = useState('');
  const routeStep = (location.state as { step?: Step } | null)?.step;

  const [boot, setBoot] = useState<'loading' | 'ready' | 'error'>('loading');
  const [fatal, setFatal] = useState('');
  const [finished, setFinished] = useState<'done' | 'canceled' | null>(null);
  const [info, setInfo] = useState<WebQrLogin | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState<string>('엄마');
  const [custom, setCustom] = useState(false);
  const [agree, setAgree] = useState({ terms: false, privacy: false });
  const [viewing, setViewing] = useState<null | 'terms' | 'privacy'>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [otpDeadline, setOtpDeadline] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [qrDeadline, setQrDeadline] = useState<number | null>(null);
  const otpLeft = useCountdown(otpDeadline);
  const resendLeft = useCountdown(resendAt);
  const qrLeft = useCountdown(qrDeadline);
  const otpRef = useRef<HTMLInputElement>(null);

  // 화면 이동은 history state 로 관리 → 브라우저 뒤로가기로 이전 단계 복귀
  const go = useCallback(
    (step: Step, replace = false) => {
      setMsg('');
      navigate(`${location.pathname}${location.search}`, { state: { step }, replace });
    },
    [navigate, location.pathname, location.search],
  );

  // 필요한 데이터가 없는 단계로 돌아오면 앞 단계로 보정
  let step: Step = routeStep ?? (info?.signedIn ? 'approve' : 'phone');
  if (step === 'otp' && !isValidPhone(phone)) step = 'phone';
  if (step === 'signup' && code.length !== 6) step = 'phone';
  if (step === 'approve' && !info?.signedIn) step = 'phone';

  const load = useCallback(async () => {
    if (!userCode) {
      setFatal('차 화면의 QR 코드를 휴대폰 카메라로 찍어 주세요.');
      setBoot('error');
      return;
    }
    setBoot('loading');
    try {
      const res = await authApi.detail(userCode);
      setInfo(res.data);
      setQrDeadline(after(res.data.expiresIn));
      setBoot('ready');
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setFatal(status === 0 ? (e as Error).message : qrErrorText(errorData(e), status));
      setBoot('error');
    }
  }, [userCode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const handleQrError = (e: unknown) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
      setFatal(qrErrorText(errorData(e), e.status));
      setBoot('error');
      return true;
    }
    return false;
  };

  const sendCode = async (isResend = false) => {
    if (busy || !isValidPhone(phone)) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await authApi.sendCode(digitsOnly(phone));
      if (res.code === 101) {
        setResendAt(after(res.data?.retryAfter ?? 60));
        setMsg(`${res.data?.retryAfter ?? 60}초 뒤에 다시 받을 수 있어요.`);
        if (!isResend) go('otp');
        return;
      }
      if (res.code === 102) {
        setMsg('인증을 여러 번 틀려서 10분 동안 받을 수 없어요.');
        return;
      }
      setOtpDeadline(after(res.data.expiresIn));
      setResendAt(after(res.data.retryAfter));
      setCode('');
      if (isResend) setMsg('인증번호를 다시 보냈어요.');
      else go('otp');
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : '인증번호를 보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const afterSignIn = async (data: WebQrLogin) => {
    let next = data;
    if (!next.matchCode) next = { ...next, ...(await authApi.detail(userCode)).data };
    setInfo({ ...next, signedIn: true });
    go('approve');
  };

  const verify = async () => {
    if (busy || code.length !== 6) return;
    if (otpDeadline !== null && otpLeft === 0) {
      setMsg('인증번호 유효 시간이 지났어요. 다시 받아 주세요.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await authApi.signIn({ phone: digitsOnly(phone), code, userCode });
      if (res.code === 101 || res.data?.signupRequired) go('signup');
      else await afterSignIn(res.data);
    } catch (e) {
      if (handleQrError(e)) return;
      const left = errorData(e)?.remainingAttempts;
      setMsg(
        e instanceof ApiError && e.status === 400
          ? `인증번호가 맞지 않아요.${left != null ? ` (남은 횟수 ${left}번)` : ''}`
          : e instanceof ApiError
            ? e.message
            : '확인하지 못했어요.',
      );
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    const userName = name.trim();
    if (busy || !userName || !agree.terms || !agree.privacy) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await authApi.signIn({
        phone: digitsOnly(phone),
        code,
        userCode,
        userName,
        agreeTerms: true,
        agreePrivacy: true,
      });
      await afterSignIn({ ...res.data, userName: res.data.userName ?? userName });
    } catch (e) {
      if (handleQrError(e)) return;
      if (e instanceof ApiError && e.status === 400) {
        setCode('');
        go('otp', true);
        setMsg('인증번호를 다시 확인해 주세요.');
        return;
      }
      setMsg(e instanceof ApiError ? e.message : '가입하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      await authApi.approve(userCode);
      setFinished('done');
    } catch (e) {
      if (handleQrError(e)) return;
      if (e instanceof ApiError && e.status === 401) {
        setInfo((v) => (v ? { ...v, signedIn: false } : v));
        go('phone', true);
        setMsg('다시 로그인해 주세요.');
        return;
      }
      setMsg(e instanceof ApiError ? e.message : '로그인을 허용하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authApi.cancel(userCode);
    } catch {
      // 취소 실패여도 차 화면 QR은 3분 뒤 만료된다.
    } finally {
      setBusy(false);
      setFinished('canceled');
    }
  };

  const switchAccount = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authApi.switchAccount(userCode);
    } catch {
      /* 세션이 이미 없으면 그대로 진행 */
    } finally {
      setBusy(false);
      setInfo((v) => (v ? { ...v, signedIn: false } : v));
      setPhone('');
      go('phone', true);
    }
  };

  // ---------- 렌더 ----------
  if (finished === 'done') {
    return (
      <Shell label="차량 로그인">
        <div className="done-screen">
          <div className="done-check">
            <Check size={34} strokeWidth={3.2} />
          </div>
          <h2>차에서 로그인됐어요!</h2>
          <p>
            이제 휴대폰은 닫아도 돼요.
            <br />차 화면에서 이어서 진행해 주세요.
          </p>
        </div>
      </Shell>
    );
  }
  if (finished === 'canceled') {
    return (
      <StateScreen
        label="차량 로그인"
        title="로그인을 취소했어요"
        description="차 화면에서 다시 QR을 띄우면 처음부터 진행할 수 있어요."
      />
    );
  }
  if (boot === 'loading') {
    return (
      <Shell label="차량 로그인">
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          QR 정보를 확인하고 있어요…
        </div>
      </Shell>
    );
  }
  if (boot === 'error') {
    return (
      <StateScreen
        label="차량 로그인"
        title="QR 로그인을 이어갈 수 없어요"
        description={`${fatal} 차 화면에서 QR을 다시 띄워 주세요.`}
        action={
          userCode ? (
            <button type="button" className="retry-btn" onClick={load}>
              다시 시도
            </button>
          ) : import.meta.env.DEV ? (
            <form
              className="dev-code"
              onSubmit={(e) => {
                e.preventDefault();
                const c = manualCode.trim();
                if (c) navigate(`/qr?code=${encodeURIComponent(c)}`, { replace: true });
              }}
            >
              <p className="auth-help">개발용: Swagger DeviceAuthorization의 user_code를 붙여 넣으세요</p>
              <input
                className="auth-input small"
                placeholder="user_code"
                aria-label="user_code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <button type="submit" className="retry-btn">
                QR 로그인 시작
              </button>
            </form>
          ) : undefined
        }
      />
    );
  }
  if (qrDeadline !== null && qrLeft === 0) {
    return (
      <StateScreen
        label="차량 로그인"
        title="QR 유효 시간이 지났어요"
        description="차 화면에서 QR을 다시 띄워 주세요."
      />
    );
  }

  const notice = msg && (
    <p className="auth-msg" role="alert">
      {msg}
    </p>
  );

  if (step === 'phone') {
    return (
      <AuthShell>
        <h1 className="auth-title">휴대폰 번호를 입력해 주세요</h1>
        <p className="auth-sub">차에 로그인할 부모님 번호예요</p>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <input
            className="auth-input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="010-1234-5678"
            aria-label="휴대폰 번호"
            value={formatPhone(phone)}
            onChange={(e) => {
              setMsg('');
              setPhone(digitsOnly(e.target.value));
            }}
            autoFocus
          />
          <p className="auth-help">인증번호를 문자로 보내 드려요</p>
          {notice}
          <div className="auth-bottom">
            <button type="submit" className="auth-primary" disabled={!isValidPhone(phone) || busy}>
              {busy ? '보내는 중…' : '인증번호 받기'}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  if (step === 'otp') {
    const boxes = Array.from({ length: 6 }, (_, i) => code[i] ?? '');
    return (
      <AuthShell>
        <h1 className="auth-title">인증번호 6자리를 입력해 주세요</h1>
        <p className="auth-sub">{maskPhone(phone)}로 보냈어요</p>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <label className="otp" onClick={() => otpRef.current?.focus()}>
            <input
              ref={otpRef}
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-label="인증번호 6자리"
              value={code}
              onChange={(e) => {
                setMsg('');
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              }}
            />
            {boxes.map((d, i) => (
              <span key={i} className={`otp-box ${i === Math.min(code.length, 5) ? 'active' : ''}`}>
                {d}
              </span>
            ))}
          </label>
          <div className="otp-row">
            <button
              type="button"
              className="otp-resend"
              disabled={busy || resendLeft > 0}
              onClick={() => sendCode(true)}
            >
              인증번호 다시 받기{resendLeft > 0 ? ` (${resendLeft}초)` : ''}
            </button>
            {otpDeadline !== null && <span className="otp-timer">{mmss(otpLeft)}</span>}
          </div>
          {notice}
          <div className="auth-bottom">
            <button type="submit" className="auth-primary" disabled={code.length !== 6 || busy}>
              {busy ? '확인 중…' : '확인'}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  if (step === 'signup') {
    const allAgreed = agree.terms && agree.privacy;
    return (
      <AuthShell>
        <h1 className="auth-title">처음 오셨네요</h1>
        <p className="auth-sub">차 화면에 보일 이름을 정해 주세요</p>
        <div className="chips" role="radiogroup" aria-label="이름">
          {NAMES.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={!custom && name === n}
              className={`chip ${!custom && name === n ? 'on' : ''}`}
              onClick={() => {
                setCustom(false);
                setName(n);
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={custom}
            className={`chip ${custom ? 'on' : ''}`}
            onClick={() => {
              setCustom(true);
              setName('');
            }}
          >
            직접 입력
          </button>
        </div>
        {custom && (
          <input
            className="auth-input small"
            placeholder="예: 이모, 삼촌"
            aria-label="이름 직접 입력"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        )}
        <div className="agree-box">
          <label className="agree-row all">
            <input
              type="checkbox"
              checked={allAgreed}
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
              <button type="button" className="agree-view" onClick={() => setViewing(key)}>
                보기
              </button>
            </div>
          ))}
        </div>
        <p className="auth-help">아이 정보와 보호자 동의는 차 화면의 초기 설정에서 받아요.</p>
        {notice}
        <div className="auth-bottom">
          <button type="button" className="auth-primary" disabled={!allAgreed || !name.trim() || busy} onClick={signUp}>
            {busy ? '처리 중…' : '동의하고 계속'}
          </button>
        </div>
        {viewing && (
          <div className="sheet-backdrop" onClick={() => setViewing(null)}>
            <div className="time-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" aria-hidden="true" />
              <h3>{viewing === 'terms' ? '서비스 이용약관' : '개인정보 수집·이용'}</h3>
              <p className="sheet-sub terms-text">
                {/* TODO: 확정된 약관 전문 또는 URL 연결 */}
                약관 전문은 서비스 정책 확정 후 연결돼요.
              </p>
              <div className="sheet-actions single">
                <button type="button" className="primary" onClick={() => setViewing(null)}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthShell>
    );
  }

  // approve
  const match = (info?.matchCode ?? '').split('');
  return (
    <AuthShell>
      <h1 className="auth-title">이 차에서 로그인할까요?</h1>
      <p className="auth-sub">{[info?.userName, info?.maskedPhone].filter(Boolean).join(' · ') || '로그인한 계정'}</p>
      <p className="match-label">차 화면의 숫자와 같은지 확인해 주세요</p>
      <div className="match-code" aria-label={`확인 숫자 ${info?.matchCode ?? ''}`}>
        {match.length ? match.map((d, i) => <span key={i}>{d}</span>) : <span className="dim">----</span>}
      </div>
      <button type="button" className="text-link" onClick={switchAccount} disabled={busy}>
        다른 번호로 로그인
      </button>
      {notice}
      <div className="auth-bottom stack">
        <button type="button" className="auth-primary" disabled={busy} onClick={approve}>
          {busy ? '처리 중…' : '로그인 허용'}
        </button>
        <button type="button" className="auth-secondary" disabled={busy} onClick={cancel}>
          취소
        </button>
      </div>
    </AuthShell>
  );
}
