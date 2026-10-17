import { BINS, MASCOTS, UI_ASSETS, ITEMS, applySprite } from './sprite.js?v=20261017_4';
import { sound } from './sound.js?v=20261017_4';
import { multiplay } from './firebase-sync.js?v=20261017_4';
import { getActiveFirebaseConfig, sanitizeFirebaseUrl, DEFAULT_FIREBASE_CONFIG } from './firebase-config.js?v=20261017_4';

class WasteGame {
  constructor() {
    this.currentRound = 1;
    this.score = 0;
    this.currentItem = null;
    
    // 5-second per-item speed timer
    this.itemTimerInterval = null;
    this.remainingItemTime = 5000;
    this.itemTimerStartTime = 0;
    this.isAnswering = false;

    // 1-minute (60s) main game timer
    this.mainTimerInterval = null;
    this.gameDuration = 60; // 60 seconds
    this.gameStartedAt = 0;

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
    this.screenTeacherDashboard = document.getElementById('screen-teacher-dashboard');
    this.screenPodium = document.getElementById('screen-podium');

    // Header & Badges
    this.currentRoomText = document.getElementById('current-room-text');
    this.headerStudentCount = document.getElementById('header-student-count');
    this.roleBadge = document.getElementById('role-badge');
    this.modeBadge = document.getElementById('mode-badge');
    this.btnSound = document.getElementById('btn-sound');
    this.btnFirebaseModal = document.getElementById('btn-firebase-modal');
    this.firebaseWarningBanner = document.getElementById('firebase-warning-banner');
    this.btnBannerConfig = document.getElementById('btn-banner-config');

    // Lobby Elements
    this.tabStudent = document.getElementById('tab-student');
    this.tabTeacher = document.getElementById('tab-teacher');
    this.labelNickname = document.getElementById('label-nickname');
    this.inputNickname = document.getElementById('input-nickname');
    this.inputRoom = document.getElementById('input-room');
    this.btnEnterRoom = document.getElementById('btn-enter-room');

    this.lobbyRoomArea = document.getElementById('lobby-room-area');
    this.displayRoomCode = document.getElementById('display-room-code');
    this.playerCount = document.getElementById('player-count');
    this.lobbyStudentCount = document.getElementById('lobby-student-count');
    this.hostTag = document.getElementById('host-tag');
    this.playerListGrid = document.getElementById('player-list-grid');
    this.teacherActionArea = document.getElementById('teacher-action-area');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.studentWaitingArea = document.getElementById('student-waiting-area');
    this.lobbyPoodle = document.getElementById('lobby-poodle');

    // Student In-Game Elements
    this.mainTimerSeconds = document.getElementById('main-timer-seconds');
    this.mainTimerBar = document.getElementById('main-timer-bar');
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

    this.finishedOverlay = document.getElementById('finished-overlay');
    this.finishedMyScore = document.getElementById('finished-my-score');

    // Teacher Dashboard Elements
    this.dashRoomCode = document.getElementById('dash-room-code');
    this.dashStudentCount = document.getElementById('dash-student-count');
    this.teacherTimerSeconds = document.getElementById('teacher-timer-seconds');
    this.teacherTimerBar = document.getElementById('teacher-timer-bar');
    this.teacherScoreboardBody = document.getElementById('teacher-scoreboard-body');
    this.btnTeacherForceStop = document.getElementById('btn-teacher-force-stop');

    // Podium Elements
    this.podiumPlayer1 = document.getElementById('podium-player-1');
    this.podiumPlayer2 = document.getElementById('podium-player-2');
    this.podiumPlayer3 = document.getElementById('podium-player-3');
    this.spritePodiumAsset = document.getElementById('sprite-podium-asset');
    this.studentFinalSummary = document.getElementById('student-final-summary');
    this.teacherFinalSummary = document.getElementById('teacher-final-summary');
    this.myFinalScore = document.getElementById('my-final-score');
    this.myFinalRank = document.getElementById('my-final-rank');
    this.myFinalBadge = document.getElementById('my-final-badge');
    this.btnViewResults = document.getElementById('btn-view-results');
    this.btnReturnLobby = document.getElementById('btn-return-lobby');

    // Full Results Modal
    this.modalFullResults = document.getElementById('modal-full-results');
    this.btnCloseResults = document.getElementById('btn-close-results');
    this.btnConfirmResults = document.getElementById('btn-confirm-results');
    this.resultsStudentCount = document.getElementById('results-student-count');
    this.fullResultsTbody = document.getElementById('full-results-tbody');

    // Firebase Modal
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

    // Start Game Button in Lobby (TEACHER ONLY - 1 MINUTE ATTACK)
    this.btnStartGame.addEventListener('click', () => {
      if (!multiplay.isTeacher()) {
        alert('게임 시작 권한은 선생님에게만 있습니다.');
        return;
      }
      sound.playGameStart();

      // 전체 학생이 동일한 퀴즈를 풀 수 있도록 문제 인덱스 셔플
      const totalItems = ITEMS.length;
      const shuffledIndexes = [...Array(totalItems).keys()].sort(() => 0.5 - Math.random());

      // 1분(60초) 타임어택 신호 브로드캐스트
      multiplay.broadcastGameStart(shuffledIndexes, 60);
    });

    // Teacher Force Stop in Dashboard
    this.btnTeacherForceStop.addEventListener('click', () => {
      if (confirm('게임을 즉시 종료하고 시상대로 이동하시겠습니까?')) {
        multiplay.broadcastGameOver();
      }
    });

    // View Results Button (Podium) -> Open Full Results Modal (1st to Last)
    this.btnViewResults.addEventListener('click', () => {
      this.openFullResultsModal();
    });

    const closeResultsModal = () => {
      this.modalFullResults.classList.remove('active');
    };
    this.btnCloseResults.addEventListener('click', closeResultsModal);
    this.btnConfirmResults.addEventListener('click', closeResultsModal);

    // Return to Lobby Button (Teacher Only)
    this.btnReturnLobby.addEventListener('click', () => {
      if (multiplay.isTeacher()) {
        multiplay.broadcastReturnToLobby();
      } else {
        this.showScreen('lobby');
      }
    });

    // Firebase Modal Open/Close
    const openFirebaseModal = () => this.modalFirebase.classList.add('active');
    this.btnFirebaseModal.addEventListener('click', openFirebaseModal);
    this.btnBannerConfig.addEventListener('click', openFirebaseModal);

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
      this.updatePlayerCounts(players);
      this.renderPlayerList(players);
      this.renderLeaderboard(players);
      this.renderTeacherDashboardScoreboard(players);
    });

    multiplay.onGameStateChange((state) => {
      if (state.status === 'playing') {
        if (this.hasJoinedLobby) {
          if (multiplay.isTeacher()) {
            // 교사: 관전 및 진행 대시보드로 전환! (직접 게임하지 않음)
            this.startTeacherDashboard(state);
          } else {
            // 학생: 1분 타임어택 게임 플레이 화면으로 전환!
            this.startStudentGameFlow(state);
          }
        }
      } else if (state.status === 'podium') {
        this.showPodiumScreen();
      } else if (state.status === 'lobby') {
        this.showScreen('lobby');
        this.resetLobbyState();
      }
    });

    multiplay.onError((err) => {
      console.warn('[MultiplaySync Error Alert]', err);
    });

    // Window Resize recalculation
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
    this.screenTeacherDashboard.classList.remove('active');
    this.screenPodium.classList.remove('active');

    if (screenName === 'lobby') {
      this.screenLobby.classList.add('active');
    } else if (screenName === 'game') {
      this.screenGame.classList.add('active');
    } else if (screenName === 'teacher-dashboard') {
      this.screenTeacherDashboard.classList.add('active');
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
    this.dashRoomCode.textContent = room;
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
    } else {
      this.teacherActionArea.style.display = 'none';
      this.studentWaitingArea.style.display = 'block';
      this.hostTag.textContent = '진행자: 선생님';
    }

    sound.playPickup();
  }

  resetLobbyState() {
    this.clearAllTimers();
    this.finishedOverlay.style.display = 'none';
    this.btnEnterRoom.disabled = false;
    this.btnEnterRoom.textContent = (this.selectedRole === 'teacher') ? '교사 대기실 열기 👑' : '대기실 입장하기 🚪';
    this.inputNickname.disabled = false;
    this.inputRoom.disabled = false;
  }

  updatePlayerCounts(players) {
    const students = players.filter(p => p.role !== 'teacher');
    const studentCount = students.length;

    // Update Top Header Badge (ALWAYS VISIBLE)
    if (this.headerStudentCount) {
      this.headerStudentCount.textContent = studentCount;
    }
    // Update Lobby counts
    if (this.playerCount) {
      this.playerCount.textContent = players.length;
    }
    if (this.lobbyStudentCount) {
      this.lobbyStudentCount.textContent = studentCount;
    }
    // Update Teacher Dashboard counts
    if (this.dashStudentCount) {
      this.dashStudentCount.textContent = studentCount;
    }
  }

  renderPlayerList(players) {
    if (!this.playerListGrid) return;
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

  // ==========================================
  // TEACHER MODE: Live Dashboard (NO PLAYING)
  // ==========================================
  startTeacherDashboard(state) {
    this.clearAllTimers();
    this.showScreen('teacher-dashboard');

    const duration = state.duration || 60;
    const startedAt = state.startedAt || Date.now();
    this.gameStartedAt = startedAt;
    this.gameDuration = duration;

    this.startMainTimer(startedAt, duration, (remaining) => {
      // Teacher Timer Tick
      const sec = Math.ceil(remaining);
      this.teacherTimerSeconds.textContent = sec;
      const percent = (remaining / duration) * 100;
      this.teacherTimerBar.style.width = `${percent}%`;

      if (remaining <= 0) {
        // Automatically transition to podium when 1 minute expires
        console.log('[TeacherDashboard] 1 minute finished! Broadcasting game over...');
        multiplay.broadcastGameOver();
      }
    });

    this.renderTeacherDashboardScoreboard(this.playersList);
  }

  renderTeacherDashboardScoreboard(players) {
    if (!this.teacherScoreboardBody) return;

    // Students only, sorted by score descending
    const students = players
      .filter(p => p.role !== 'teacher')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    this.teacherScoreboardBody.innerHTML = '';

    if (students.length === 0) {
      this.teacherScoreboardBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">
            아직 접속한 학생이 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    students.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const rankIcon = idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${idx + 1}위`;
      
      tr.innerHTML = `
        <td><strong>${rankIcon}</strong></td>
        <td><strong>${this.escapeHtml(p.name)}</strong></td>
        <td style="color: #e67e22; font-weight: 800; font-size: 1.05rem;">${p.score || 0}점</td>
        <td>${p.round || 1}문제 풀이</td>
        <td><span class="badge" style="background: #e0f2fe; color: #0284c7;">풀이 중 🔥</span></td>
      `;
      this.teacherScoreboardBody.appendChild(tr);
    });
  }

  // ==========================================
  // STUDENT MODE: 1-Minute Speed Time Attack
  // ==========================================
  startStudentGameFlow(state) {
    this.clearAllTimers();
    this.currentRound = 1;
    this.score = 0;
    this.gameScoreText.textContent = this.score;
    this.gameRoundText.textContent = this.currentRound;
    this.finishedOverlay.style.display = 'none';

    const duration = state.duration || 60;
    const startedAt = state.startedAt || Date.now();
    this.gameStartedAt = startedAt;
    this.gameDuration = duration;

    // Prepare item sequence
    if (Array.isArray(state.itemOrder) && state.itemOrder.length > 0) {
      this.roundItemsList = state.itemOrder.map(idx => ITEMS[idx] || ITEMS[0]);
    } else {
      this.roundItemsList = [...ITEMS].sort(() => 0.5 - Math.random());
    }

    this.showScreen('game');
    this.loadRoundItem();

    // Start 1-Minute Main Timer for Student
    this.startMainTimer(startedAt, duration, (remaining) => {
      const sec = Math.ceil(remaining);
      this.mainTimerSeconds.textContent = sec;
      const percent = (remaining / duration) * 100;
      this.mainTimerBar.style.width = `${percent}%`;

      if (sec <= 10) {
        this.mainTimerBar.classList.add('urgent');
      } else {
        this.mainTimerBar.classList.remove('urgent');
      }

      if (remaining <= 0) {
        this.handleTimeAttackFinished();
      }
    });
  }

  startMainTimer(startedAt, durationSeconds, onTick) {
    if (this.mainTimerInterval) clearInterval(this.mainTimerInterval);

    const update = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, durationSeconds - elapsed);
      onTick(remaining);

      if (remaining <= 0) {
        clearInterval(this.mainTimerInterval);
        this.mainTimerInterval = null;
      }
    };

    update();
    this.mainTimerInterval = setInterval(update, 200);
  }

  loadRoundItem() {
    this.isAnswering = false;

    // Cycle through items if player answers more than item pool
    const itemIndex = (this.currentRound - 1) % this.roundItemsList.length;
    this.currentItem = this.roundItemsList[itemIndex] || ITEMS[0];

    // Reset Drag Card
    this.resetCardPosition();

    // Render Current Item Sprite
    applySprite(this.itemSprite, this.currentItem.rect, 100, 100);
    this.itemName.textContent = this.currentItem.name;
    this.gameRoundText.textContent = this.currentRound;

    this.setPoodleMood('idle', '어디에 버려야 할까? 🤔');

    // Start 5-second per-item speed timer
    this.startItemTimer();
  }

  startItemTimer() {
    if (this.itemTimerInterval) clearInterval(this.itemTimerInterval);

    this.remainingItemTime = 5000;
    this.itemTimerStartTime = performance.now();
    this.timerGauge.style.width = '100%';
    this.timerGauge.classList.remove('urgent');
    this.timerSecondsText.textContent = '5.0';

    this.itemTimerInterval = setInterval(() => {
      const elapsed = performance.now() - this.itemTimerStartTime;
      this.remainingItemTime = Math.max(0, 5000 - elapsed);
      const percent = (this.remainingItemTime / 5000) * 100;
      this.timerGauge.style.width = `${percent}%`;
      this.timerSecondsText.textContent = (this.remainingItemTime / 1000).toFixed(1);

      if (this.remainingItemTime <= 1500) {
        this.timerGauge.classList.add('urgent');
        sound.playTick();
      }

      if (this.remainingItemTime <= 0) {
        clearInterval(this.itemTimerInterval);
        this.handleItemTimeout();
      }
    }, 40);
  }

  handleItemTimeout() {
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
    }, 400);
  }

  handleAnswer(selectedBinId) {
    if (this.isAnswering) return;
    this.isAnswering = true;
    if (this.itemTimerInterval) clearInterval(this.itemTimerInterval);

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
    }, 380);
  }

  handleTimeAttackFinished() {
    this.clearAllTimers();
    this.isAnswering = true;
    multiplay.updateScore(this.score, this.currentRound, true);

    this.finishedMyScore.textContent = this.score;
    this.finishedOverlay.style.display = 'flex';
  }

  clearAllTimers() {
    if (this.mainTimerInterval) {
      clearInterval(this.mainTimerInterval);
      this.mainTimerInterval = null;
    }
    if (this.itemTimerInterval) {
      clearInterval(this.itemTimerInterval);
      this.itemTimerInterval = null;
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

  // Mini In-Game Leaderboard for Students
  renderLeaderboard(players) {
    if (!players || !players.length) return;

    // Filter students only
    const sorted = [...players]
      .filter(p => p.role !== 'teacher')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

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
  }

  // ==========================================
  // PODIUM & RESULTS (1ST TO LAST RANK)
  // ==========================================
  showPodiumScreen() {
    this.clearAllTimers();
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

    // Top 3 Podium
    this.setPodiumPlayer(this.podiumPlayer1, students[0]);
    this.setPodiumPlayer(this.podiumPlayer2, students[1]);
    this.setPodiumPlayer(this.podiumPlayer3, students[2]);

    if (multiplay.isTeacher()) {
      // Teacher View in Podium
      this.studentFinalSummary.style.display = 'none';
      this.teacherFinalSummary.style.display = 'block';
      this.btnReturnLobby.style.display = 'inline-block';
    } else {
      // Student View in Podium
      this.studentFinalSummary.style.display = 'grid';
      this.teacherFinalSummary.style.display = 'none';
      this.btnReturnLobby.style.display = 'none';

      this.myFinalScore.textContent = `${this.score}점`;
      const myRank = students.findIndex(p => p.id === multiplay.playerId) + 1;
      this.myFinalRank.textContent = myRank > 0 ? `${myRank}위` : '참여';

      if (this.score >= 120) {
        this.myFinalBadge.textContent = '👑 지구 수호 챔피언';
      } else if (this.score >= 80) {
        this.myFinalBadge.textContent = '🌟 분리수거 마스터';
      } else if (this.score >= 40) {
        this.myFinalBadge.textContent = '🌿 친환경 실천가';
      } else {
        this.myFinalBadge.textContent = '🌱 분리수거 새싹';
      }
    }
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

  /**
   * [결과보기 버튼] 클릭 시 1등부터 꼴등까지 전체 순위 모달 표시
   */
  openFullResultsModal() {
    const students = [...this.playersList]
      .filter(p => p.role !== 'teacher')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    this.resultsStudentCount.textContent = students.length;
    this.fullResultsTbody.innerHTML = '';

    if (students.length === 0) {
      this.fullResultsTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">
            참여한 학생 기록이 없습니다.
          </td>
        </tr>
      `;
    } else {
      students.forEach((p, idx) => {
        const isMe = (p.id === multiplay.playerId);
        const tr = document.createElement('tr');
        if (isMe) tr.className = 'me-row';

        let medal = `${idx + 1}위`;
        if (idx === 0) medal = '🥇 1위';
        else if (idx === 1) medal = '🥈 2위';
        else if (idx === 2) medal = '🥉 3위';

        const score = p.score || 0;
        let badge = '🌱 새싹';
        if (score >= 120) badge = '👑 챔피언';
        else if (score >= 80) badge = '🌟 마스터';
        else if (score >= 40) badge = '🌿 실천가';

        tr.innerHTML = `
          <td><strong>${medal}</strong></td>
          <td><strong>${this.escapeHtml(p.name)}</strong> ${isMe ? '<span class="badge room-badge">나</span>' : ''}</td>
          <td style="color: #e67e22; font-weight: 800;">${score}점</td>
          <td>${p.round || 1}문제</td>
          <td><span class="badge" style="font-size: 0.75rem;">${badge}</span></td>
        `;
        this.fullResultsTbody.appendChild(tr);
      });
    }

    this.modalFullResults.classList.add('active');
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
