import { BINS, MASCOTS, UI_ASSETS, ITEMS, applySprite } from './sprite.js';
import { sound } from './sound.js';
import { multiplay } from './firebase-sync.js';

class WasteGame {
  constructor() {
    this.currentRound = 1;
    this.maxRounds = 20;
    this.score = 0;
    this.currentItem = null;
    this.timerInterval = null;
    this.remainingTime = 5000; // 5 seconds in ms
    this.timerStartTime = 0;
    this.isAnswering = false;

    // Draggable card pointer state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.currentTranslateX = 0;
    this.currentTranslateY = 0;

    this.roundItemsList = [];
    this.playersList = [];

    this.initElements();
    this.bindEvents();
    this.initSprites();
    this.loadFirebaseConfigFromStorage();
  }

  initElements() {
    // Screens
    this.screenLobby = document.getElementById('screen-lobby');
    this.screenGame = document.getElementById('screen-game');
    this.screenPodium = document.getElementById('screen-podium');

    // Header & Badges
    this.currentRoomText = document.getElementById('current-room-text');
    this.modeBadge = document.getElementById('mode-badge');
    this.btnSound = document.getElementById('btn-sound');
    this.btnFirebaseModal = document.getElementById('btn-firebase-modal');

    // Lobby
    this.inputNickname = document.getElementById('input-nickname');
    this.inputRoom = document.getElementById('input-room');
    this.btnEnterRoom = document.getElementById('btn-enter-room');
    this.lobbyRoomArea = document.getElementById('lobby-room-area');
    this.playerCount = document.getElementById('player-count');
    this.playerListGrid = document.getElementById('player-list-grid');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.lobbyPoodle = document.getElementById('lobby-poodle');

    // Game
    this.gameRoundText = document.getElementById('game-round-text');
    this.gameScoreText = document.getElementById('game-score-text');
    this.gamePoodle = document.getElementById('game-poodle');
    this.poodleBubble = document.getElementById('poodle-bubble');
    this.miniLeaderboardList = document.getElementById('mini-leaderboard-list');
    this.timerGauge = document.getElementById('timer-gauge');
    this.timerSecondsText = document.getElementById('timer-seconds-text');

    this.gameArena = document.getElementById('game-arena');
    this.dragItemCard = document.getElementById('drag-item-card');
    this.itemSprite = document.getElementById('item-sprite');
    this.itemName = document.getElementById('item-name');
    this.floatingScoreContainer = document.getElementById('floating-score-container');
    this.binSlots = document.querySelectorAll('.bin-slot');

    // Podium
    this.podiumPlayer1 = document.getElementById('podium-player-1');
    this.podiumPlayer2 = document.getElementById('podium-player-2');
    this.podiumPlayer3 = document.getElementById('podium-player-3');
    this.spritePodiumAsset = document.getElementById('sprite-podium-asset');
    this.myFinalScore = document.getElementById('my-final-score');
    this.myFinalRank = document.getElementById('my-final-rank');
    this.myFinalBadge = document.getElementById('my-final-badge');
    this.fullLeaderboardBody = document.getElementById('full-leaderboard-body');
    this.btnReturnLobby = document.getElementById('btn-return-lobby');

    // Modal
    this.modalFirebase = document.getElementById('modal-firebase');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnSaveFirebase = document.getElementById('btn-save-firebase');
    this.btnResetFirebase = document.getElementById('btn-reset-firebase');
    this.fbDatabaseUrl = document.getElementById('fb-database-url');
    this.fbApiKey = document.getElementById('fb-api-key');
    this.fbProjectId = document.getElementById('fb-project-id');
    this.fbAppId = document.getElementById('fb-app-id');
  }

  initSprites() {
    // 1. Lobby Poodle Idle
    applySprite(this.lobbyPoodle, MASCOTS.idle.rect, 90, 95);

    // 2. Game Poodle Idle
    this.setPoodleMood('idle', '준비... 출발!');

    // 3. 4 Bins
    applySprite(document.getElementById('bin-sprite-plastic'), BINS.plastic.rect, 85, 90);
    applySprite(document.getElementById('bin-sprite-paper'), BINS.paper.rect, 85, 90);
    applySprite(document.getElementById('bin-sprite-can'), BINS.can.rect, 85, 90);
    applySprite(document.getElementById('bin-sprite-trash'), BINS.trash.rect, 85, 90);

    // 4. Podium Sprite Asset
    applySprite(this.spritePodiumAsset, UI_ASSETS.podium.rect, 240, 160);
  }

