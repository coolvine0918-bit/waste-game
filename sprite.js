/**
 * Sprite Sheet Data and Helper
 * Image: watermarked_img_2134683446226006262.png (2400 x 1792)
 */

export const SPRITE_IMAGE_PATH = 'watermarked_img_2134683446226006262.png';
export const ORIGINAL_WIDTH = 2400;
export const ORIGINAL_HEIGHT = 1792;

// 4종 분리수거함
export const BINS = {
  plastic: {
    id: 'plastic',
    name: '플라스틱',
    color: '#3498db',
    rect: { x: 110, y: 40, w: 470, h: 500 }
  },
  paper: {
    id: 'paper',
    name: '종이',
    color: '#f1c40f',
    rect: { x: 680, y: 40, w: 480, h: 500 }
  },
  can: {
    id: 'can',
    name: '캔/고철',
    color: '#2ecc71',
    rect: { x: 1250, y: 40, w: 480, h: 500 }
  },
  trash: {
    id: 'trash',
    name: '일반쓰레기',
    color: '#e74c3c',
    rect: { x: 1820, y: 40, w: 490, h: 500 }
  }
};

// 마스코트 갈색 토이푸들 3종 표정
export const MASCOTS = {
  idle: {
    id: 'idle',
    name: '기본 미소',
    rect: { x: 90, y: 1330, w: 400, h: 420 }
  },
  wrong: {
    id: 'wrong',
    name: '걱정/오답',
    rect: { x: 540, y: 1330, w: 400, h: 420 }
  },
  correct: {
    id: 'correct',
    name: '환호/정답',
    rect: { x: 1000, y: 1330, w: 400, h: 420 }
  }
};

// UI 에셋 (시상대 및 폭죽)
export const UI_ASSETS = {
  podium: {
    id: 'podium',
    rect: { x: 1420, y: 1430, w: 480, h: 320 }
  },
  confetti: {
    id: 'confetti',
    rect: { x: 1920, y: 1420, w: 380, h: 320 }
  }
};

