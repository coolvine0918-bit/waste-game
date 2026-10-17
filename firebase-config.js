/**
 * Firebase Realtime Database Configuration
 * 
 * 교실에서 여러 스마트폰/태블릿 간 실시간 멀티플레이를 위해
 * Firebase Console에서 생성한 Realtime Database 설정을 여기에 입력하세요.
 * 
 * 웹 화면의 우측 상단 ⚙️ 설정 버튼을 통해서도 언제든 입력 및 수정이 가능합니다.
 */

export const DEFAULT_FIREBASE_CONFIG = {
  databaseURL: "https://waste-game-87be1-default-rtdb.firebaseio.com",
  projectId: "waste-game-87be1",
  apiKey: "",
  appId: ""
};

/**
 * URL 형식 정규화 및 오류 자동 교정
 * @param {string} url 
 * @returns {string|null}
 */
export function sanitizeFirebaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim();

  // 중복된 https:// 패턴이 들어간 경우 (예: https://.../https://...)
  const match = clean.match(/https:\/\/[a-zA-Z0-9-]+(?:-default-rtdb)?\.[a-z0-9.]+\.com/);
  if (match) {
    clean = match[0];
  }

  // 끝에 슬래시 제거
  clean = clean.replace(/\/+$/, '');

  // https:// 로 시작하는지 검증
  if (!clean.startsWith('https://')) {
    return null;
  }

  return clean;
}

/**
 * 활성화된 Firebase 설정을 가져옵니다.
 * 1. localStorage에 저장된 사용자 설정 우선 (유효한 경우만)
 * 2. 잘못된 URL이 저장되어 있으면 정리 후 DEFAULT_FIREBASE_CONFIG 사용
 */
export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('firebase_custom_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.databaseURL) {
        const sanitizedUrl = sanitizeFirebaseUrl(parsed.databaseURL);
        if (sanitizedUrl) {
          parsed.databaseURL = sanitizedUrl;
          return parsed;
        } else {
          // 잘못된 URL이 저장되어 있었으므로 잘못된 캐시 제거
          console.warn('[FirebaseConfig] Invalid databaseURL in localStorage. Clearing corrupt config.');
          localStorage.removeItem('firebase_custom_config');
        }
      }
    }
  } catch (e) {
    console.warn('[FirebaseConfig] Error reading saved firebase config:', e);
    try { localStorage.removeItem('firebase_custom_config'); } catch (_) {}
  }

  const defaultUrl = sanitizeFirebaseUrl(DEFAULT_FIREBASE_CONFIG.databaseURL);
  if (defaultUrl) {
    return {
      ...DEFAULT_FIREBASE_CONFIG,
      databaseURL: defaultUrl
    };
  }

  return null;
}