  bindEvents() {
    // Sound Toggle
    this.btnSound.addEventListener('click', () => {
      const muted = sound.toggleMute();
      this.btnSound.textContent = muted ? '🔇' : '🔊';
    });

    // Enter Room in Lobby
    this.btnEnterRoom.addEventListener('click', () => {
      this.handleEnterRoom();
    });

    // Start Game Button in Lobby
    this.btnStartGame.addEventListener('click', () => {
      sound.playGameStart();
      multiplay.broadcastGameStart();
    });

    // Return to Lobby Button
    this.btnReturnLobby.addEventListener('click', () => {
      this.showScreen('lobby');
    });

    // Firebase Modal Open/Close
    this.btnFirebaseModal.addEventListener('click', () => {
      this.modalFirebase.classList.add('active');
    });
    this.btnCloseModal.addEventListener('click', () => {
      this.modalFirebase.classList.remove('active');
    });
    this.btnSaveFirebase.addEventListener('click', () => {
      this.handleSaveFirebaseConfig();
    });
    this.btnResetFirebase.addEventListener('click', () => {
      localStorage.removeItem('firebase_custom_config');
      location.reload();
    });

    // Pointer Drag Events for Mobile & Desktop
    this.bindDragEvents();

    // Multiplay sync listeners
    multiplay.onPlayersChange((players) => {
      this.playersList = players;
      this.renderPlayerList(players);
      this.renderLeaderboard(players);
    });

    multiplay.onGameStateChange((state) => {
      if (state.status === 'playing') {
        if (!this.screenGame.classList.contains('active')) {
          this.startGameFlow();
        }
      } else if (state.status === 'podium') {
        if (!this.screenPodium.classList.contains('active')) {
          this.showPodiumScreen();
        }
      }
    });

    // Resize recalculation for sprite rendering
    window.addEventListener('resize', () => {
      if (this.currentItem) {
        applySprite(this.itemSprite, this.currentItem.rect, 100, 100);
      }
    });
  }

  showScreen(screenName) {
    this.screenLobby.classList.remove('active');
    this.screenGame.classList.remove('active');
    this.screenPodium.classList.remove('active');

    if (screenName === 'lobby') {
      this.screenLobby.classList.add('active');
    } else if (screenName === 'game') {
      this.screenGame.classList.add('active');
    } else if (screenName === 'podium') {
      this.screenPodium.classList.add('active');
    }
  }

  handleEnterRoom() {
    const nick = this.inputNickname.value.trim() || '환경지킴이';
    const room = this.inputRoom.value.trim() || 'class1';

    multiplay.setPlayerInfo(nick, room);
    multiplay.joinRoom(false);

    this.currentRoomText.textContent = room;
    this.lobbyRoomArea.style.display = 'block';
    this.btnEnterRoom.textContent = '방 접속 완료 ✅';
    this.btnEnterRoom.disabled = true;

    sound.playPickup();
  }

  renderPlayerList(players) {
    if (!this.playerCount) return;
    this.playerCount.textContent = players.length;
    this.playerListGrid.innerHTML = '';

    players.forEach(p => {
      const tag = document.createElement('div');
      tag.className = 'player-tag' + (p.id === multiplay.playerId ? ' self' : '');
      tag.innerHTML = `<span>👤</span> <span>${this.escapeHtml(p.name)}</span>`;
      this.playerListGrid.appendChild(tag);
    });
  }

  startGameFlow() {
    this.currentRound = 1;
    this.score = 0;
    this.gameScoreText.textContent = this.score;
    this.gameRoundText.textContent = this.currentRound;

    // Shuffle 20 items for rounds
    this.roundItemsList = [...ITEMS].sort(() => 0.5 - Math.random()).slice(0, this.maxRounds);

    this.showScreen('game');
    this.loadRoundItem();
  }

  loadRoundItem() {
    if (this.currentRound > this.maxRounds) {
      this.finishGame();
      return;
    }

    this.isAnswering = false;
    this.currentItem = this.roundItemsList[this.currentRound - 1] || ITEMS[0];

    // Reset Drag Card Position
    this.resetCardPosition();

    // Render Current Item Sprite
    applySprite(this.itemSprite, this.currentItem.rect, 100, 100);
    this.itemName.textContent = this.currentItem.name;
    this.gameRoundText.textContent = this.currentRound;

    // Reset Poodle Mood
    this.setPoodleMood('idle', '어디에 버려야 할까? 🤔');

    // Start 5-second Speed Timer
    this.startTimer();
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.remainingTime = 5000;
    this.timerStartTime = performance.now();
    this.timerGauge.style.width = '100%';
    this.timerGauge.classList.remove('urgent');
    this.timerSecondsText.textContent = '5.0';

    this.timerInterval = setInterval(() => {
      const elapsed = performance.now() - this.timerStartTime;
      this.remainingTime = Math.max(0, 5000 - elapsed);
      const percent = (this.remainingTime / 5000) * 100;
      this.timerGauge.style.width = `${percent}%`;
      this.timerSecondsText.textContent = (this.remainingTime / 1000).toFixed(1);

      if (this.remainingTime <= 1500) {
        this.timerGauge.classList.add('urgent');
        sound.playTick();
      }

      if (this.remainingTime <= 0) {
        clearInterval(this.timerInterval);
        this.handleTimeout();
      }
    }, 40);
  }

