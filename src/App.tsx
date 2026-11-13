import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { ApiError, pickupApi } from './api';
import { PickupMap } from './Map';
import { MapCheck } from './MapCheck';
import { toKstLocal } from './time';
import { extractToken, isPickupToken, leavePath, pickupPath } from './token';
import { vehicleIfFresh } from './pickupStatus';
import { pickupQueryKey, usePickup, useServerNow } from './usePickup';
import { useGeolocation } from './useGeolocation';
import { BoardedScreen, LoadingScreen, Shell, StateScreen } from './components/Shell';
import { StatusCard, driverLabel } from './components/StatusCard';
import { DeparturePanel, LeaveButtons } from './components/LeaveControls';
import { TimeSheet } from './components/TimeSheet';
import type { Leave, Pickup } from './types';

type LeaveBody = { leaveNow: true } | { leaveDt: string };

function useUrlToken() {
  const loc = useLocation();
  return extractToken(loc.pathname, loc.search);
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 409 && String(e.code) === 'ALREADY_LEAVING') return '이미 출발해서 바꿀 수 없어요.';
    if (e.status === 409 || e.status === 404) return '픽업 링크 상태가 바뀌었어요. 화면을 새로 고칠게요.';
    if (e.status === 429) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    if (e.status === 400 || e.status === 415) return '선택한 시간을 다시 확인해 주세요.';
    if (e.status === 0) return e.message;
  }
  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

