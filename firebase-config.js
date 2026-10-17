/**
 * Firebase Realtime Database Configuration
 * 
 * 교실에서 여러 스마트폰/태블릿 간 실시간 멀티플레이를 위해
 * Firebase Console에서 생성한 Realtime Database 설정을 여기에 입력하세요.
 * 
 * 웹 화면의 우측 상단 ⚙️ 설정 버튼을 통해서도 언제든 입력 및 수정이 가능합니다.
 */

export const DEFAULT_FIREBASE_CONFIG = {
  // 여기에 본인의 Firebase 프로젝트 설정을 붙여넣으세요.
  // 예시:
  // apiKey: "AIzaSy...",
  // authDomain: "your-project.firebaseapp.com",
  // databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  // projectId: "your-project",
  // storageBucket: "your-project.appspot.com",
  // messagingSenderId: "123456789",
  // appId: "1:123456789:web:abcdef"
  databaseURL: "https://waste-game-87be1-default-rtdb.firebaseio.com/https://waste-game-87be1-default-rtdb.firebaseio.com/",
  apiKey: "",
  projectId: "",
  appId: ""
};

/**
 * 활성화된 Firebase 설정을 가져옵니다.
 * 1. localStorage에 저장된 사용자 설정 우선
 * 2. DEFAULT_FIREBASE_CONFIG 사용
 */
export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('firebase_custom_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.databaseURL) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved firebase config:', e);
  }

  if (DEFAULT_FIREBASE_CONFIG && DEFAULT_FIREBASE_CONFIG.databaseURL) {
    return DEFAULT_FIREBASE_CONFIG;
  }

  return null;
}