  handleTimeout() {
    if (this.isAnswering) return;
    this.isAnswering = true;

    // Penalty: -5
    this.score = Math.max(0, this.score - 5);
    this.gameScoreText.textContent = this.score;
    multiplay.updateScore(this.score, this.currentRound);

    sound.playWrong();
    this.triggerScreenShake();
    this.showFloatingScore(-5);
    this.setPoodleMood('wrong', '시간 초과! 5초가 다 지났어요 ⏰');

    // Advance to next round instantly
    setTimeout(() => {
      this.currentRound++;
      this.loadRoundItem();
    }, 450);
  }

  handleAnswer(selectedBinId) {
    if (this.isAnswering) return;
    this.isAnswering = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const isCorrect = (selectedBinId === this.currentItem.bin);

    if (isCorrect) {
      // +10 Points
      this.score += 10;
      this.gameScoreText.textContent = this.score;
      sound.playCorrect();
      this.showFloatingScore(+10);
      this.setPoodleMood('correct', '정답! 완벽해! 🎉');

      // Highlight target bin
      const binEl = document.querySelector(`.bin-slot[data-bin="${selectedBinId}"]`);
      if (binEl) {
        binEl.classList.add('drag-over');
        setTimeout(() => binEl.classList.remove('drag-over'), 300);
      }
    } else {
      // -5 Points
      this.score = Math.max(0, this.score - 5);
      this.gameScoreText.textContent = this.score;
      sound.playWrong();
      this.triggerScreenShake();
      this.showFloatingScore(-5);
      this.setPoodleMood('wrong', this.currentItem.tip || '다시 확인해 봐요!');
    }

    multiplay.updateScore(this.score, this.currentRound);

    // Proceed to next round immediately
    setTimeout(() => {
      this.currentRound++;
      this.loadRoundItem();
    }, 420);
  }

  setPoodleMood(mood, speech) {
    const mascot = MASCOTS[mood] || MASCOTS.idle;
    applySprite(this.gamePoodle, mascot.rect, 55, 58);
    if (speech) {
      this.poodleBubble.textContent = speech;
    }
  }

  showFloatingScore(amount) {
    const el = document.createElement('div');
    el.className = `floating-text ${amount > 0 ? 'plus' : 'minus'}`;
    el.textContent = amount > 0 ? `+${amount}` : `${amount}`;
    this.floatingScoreContainer.innerHTML = '';
    this.floatingScoreContainer.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  triggerScreenShake() {
    this.screenGame.classList.add('screen-shake');
    setTimeout(() => {
      this.screenGame.classList.remove('screen-shake');
    }, 450);
  }

  // ==========================================
  // Touch & Pointer Drag Events Implementation
  // ==========================================
  bindDragEvents() {
    const card = this.dragItemCard;

    const onPointerDown = (e) => {
      if (this.isAnswering) return;
      this.isDragging = true;
      card.setPointerCapture(e.pointerId);
      card.classList.add('dragging');

      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.currentTranslateX = 0;
      this.currentTranslateY = 0;

      sound.playPickup();
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.currentTranslateX = dx;
      this.currentTranslateY = dy;
      card.style.transform = `translate(${dx}px, ${dy}px) scale(1.1) rotate(${dx * 0.05}deg)`;

      // Check hover over bins
      this.checkBinHover(e.clientX, e.clientY);
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      card.classList.remove('dragging');
      try { card.releasePointerCapture(e.pointerId); } catch (err) {}

      // Identify dropped bin
      const droppedBin = this.getBinUnderPoint(e.clientX, e.clientY);
      this.clearBinHover();

      if (droppedBin) {
        this.handleAnswer(droppedBin);
      } else {
        this.resetCardPosition();
      }
    };

    card.addEventListener('pointerdown', onPointerDown);
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', onPointerUp);
    card.addEventListener('pointercancel', onPointerUp);
  }

  resetCardPosition() {
    this.currentTranslateX = 0;
    this.currentTranslateY = 0;
    this.dragItemCard.style.transform = 'translate(0px, 0px)';
  }

  checkBinHover(x, y) {
    this.binSlots.forEach(slot => {
      const rect = slot.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        slot.classList.add('drag-over');
      } else {
        slot.classList.remove('drag-over');
      }
    });
  }

  clearBinHover() {
    this.binSlots.forEach(slot => slot.classList.remove('drag-over'));
  }