function PickupActive({ token }: { token: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const sheetOpen = location.pathname === '/leave';
  const qc = useQueryClient();
  const state = usePickup(token);
  const data = state.data;
  const { position, error: geoError } = useGeolocation(data?.linkStatus === 'ACTIVE');
  const now = useServerNow(data?.serverDt);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  const applyLeave = (leave: Leave) =>
    qc.setQueryData<Pickup>(pickupQueryKey(token), (old) => (old ? { ...old, leave } : old));

  const closeSheet = useCallback(() => navigate(pickupPath(token), { replace: true }), [navigate, token]);

  const onApiError = (e: unknown) => {
    setMessage(errorMessage(e));
    if (e instanceof ApiError && (e.status === 409 || e.status === 404)) {
      qc.invalidateQueries({ queryKey: pickupQueryKey(token) });
    }
  };

  const leave = useMutation({
    mutationFn: (body: LeaveBody) => pickupApi.leave(token, body),
    onSuccess: (res, body) => {
      // 서버가 확정한 값만 반영한다 (C06).
      applyLeave(res.data);
      setMessage('');
      closeSheet();
      showToast('leaveNow' in body ? '지금 나간다고 알렸어요' : '출발 시간을 알렸어요');
    },
    onError: onApiError,
  });
  const cancel = useMutation({
    mutationFn: () => pickupApi.cancel(token),
    onSuccess: (res) => {
      applyLeave(res.data);
      setMessage('');
      closeSheet();
      showToast('출발 시간을 취소했어요');
    },
    onError: onApiError,
  });

  if (state.isLoading) return <LoadingScreen />;
  if (state.error) {
    const notFound = state.error instanceof ApiError && state.error.status === 404;
    return (
      <StateScreen
        title={notFound ? '링크를 찾을 수 없어요' : '픽업 정보를 불러오지 못했어요'}
        description={
          notFound
            ? '문자로 받은 픽업 링크를 다시 확인해 주세요.'
            : '연결 상태를 확인하고 다시 시도해 주세요. 링크가 끝난 것은 아니에요.'
        }
        action={
          notFound ? undefined : (
            <button type="button" className="retry-btn" onClick={() => state.refetch()}>
              다시 시도
            </button>
          )
        }
      />
    );
  }
  if (!data) return <StateScreen title="픽업 정보가 없어요" description="잠시 후 다시 시도해 주세요." />;
  if (data.linkStatus === 'BOARDED') return <BoardedScreen />;
  if (data.linkStatus === 'CLOSED') {
    return <StateScreen title="이 링크는 끝났어요" description="새로운 안내 문자를 확인해 주세요." />;
  }

  const live: Pickup = { ...data, vehicle: vehicleIfFresh(data, now) };
  const driver = driverLabel(live);
  const leaveStatus = live.leave?.leaveStatus ?? 'NONE';
  const locked = leaveStatus === 'LEAVING';
  const pending = leave.isPending || cancel.isPending;
  const canCancel = leaveStatus === 'SCHEDULED' || leaveStatus === 'SOON';
  const hasDeparture = leaveStatus !== 'NONE';

  const leaveNow = () => {
    if (pending || locked) return;
    setMessage('');
    leave.mutate({ leaveNow: true });
  };
  const leaveIn5 = () => {
    if (pending || locked) return;
    setMessage('');
    leave.mutate({ leaveDt: toKstLocal(now + 5 * 60_000) });
  };
  const openSheet = () => {
    if (locked) return;
    setMessage('');
    navigate(leavePath(token), { replace: true });
  };

  return (
    <Shell>
      <div className={`pickup-main ${hasDeparture ? 'has-departure' : ''}`}>
        {state.unstable && (
          <div className="notice" role="status">
            <WifiOff size={15} /> 연결이 불안정해요. 정보를 다시 확인하고 있어요.
          </div>
        )}
        <StatusCard
          data={live}
          now={now}
          placeChanged={state.placeChanged}
          onAcknowledge={state.acknowledgePlaceChange}
        />
        <div className="map-panel">
          <PickupMap pickup={live} child={position} previous={state.previous} showLabels={state.placeChanged} />
        </div>
        {(geoError || !live.pickup || live.pickup.guideText || live.pickup.photoUrl) && (
          <div className="pickup-extra">
            {!live.pickup && <p className="hint">픽업 장소 정보가 아직 없어요.</p>}
            {live.pickup?.guideText && <p className="guide-text">{live.pickup.guideText}</p>}
            {live.pickup?.photoUrl && <img className="pickup-photo" src={live.pickup.photoUrl} alt="픽업 장소 사진" />}
            {geoError && <p className="hint">{geoError} 내 위치 없이도 안내를 볼 수 있어요.</p>}
          </div>
        )}
        {message && !sheetOpen && (
          <div className="notice error" role="alert">
            {message}
          </div>
        )}
        {hasDeparture ? (
          <DeparturePanel
            data={live}
            driver={driver}
            locked={locked}
            pending={pending}
            onLeaveNow={leaveNow}
            onLeaveIn5={leaveIn5}
            onPickTime={openSheet}
          />
        ) : (
          <div className="pickup-bottom">
            <LeaveButtons
              locked={locked}
              pending={pending}
              onLeaveNow={leaveNow}
              onLeaveIn5={leaveIn5}
              onPickTime={openSheet}
            />
          </div>
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {sheetOpen && !locked && (
        <TimeSheet
          now={now}
          driver={driver}
          arrivalDt={live.arrivalDt}
          plannedLeaveDt={live.leave?.plannedLeaveDt ?? null}
          pending={pending}
          canCancel={canCancel}
          error={message}
          onClose={closeSheet}
          onSubmit={(leaveDt) => leave.mutate({ leaveDt })}
          onCancelLeave={() => !pending && cancel.mutate()}
        />
      )}
    </Shell>
  );
}

function PickupFrame() {
  const token = useUrlToken();
  if (!token) {
    return (
      <StateScreen
        title="픽업 링크가 필요해요"
        description="문자로 받은 픽업 안내 링크를 열어 주세요. 이 화면만으로는 픽업 정보를 불러오지 않아요."
      />
    );
  }
  return <PickupActive token={token} />;
}

function TokenRedirect() {
  const loc = useLocation();
  const last = loc.pathname.split('/').filter(Boolean).at(-1) || '';
  if (isPickupToken(last)) return <Navigate to={pickupPath(last)} replace />;
  return <StateScreen title="페이지를 찾을 수 없어요" description="문자로 받은 픽업 링크를 다시 열어 주세요." />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PickupFrame />} />
      <Route element={<PickupFrame />}>
        <Route path="pickup" element={<></>} />
        <Route path="leave" element={<></>} />
      </Route>
      <Route path="/map-check" element={<MapCheck />} />
      <Route path="*" element={<TokenRedirect />} />
    </Routes>
  );
}
