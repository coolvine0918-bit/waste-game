import { BINS, MASCOTS, UI_ASSETS, ITEMS, applySprite } from './sprite.js?v=20261017_3';
import { sound } from './sound.js?v=20261017_3';
import { multiplay } from './firebase-sync.js?v=20261017_3';
import { getActiveFirebaseConfig, sanitizeFirebaseUrl, DEFAULT_FIREBASE_CONFIG } from './firebase-config.js?v=20261017_3';

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
    this.selectedRole = 'student'; // 'student' or 'teacher'
    this.hasJoinedLobby = false;

    this.initElements();
    this.bindEvents();
    this.initSprites();
    this.checkFirebaseStatus();
  }

  initElements() {
    // Screens
    this.screenLobby = document.getElementById('screen-lobby');
    this.screenGame = document.getElementById('screen-game');
    this.screenPodium = document.getElementById('screen-podium');

    // Header & Badges
    this.currentRoomText = document.getElementById('current-room-text');
    this.roleBadge = document.getElementById('role-badge');
    this.modeBadge = document.getElementById('mode-badge');
    this.btnSound = document.getElementById('btn-sound');
    this.btnFirebaseModal = document.getElementById('btn-firebase-modal');
    this.firebaseWarningBanner = document.getElementById('firebase-warning-banner');
    this.btnBannerConfig = document.getElementById('btn-banner-config');

    // Lobby Role Selector
    this.tabStudent = document.getElementById('tab-student');
    this.tabTeacher = document.getElementById('tab-teacher');
    this.labelNickname = document.getElementById('label-nickname');
    this.inputNickname = document.getElementById('input-nickname');
    this.inputRoom = document.getElementById('input-room');
    this.btnEnterRoom = document.getElementById('btn-enter-room');

    // Lobby Waiting Area
    this.lobbyRoomArea = document.getElementById('lobby-room-area');
    this.displayRoomCode = document.getElementById('display-room-code');
    this.playerCount = document.getElementById('player-count');
    this.hostTag = document.getElementById('host-tag');
    this.playerListGrid = document.getElementById('player-list-grid');
    this.teacherActionArea = document.getElementById('teacher-action-area');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.studentWaitingArea = document.getElementById('student-waiting-area');
    this.lobbyPoodle = document.getElementById('lobby-poodle');

    // Game Elements
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

    // Finished Overlay
    this.finishedOverlay = document.getElementById('finished-overlay');
    this.finishedMyScore = document.getElementById('finished-my-score');
    this.teacherForcePodium = document.getElementById('teacher-force-podium');
    this.btnForcePodium = document.getElementById('btn-force-podium');

    // Podium Elements
    this.podiumPlayer1 = document.getElementById('podium-player-1');
    this.podiumPlayer2 = document.getElementById('podium-player-2');
    this.podiumPlayer3 = document.getElementById('podium-player-3');
    this.spritePodiumAsset = document.getElementById('sprite-podium-asset');
    this.myFinalScore = document.getElementById('my-final-score');
    this.myFinalRank = document.getElementById('my-final-rank');
    this.myFinalBadge = document.getElementById('my-final-badge');
    this.fullRankCount = document.getElementById('full-rank-count');
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
    applySprite(this.lobbyPoodle, MASCOTS.idle.rect, 90, 95);
    this.setPoodleMood('idle', '준비... 출발!');

    applySprite(document.getElementById('bin-sprite-plastic'), BINS.plastic.rect, 85, 90);
    applySprite(document.getElementById('bin-sprite-paper'), BINS.paper.rect, 85, 90);
    applySprite(document.getElementById('bin-sprite-can'), BINS.can.rect, 85, 90);
    applySprite(document.getElementById('bin-sprite-trash'), BINS.trash.rect, 85, 90);

    applySprite(this.spritePodiumAsset, UI_ASSETS.podium.rect, 240, 160);
  }

  checkFirebaseStatus() {
    const config = getActiveFirebaseConfig();
    if (config && config.databaseURL) {
      this.fbDatabaseUrl.value = config.databaseURL || '';
      this.fbApiKey.value = config.apiKey || '';
      this.fbProjectId.value = config.projectId || '';
      this.fbAppId.value = config.appId || '';

      if (multiplay.isConnectedToServer) {
        this.setModeBadge('online');
      } else {
        this.setModeBadge('connecting');
      }
      this.firebaseWarningBanner.style.display = 'none';
    } else {
      this.setModeBadge('offline');
      this.firebaseWarningBanner.style.display = 'flex';
    }
  }

  setModeBadge(state) {
    this.modeBadge.className = 'badge mode-badge';
    if (state === 'online') {
      this.modeBadge.classList.add('status-online');
      this.modeBadge.textContent = '🟢 Firebase 온라인';
      this.firebaseWarningBanner.style.display = 'none';
    } else if (state === 'connecting') {
      this.modeBadge.classList.add('status-offline');
      this.modeBadge.textContent = '🟡 Firebase 연결 중...';
    } else {
      this.modeBadge.classList.add('status-offline');
      this.modeBadge.textContent = '⚠️ 가상 모드 (클릭하여 설정)';
      this.firebaseWarningBanner.style.display = 'flex';
    }
  }

  bindEvents() {
    // Sound Toggle
    this.btnSound.addEventListener('click', () => {
      const muted = sound.toggleMute();
      this.btnSound.textContent = muted ? '🔇' : '🔊';
    });

    // Mode Badge Click -> Open Firebase settings modal
    this.modeBadge.addEventListener('click', () => {
      this.modalFirebase.classList.add('active');
    });

    // Role Tab Switching
    this.tabStudent.addEventListener('click', () => this.switchRole('student'));
    this.tabTeacher.addEventListener('click', () => this.switchRole('teacher'));

    // Enter Room in Lobby
    this.btnEnterRoom.addEventListener('click', () => {
      this.handleEnterRoom();
    });

    // Start Game Button in Lobby (TEACHER ONLY)
    this.btnStartGame.addEventListener('click', () => {
      if (!multiplay.isTeacher()) {
        alert('게임 시작 권한은 선생님에게만 있습니다.');
        return;
      }
      sound.playGameStart();

      // 전체 학생이 동일한 20개 문제를 풀 수 있도록 인덱스 순서 생성
      const totalItems = ITEMS.length;
      const shuffledIndexes = [...Array(totalItems).keys()]
        .sort(() => 0.5 - Math.random())
        .slice(0, this.maxRounds);

      multiplay.broadcastGameStart(shuffledIndexes);
    });

    // Force Podium (Teacher in overlay)
    this.btnForcePodium.addEventListener('click', () => {
      multiplay.broadcastGameOver();
    });

    // Return to Lobby Button
    this.btnReturnLobby.addEventListener('click', () => {
      if (multiplay.isTeacher()) {
        multiplay.broadcastReturnToLobby();
      } else {
        this.showScreen('lobby');
      }
    });

    // Firebase Modal Open/Close
    const openModal = () => this.modalFirebase.classList.add('active');
    this.btnFirebaseModal.addEventListener('click', openModal);
    this.btnBannerConfig.addEventListener('click', openModal);

    this.btnCloseModal.addEventListener('click', () => {
      this.modalFirebase.classList.remove('active');
    });

    this.btnSaveFirebase.addEventListener('click', () => {
      this.handleSaveFirebaseConfig();
    });

    this.btnResetFirebase.addEventListener('click', () => {
      localStorage.removeItem('firebase_custom_config');
      alert('Firebase 설정이 기본 클라우드 설정으로 복원되었습니다! 페이지를 새로고침합니다.');
      location.reload();
    });

    // Pointer Drag Events for Mobile & Desktop
    this.bindDragEvents();

    // Multiplay sync listeners
    multiplay.onConnectionChange((status) => {
      if (status.online) {
        this.setModeBadge('online');
      } else if (status.ready) {
        this.setModeBadge('connecting');
      } else {
        this.setModeBadge('offline');
      }
    });

    multiplay.onPlayersChange((players) => {
      this.playersList = players;
      this.renderPlayerList(players);
      this.renderLeaderboard(players);
    });

    multiplay.onGameStateChange((state) => {
      if (state.status === 'playing') {
        // 대기실에 입장한 상태라면 교사이든 학생이든 즉시 게임 화면으로 진입!
        if (this.hasJoinedLobby && !this.screenGame.classList.contains('active')) {
          this.startGameFlow(state.itemOrder);
        }
      } else if (state.status === 'podium') {
        if (!this.screenPodium.classList.contains('active')) {
          this.showPodiumScreen();
        }
      } else if (state.status === 'lobby') {
        if (!this.screenLobby.classList.contains('active')) {
          this.showScreen('lobby');
          this.resetLobbyState();
        }
      }
    });

    multiplay.onError((err) => {
      console.warn('[MultiplaySync Error Alert]', err);
    });

    // Resize recalculation
    window.addEventListener('resize', () => {
      if (this.currentItem) {
        applySprite(this.itemSprite, this.currentItem.rect, 100, 100);
      }
    });
  }

  switchRole(role) {
    this.selectedRole = role;
    if (role === 'student') {
      this.tabStudent.classList.add('active');
      this.tabTeacher.classList.remove('active');
      this.labelNickname.textContent = '내 닉네임';
      this.inputNickname.value = '환경지킴이';
      this.btnEnterRoom.textContent = '대기실 입장하기 🚪';
      this.roleBadge.textContent = '학생';
      this.roleBadge.style.background = '#f3e5f5';
      this.roleBadge.style.color = '#7b1fa2';
    } else {
      this.tabTeacher.classList.add('active');
      this.tabStudent.classList.remove('active');
      this.labelNickname.textContent = '선생님 닉네임';
      this.inputNickname.value = '선생님';
      this.btnEnterRoom.textContent = '교사 대기실 열기 👑';
      this.roleBadge.textContent = '선생님 👑';
      this.roleBadge.style.background = '#fef3c7';
      this.roleBadge.style.color = '#b45309';
    }
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
    const nick = this.inputNickname.value.trim() || (this.selectedRole === 'teacher' ? '선생님' : '학생');
    const room = this.inputRoom.value.trim() || 'class1';

    this.hasJoinedLobby = true;
    multiplay.setPlayerInfo(nick, room, this.selectedRole);
    multiplay.joinRoom();

    this.currentRoomText.textContent = room;
    this.displayRoomCode.textContent = room;
    this.lobbyRoomArea.style.display = 'block';
    this.btnEnterRoom.textContent = '입장 완료 ✅';
    this.btnEnterRoom.disabled = true;
    this.inputNickname.disabled = true;
    this.inputRoom.disabled = true;
    this.tabStudent.disabled = true;
    this.tabTeacher.disabled = true;

    // Show Teacher actions ONLY to Teacher, Student waiting to Students
    if (this.selectedRole === 'teacher') {
      this.teacherActionArea.style.display = 'block';
      this.studentWaitingArea.style.display = 'none';
      this.hostTag.textContent = `진행자: ${nick} (나)`;
      this.teacherForcePodium.style.display = 'block';
    } else {
      this.teacherActionArea.style.display = 'none';
      this.studentWaitingArea.style.display = 'block';
      this.hostTag.textContent = '진행자: 선생님';
      this.teacherForcePodium.style.display = 'none';
    }

    sound.playPickup();
  }

  resetLobbyState() {
    this.finishedOverlay.style.display = 'none';
    this.btnEnterRoom.disabled = false;
    this.btnEnterRoom.textContent = (this.selectedRole === 'teacher') ? '교사 대기실 열기 👑' : '대기실 입장하기 🚪';
    this.inputNickname.disabled = false;
    this.inputRoom.disabled = false;
  }

  renderPlayerList(players) {
    if (!this.playerCount) return;
    this.playerCount.textContent = players.length;
    this.playerListGrid.innerHTML = '';

    players.forEach(p => {
      const tag = document.createElement('div');
      const isMe = (p.id === multiplay.playerId);
      const isTeacher = (p.role === 'teacher');
      
      tag.className = 'player-tag';
      if (isMe) tag.classList.add('self');
      if (isTeacher) tag.classList.add('teacher-tag');

      const icon = isTeacher ? '👑' : '👤';
      tag.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(p.name)} ${isMe ? '(나)' : ''}</span>`;
      this.playerListGrid.appendChild(tag);
    });
  }

  startGameFlow(itemOrder = null) {
    this.currentRound = 1;
    this.score = 0;
    this.gameScoreText.textContent = this.score;
    this.gameRoundText.textContent = this.currentRound;
    this.finishedOverlay.style.display = 'none';

    // 만약 선생님이 공유한 문제 순서가 있으면 동일하게 사용, 없으면 랜덤 셔플
    if (Array.isArray(itemOrder) && itemOrder.length > 0) {
      this.roundItemsList = itemOrder.map(idx => ITEMS[idx] || ITEMS[0]);
    } else {
      this.roundItemsList = [...ITEMS].sort(() => 0.5 - Math.random()).slice(0, this.maxRounds);
    }

    this.showScreen('game');
    this.loadRoundItem();
  }

  loadRoundItem() {
    if (this.currentRound > this.maxRounds) {
      this.handlePlayerFinished();
      return;
    }

    this.isAnswering = false;
    this.currentItem = this.roundItemsList[this.currentRound - 1] || ITEMS[0];

    // Reset Drag Card
    this.resetCardPosition();

    // Render Current Item Sprite
    applySprite(this.itemSprite, this.currentItem.rect, 100, 100);
    this.itemName.textContent = this.currentItem.name;
    this.gameRoundText.textContent = this.currentRound;

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

    this.score = Math.max(0, this.score - 5);
    this.gameScoreText.textContent = this.score;
    multiplay.updateScore(this.score, this.currentRound, false);

    sound.playWrong();
    this.triggerScreenShake();
    this.showFloatingScore(-5);
    this.setPoodleMood('wrong', '시간 초과! 5초가 다 지났어요 ⏰');

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
      this.score += 10;
      this.gameScoreText.textContent = this.score;
      sound.playCorrect();
      this.showFloatingScore(+10);
      this.setPoodleMood('correct', '정답! 완벽해! 🎉');

      const binEl = document.querySelector(`.bin-slot[data-bin="${selectedBinId}"]`);
      if (binEl) {
        binEl.classList.add('drag-over');
        setTimeout(() => binEl.classList.remove('drag-over'), 300);
      }
    } else {
      this.score = Math.max(0, this.score - 5);
      this.gameScoreText.textContent = this.score;
      sound.playWrong();
      this.triggerScreenShake();
      this.showFloatingScore(-5);
      this.setPoodleMood('wrong', this.currentItem.tip || '다시 확인해 봐요!');
    }

    multiplay.updateScore(this.score, this.currentRound, false);

    setTimeout(() => {
      this.currentRound++;
      this.loadRoundItem();
    }, 420);
  }

  handlePlayerFinished() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    multiplay.updateScore(this.score, this.maxRounds, true);

    this.finishedMyScore.textContent = this.score;
    this.finishedOverlay.style.display = 'flex';

    // If teacher, allow instant transition or wait for all
    if (multiplay.isTeacher()) {
      this.teacherForcePodium.style.display = 'block';
    }

    // Check if all players completed
    const students = this.playersList.filter(p => p.role !== 'teacher');
    const allFinished = students.length > 0 && students.every(p => p.completed === true);
    if (allFinished) {
      setTimeout(() => multiplay.broadcastGameOver(), 1200);
    }
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

  // Pointer Drag Events
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

      this.checkBinHover(e.clientX, e.clientY);
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      card.classList.remove('dragging');
      try { card.releasePointerCapture(e.pointerId); } catch (err) {}

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

  // Leaderboard & Podium
  renderLeaderboard(players) {
    if (!players || !players.length) return;

    // Filter students for student rankings
    const sorted = [...players]
      .filter(p => p.role !== 'teacher')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    // In-game Top 5
    if (this.miniLeaderboardList) {
      this.miniLeaderboardList.innerHTML = '';
      if (sorted.length === 0) {
        this.miniLeaderboardList.innerHTML = '<li><span>대기 중...</span></li>';
      } else {
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
    }

    // Full Table
    if (this.fullLeaderboardBody) {
      this.fullLeaderboardBody.innerHTML = '';
      this.fullRankCount.textContent = sorted.length;

      sorted.forEach((p, idx) => {
        const tr = document.createElement('tr');
        if (p.id === multiplay.playerId) tr.classList.add('me-row');
        tr.innerHTML = `
          <td><strong>${idx + 1}위</strong></td>
          <td>${this.escapeHtml(p.name)}</td>
          <td>${p.id === multiplay.playerId ? '<span class="badge room-badge">나</span>' : '학생'}</td>
          <td><strong>${p.score || 0}점</strong></td>
        `;
        this.fullLeaderboardBody.appendChild(tr);
      });
    }
  }

  showPodiumScreen() {
    this.finishedOverlay.style.display = 'none';
    this.showScreen('podium');
    sound.playFanfare();

    if (window.confetti) {
      window.confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => {
        window.confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 } });
        window.confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 } });
      }, 500);
    }

    const students = [...this.playersList]
      .filter(p => p.role !== 'teacher')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    this.setPodiumPlayer(this.podiumPlayer1, students[0]);
    this.setPodiumPlayer(this.podiumPlayer2, students[1]);
    this.setPodiumPlayer(this.podiumPlayer3, students[2]);

    this.myFinalScore.textContent = `${this.score}점`;
    const myRank = students.findIndex(p => p.id === multiplay.playerId) + 1;
    this.myFinalRank.textContent = myRank > 0 ? `${myRank}위` : '참여';

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

  handleSaveFirebaseConfig() {
    const rawUrl = this.fbDatabaseUrl.value.trim();
    const sanitizedUrl = sanitizeFirebaseUrl(rawUrl);

    if (!sanitizedUrl) {
      alert('올바른 Firebase Realtime Database URL을 입력해주세요!\n예: https://waste-game-87be1-default-rtdb.firebaseio.com');
      return;
    }

    const config = {
      databaseURL: sanitizedUrl,
      apiKey: this.fbApiKey.value.trim(),
      projectId: this.fbProjectId.value.trim() || 'waste-game-87be1',
      appId: this.fbAppId.value.trim()
    };

    localStorage.setItem('firebase_custom_config', JSON.stringify(config));
    alert('Firebase 설정이 저장되었습니다! 페이지를 새로고침하여 즉시 연결합니다.');
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

window.addEventListener('DOMContentLoaded', () => {
  window.wasteGame = new WasteGame();
});