  getBinUnderPoint(x, y) {
    for (const slot of this.binSlots) {
      const rect = slot.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return slot.dataset.bin;
      }
    }
    return null;
  }

  // ==========================================
  // Realtime Mini & Full Leaderboard Sync
  // ==========================================
  renderLeaderboard(players) {
    if (!players || !players.length) return;

    // Sort by score descending
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

    // Top 5 Mini-leaderboard
    if (this.miniLeaderboardList) {
      this.miniLeaderboardList.innerHTML = '';
      sorted.slice(0, 5).forEach((p, idx) => {
        const li = document.createElement('li');
        if (p.id === multiplay.playerId) li.classList.add('me');
        li.innerHTML = `
          <span>${idx + 1}위. ${this.escapeHtml(p.name)}</span>
          <span>${p.score || 0}점</span>
        `;
        this.miniLeaderboardList.appendChild(li);
      });
    }

    // Full Leaderboard in Podium
    if (this.fullLeaderboardBody) {
      this.fullLeaderboardBody.innerHTML = '';
      sorted.forEach((p, idx) => {
        const tr = document.createElement('tr');
        if (p.id === multiplay.playerId) tr.classList.add('me-row');
        tr.innerHTML = `
          <td><strong>${idx + 1}위</strong></td>
          <td>${this.escapeHtml(p.name)} ${p.id === multiplay.playerId ? '(나)' : ''}</td>
          <td><strong>${p.score || 0}점</strong></td>
        `;
        this.fullLeaderboardBody.appendChild(tr);
      });
    }
  }

  finishGame() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    multiplay.updateScore(this.score, this.maxRounds);
    multiplay.broadcastGameOver();
    this.showPodiumScreen();
  }

  showPodiumScreen() {
    this.showScreen('podium');
    sound.playFanfare();

    // Trigger celebratory confetti fireworks!
    if (window.confetti) {
      window.confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        window.confetti({
          particleCount: 80,
          angle: 60,
          spread: 70,
          origin: { x: 0 }
        });
        window.confetti({
          particleCount: 80,
          angle: 120,
          spread: 70,
          origin: { x: 1 }
        });
      }, 500);
    }

    // Sort players for podium
    const sorted = [...this.playersList].sort((a, b) => (b.score || 0) - (a.score || 0));

    // Update 1st, 2nd, 3rd
    this.setPodiumPlayer(this.podiumPlayer1, sorted[0]);
    this.setPodiumPlayer(this.podiumPlayer2, sorted[1]);
    this.setPodiumPlayer(this.podiumPlayer3, sorted[2]);

    // My Final Summary
    this.myFinalScore.textContent = `${this.score}점`;
    const myRank = sorted.findIndex(p => p.id === multiplay.playerId) + 1;
    this.myFinalRank.textContent = myRank > 0 ? `${myRank}위` : '1위';

    // Title / Badge
    if (this.score >= 170) {
      this.myFinalBadge.textContent = '👑 지구 수호 챔피언';
    } else if (this.score >= 120) {
      this.myFinalBadge.textContent = '🌟 분리수거 마스터';
    } else if (this.score >= 70) {
      this.myFinalBadge.textContent = '🌿 친환경 실천가';
    } else {
      this.myFinalBadge.textContent = '🌱 분리수거 새싹';
    }

    this.renderLeaderboard(this.playersList);
  }

  setPodiumPlayer(element, player) {
    if (!element) return;
    const nameEl = element.querySelector('.podium-name');
    const scoreEl = element.querySelector('.podium-score');
    if (player) {
      nameEl.textContent = player.name;
      scoreEl.textContent = `${player.score || 0}점`;
    } else {
      nameEl.textContent = '-';
      scoreEl.textContent = '0점';
    }
  }

  // ==========================================
  // Firebase Configuration Management
  // ==========================================
  loadFirebaseConfigFromStorage() {
    try {
      const stored = localStorage.getItem('firebase_custom_config');
      if (stored) {
        const config = JSON.parse(stored);
        const success = multiplay.initFirebase(config);
        if (success) {
          this.modeBadge.textContent = '🔥 Firebase 실시간 연동';
          this.modeBadge.style.background = '#fff3e0';
          this.modeBadge.style.color = '#e65100';
        }
      }
    } catch (e) {
      console.warn('Failed to load Firebase config:', e);
    }
  }

  handleSaveFirebaseConfig() {
    const config = {
      databaseURL: this.fbDatabaseUrl.value.trim(),
      apiKey: this.fbApiKey.value.trim(),
      projectId: this.fbProjectId.value.trim(),
      appId: this.fbAppId.value.trim()
    };

    if (!config.databaseURL) {
      alert('Firebase Database URL을 입력해주세요.');
      return;
    }

    localStorage.setItem('firebase_custom_config', JSON.stringify(config));
    alert('Firebase 설정이 저장되었습니다. 페이지를 새로고침하여 연결합니다!');
    location.reload();
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }
}

// Instantiate game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.wasteGame = new WasteGame();
});
