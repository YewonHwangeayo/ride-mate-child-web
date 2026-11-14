let pending: Promise<any> | null = null;
export function loadKakao(): Promise<any> {
  if (pending) return pending;
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
  if (!key) return Promise.reject(new Error('카카오맵 키가 설정되지 않았습니다.'));
  pending = new Promise((resolve, reject) => {
    const existing = (window as any).kakao;
    if (existing?.maps?.Map) {
      resolve(existing);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      const k = (window as any).kakao;
      if (!k?.maps?.load) {
        reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'));
        return;
      }
      k.maps.load(() => resolve(k));
    };
    script.onerror = () => reject(new Error('카카오맵 로딩 실패: 키·도메인 등록을 확인해 주세요.'));
    document.head.appendChild(script);
  }).catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}
