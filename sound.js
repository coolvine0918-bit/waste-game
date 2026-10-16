/**
 * Sound System powered by Web Audio API
 * No external audio files needed, zero latency & reliable.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2, pitchDecay = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (pitchDecay) {
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 정답 효과음 (맑고 경쾌한 3화음 딩-동-댕!)
  playCorrect() {
    if (this.isMuted) return;
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.22, 0.25);
      }, idx * 60);
    });
  }

  // 오답 및 타임아웃 효과음 (낮은 버저음)
  playWrong() {
    if (this.isMuted) return;
    this.init();
    this.playTone(180, 'sawtooth', 0.35, 0.3, true);
    setTimeout(() => {
      this.playTone(140, 'sawtooth', 0.4, 0.35, true);
    }, 120);
  }

  // 타이머 째깍 사운드
  playTick() {
    if (this.isMuted) return;
    this.init();
    this.playTone(800, 'square', 0.03, 0.05);
  }

  // 드래그 집어 들었을 때
  playPickup() {
    if (this.isMuted) return;
    this.init();
    this.playTone(400, 'sine', 0.08, 0.15);
  }

  // 게임 시작 카운트 휘슬
  playGameStart() {
    if (this.isMuted) return;
    this.init();
    const notes = [392.00, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.18, 0.25);
      }, idx * 100);
    });
  }

  // 시상대 팡파레
  playFanfare() {
    if (this.isMuted) return;
    this.init();
    const fanfareNotes = [
      { f: 523.25, d: 150 }, // C
      { f: 523.25, d: 150 }, // C
      { f: 523.25, d: 150 }, // C
      { f: 659.25, d: 450 }, // E
      { f: 587.33, d: 150 }, // D
      { f: 659.25, d: 150 }, // E
      { f: 783.99, d: 600 }  // G
    ];

    let delay = 0;
    fanfareNotes.forEach((item) => {
      setTimeout(() => {
        this.playTone(item.f, 'triangle', item.d / 1000, 0.3);
      }, delay);
      delay += item.d + 30;
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const sound = new SoundSystem();
