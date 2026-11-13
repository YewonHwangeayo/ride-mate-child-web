import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function Brand() {
  return (
    <span className="brand" aria-label="Ridemate">
      R<span className="brand-dot" aria-hidden="true" />
      idemate
    </span>
  );
}

export function Shell({ children, label = '픽업 안내' }: { children: ReactNode; label?: string }) {
  return (
    <div className="page">
      <div className="shell">
        <header className="topbar">
          <Brand />
          <span className="top-label">{label}</span>
        </header>
        {children}
      </div>
    </div>
  );
}

export function StateScreen({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Shell>
      <div className="done-screen">
        <h2>{title}</h2>
        <p>{description}</p>
        {action}
      </div>
    </Shell>
  );
}

export function LoadingScreen() {
  return (
    <Shell>
      <div className="loading" role="status">
        <span className="spinner" aria-hidden="true" />
        픽업 정보를 불러오는 중이에요…
      </div>
    </Shell>
  );
}

/** C07 — 탑승완료.png */
export function BoardedScreen() {
  return (
    <Shell>
      <div className="done-screen">
        <div className="done-check">
          <Check size={34} strokeWidth={3.2} />
        </div>
        <h2>탑승 완료!</h2>
        <p>장소와 차 정보는 더 이상 보이지 않아요.</p>
        <div className="done-note">라이드메이트는 아이 위치를 모으지 않아요</div>
      </div>
    </Shell>
  );
}