// 20종 쓰레기 객체 정의 (카테고리별 5개씩 균형 배치)
export const ITEMS = [
  // [플라스틱 5종]
  {
    id: 'pet_bottle',
    name: '구겨진 페트병',
    bin: 'plastic',
    rect: { x: 90, y: 530, w: 180, h: 220 },
    tip: '라벨을 떼고 압착해서 플라스틱으로!'
  },
  {
    id: 'plastic_cup',
    name: '일회용 플라스틱 컵',
    bin: 'plastic',
    rect: { x: 350, y: 540, w: 190, h: 200 },
    tip: '깨끗이 씻은 투명 플라스틱 컵'
  },
  {
    id: 'shampoo',
    name: '샴푸 펌프 용기',
    bin: 'plastic',
    rect: { x: 640, y: 530, w: 180, h: 220 },
    tip: '내용물을 비우고 헹궈서 플라스틱으로!'
  },
  {
    id: 'toy',
    name: '플라스틱 장난감',
    bin: 'plastic',
    rect: { x: 900, y: 540, w: 220, h: 200 },
    tip: '순수 플라스틱 재질 소형 장난감'
  },
  {
    id: 'spray_cap',
    name: '부탄가스 플라스틱 캡',
    bin: 'plastic',
    rect: { x: 1880, y: 850, w: 140, h: 150 },
    tip: '캔 본체와 분리한 플라스틱 뚜껑!'
  },

  // [종이 5종]
  {
    id: 'newspaper',
    name: '구겨진 신문지',
    bin: 'paper',
    rect: { x: 1180, y: 540, w: 240, h: 200 },
    tip: '비에 젖지 않게 묶어서 종이류로!'
  },
  {
    id: 'cardboard',
    name: '종이 상자',
    bin: 'paper',
    rect: { x: 1460, y: 530, w: 290, h: 210 },
    tip: '테이프와 송장을 떼고 납작하게 접어요!'
  },
  {
    id: 'paper_cup',
    name: '종이컵',
    bin: 'paper',
    rect: { x: 1840, y: 540, w: 180, h: 200 },
    tip: '물로 가볍게 헹군 뒤 종이류로 배출!'
  },
  {
    id: 'milk_carton',
    name: '우유갑',
    bin: 'paper',
    rect: { x: 2100, y: 530, w: 210, h: 210 },
    tip: '물로 헹구고 말려 펼쳐서 종이팩/종이류로!'
  },
  {
    id: 'small_box',
    name: '종이 포장 상자',
    bin: 'paper',
    rect: { x: 670, y: 840, w: 180, h: 170 },
    tip: '작은 상자도 종이 재활용 대상!'
  },

  // [캔/고철 5종]
  {
    id: 'red_can',
    name: '음료수 알루미늄 캔',
    bin: 'can',
    rect: { x: 110, y: 840, w: 160, h: 180 },
    tip: '내용물 비우고 찌그러뜨려 캔/고철로!'
  },
  {
    id: 'silver_can',
    name: '은색 캔',
    bin: 'can',
    rect: { x: 370, y: 850, w: 160, h: 170 },
    tip: '속을 비우고 캔류로 쏙!'
  },
  {
    id: 'cola_can',
    name: '알루미늄 콜라 캔',
    bin: 'can',
    rect: { x: 1060, y: 840, w: 150, h: 190 },
    tip: '시원하게 마신 캔은 캔/고철 수거함으로!'
  },
  {
    id: 'tuna_can',
    name: '참치캔',
    bin: 'can',
    rect: { x: 1330, y: 850, w: 200, h: 160 },
    tip: '기름기를 물로 헹구어 캔/고철류로!'
  },
  {
    id: 'butane',
    name: '부탄가스통',
    bin: 'can',
    rect: { x: 1630, y: 820, w: 150, h: 200 },
    tip: '가스 배출 후 구멍을 뚫어 캔/고철로!'
  },

  // [일반쓰레기 5종]
  {
    id: 'banana',
    name: '바나나 껍질',
    bin: 'trash',
    rect: { x: 80, y: 1040, w: 210, h: 190 },
    tip: '수거함 4종(플라스틱/종이/캔/일반) 중 일반쓰레기!'
  },
  {
    id: 'bone',
    name: '먹다 남은 뼈',
    bin: 'trash',
    rect: { x: 660, y: 1040, w: 210, h: 190 },
    tip: '사료나 비료가 될 수 없는 단단한 뼈는 일반쓰레기!'
  },
  {
    id: 'tissue',
    name: '사용한 휴지',
    bin: 'trash',
    rect: { x: 970, y: 1040, w: 200, h: 190 },
    tip: '오염된 종이와 휴지는 재활용 불가 일반쓰레기!'
  },
  {
    id: 'ceramic',
    name: '깨진 도자기 조각',
    bin: 'trash',
    rect: { x: 1270, y: 1040, w: 220, h: 190 },
    tip: '도자기와 유리는 재활용 불가 일반쓰레기(불연성)!'
  },
  {
    id: 'receipt',
    name: '영수증',
    bin: 'trash',
    rect: { x: 1600, y: 990, w: 180, h: 230 },
    tip: '염료가 묻은 감열지 영수증은 종이 재활용 불가! 일반쓰레기!'
  }
];

/**
 * 특정 엘리먼트에 스프라이트 스타일을 적용하는 함수
 * @param {HTMLElement} element 
 * @param {{x: number, y: number, w: number, h: number}} rect 
 * @param {number} targetWidth - 표시할 너비(px)
 * @param {number} targetHeight - 표시할 높이(px)
 */
export function applySprite(element, rect, targetWidth, targetHeight) {
  if (!element || !rect) return;

  // 원본 박스 크기 대비 타겟 표시 크기의 스케일 비율 계산
  const scaleX = targetWidth / rect.w;
  const scaleY = targetHeight / rect.h;
  // 비율 유지 모드
  const scale = Math.min(scaleX, scaleY);

  const bgWidth = ORIGINAL_WIDTH * scale;
  const bgHeight = ORIGINAL_HEIGHT * scale;

  // 잘라낼 영역을 컨테이너 중앙에 맞춤
  const offsetX = (targetWidth - rect.w * scale) / 2;
  const offsetY = (targetHeight - rect.h * scale) / 2;

  const posX = -rect.x * scale + offsetX;
  const posY = -rect.y * scale + offsetY;

  element.style.backgroundImage = `url('${SPRITE_IMAGE_PATH}')`;
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
  element.style.backgroundPosition = `${posX}px ${posY}px`;
}
