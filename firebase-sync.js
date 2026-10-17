/**
 * Firebase Realtime Database Synchronization Module
 * 
 * Manages Teacher / Student Roles, Room State, Realtime Player Scores,
 * and Broadcast Events with robust reconnection and error handling.
 */

import { getActiveFirebaseConfig } from './firebase-config.js?v=20261017_3';

class MultiplaySync {
  constructor() {
    this.roomId = 'class1';
    this.playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.playerName = '학생';
    this.role = 'student'; // 'student' or 'teacher'
    this.score = 0;
    this.round = 1;
    this.completed = false;

    this.firebaseApp = null;
    this.database = null;
    this.isFirebaseReady = false;
    this.isConnectedToServer = false;
    this.hasJoinedRoom = false;

    this.listeners = {
      players: [],
      gameState: [],
      connection: [],
      error: []
    };

    // Virtual Fallback Channel (same-tab/local testing only)
    this.channel = null;
    this.heartbeatTimer = null;
    this.setupVirtualChannel();

    // Auto-initialize Firebase if config is present
    this.autoInit();
  }

  setupVirtualChannel() {
    try {
      this.channel = new BroadcastChannel('waste_game_channel');
      this.channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'SYNC_VIRTUAL_PLAYERS') {
          this.triggerListeners('players', payload);
        } else if (type === 'SYNC_GAME_STATE') {
          this.triggerListeners('gameState', payload);
        }
      };
    } catch (e) {
      console.warn('[MultiplaySync] BroadcastChannel not supported:', e);
    }
  }

  autoInit() {
    const config = getActiveFirebaseConfig();
    if (config) {
      this.initFirebase(config);
    } else {
      console.warn('[MultiplaySync] Firebase config not set. Running in offline/virtual mode.');
      this.triggerListeners('connection', { ready: false, online: false, mode: 'virtual' });
    }
  }

  /**
   * Firebase 초기화
   * @param {Object} config - Firebase Config object
   */
  initFirebase(config) {
    if (!config || !config.databaseURL) {
      this.isFirebaseReady = false;
      this.triggerListeners('connection', { ready: false, online: false, mode: 'virtual' });
      return false;
    }

    try {
      if (typeof window !== 'undefined' && window.firebase) {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.database = firebase.database();
        this.isFirebaseReady = true;

        console.log('[MultiplaySync] Firebase initialized successfully with URL:', config.databaseURL);

        // Monitor connection state (.info/connected)
        const connectedRef = this.database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
          const isConnected = (snap.val() === true);
          this.isConnectedToServer = isConnected;
          console.log('[MultiplaySync] RTDB Connection Status:', isConnected ? '🟢 ONLINE' : '🟡 CONNECTING/OFFLINE');

          this.triggerListeners('connection', {
            ready: true,
            online: this.isConnectedToServer,
            mode: 'firebase'
          });

          // Reconnected: restore room presence if already joined
          if (this.isConnectedToServer && this.hasJoinedRoom) {
            console.log('[MultiplaySync] Restoring room presence after reconnect...');
            this.registerPlayerInFirebase();
          }
        }, (error) => {
          console.error('[MultiplaySync] .info/connected listener error:', error);
          this.triggerListeners('connection', { ready: true, online: false, error: error.message, mode: 'firebase' });
        });

        // If user already joined room while waiting for connection, promote to Firebase room now
        if (this.hasJoinedRoom) {
          this.joinRoom();
        }

        return true;
      } else {
        console.warn('[MultiplaySync] window.firebase not loaded yet. Waiting...');
        setTimeout(() => this.autoInit(), 500);
        return false;
      }
    } catch (err) {
      console.error('[MultiplaySync] Firebase init error:', err);
      this.isFirebaseReady = false;
      this.triggerListeners('connection', { ready: false, online: false, error: err.message, mode: 'virtual' });
      return false;
    }
  }

  setPlayerInfo(name, roomId, role = 'student') {
    this.playerName = (name || '').trim() || (role === 'teacher' ? '선생님' : '학생');
    if (roomId) this.roomId = roomId.trim().toLowerCase();
    this.role = role;
  }

  isTeacher() {
    return this.role === 'teacher';
  }

  /**
   * 방 입장 (교사 또는 학생)
   */
  joinRoom() {
    this.hasJoinedRoom = true;
    this.score = 0;
    this.round = 1;
    this.completed = false;

    if (this.isFirebaseReady && this.database) {
      this.registerPlayerInFirebase();
      this.listenToRoomData();
    } else {
      // Virtual Sync Fallback (Local Multi-Tab)
      this.virtualJoinRoom();
    }
  }

  /**
   * Firebase Realtime Database에 플레이어 등록 및 연결 끊김 감지 설정
   */
  registerPlayerInFirebase() {
    if (!this.database) return;

    try {
      // 1. If teacher, register host in room info if not set
      if (this.role === 'teacher') {
        const infoRef = this.database.ref(`rooms/${this.roomId}/info`);
        infoRef.update({
          hostId: this.playerId,
          hostName: this.playerName,
          status: 'lobby',
          lastActive: firebase.database.ServerValue.TIMESTAMP
        }).catch(err => console.error('[MultiplaySync] Teacher info update error:', err));
      }

      // 2. Register player in rooms/{roomId}/players/{playerId}
      const playerRef = this.database.ref(`rooms/${this.roomId}/players/${this.playerId}`);
      playerRef.set({
        id: this.playerId,
        name: this.playerName,
        role: this.role,
        score: this.score,
        round: this.round,
        completed: false,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      }).then(() => {
        console.log(`[MultiplaySync] Player registered in room ${this.roomId}:`, this.playerName);
      }).catch(err => {
        console.error('[MultiplaySync] Player set error:', err);
      });

      // Auto remove on disconnect (when tab closes or network drops permanently)
      playerRef.onDisconnect().remove().catch(err => {
        console.warn('[MultiplaySync] onDisconnect setup error:', err);
      });

    } catch (e) {
      console.error('[MultiplaySync] registerPlayerInFirebase error:', e);
    }
  }

  /**
   * 방의 참가자 목록 및 게임 상태 실시간 감청
   */
  listenToRoomData() {
    if (!this.database) return;

    // 1. Listen to all players in this room
    const roomPlayersRef = this.database.ref(`rooms/${this.roomId}/players`);
    roomPlayersRef.off(); // Remove previous listeners to prevent duplicates
    roomPlayersRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      const playerList = Object.values(data);
      console.log(`[MultiplaySync] Received players list (${playerList.length} players):`, playerList.map(p => p.name));
      this.triggerListeners('players', playerList);
    }, (error) => {
      console.error('[MultiplaySync] players listener error:', error);
      this.triggerListeners('error', { type: 'players', message: error.message });
    });

    // 2. Listen to room game state (rooms/{roomId}/info)
    const stateRef = this.database.ref(`rooms/${this.roomId}/info`);
    stateRef.off();
    stateRef.on('value', (snapshot) => {
      const info = snapshot.val() || { status: 'lobby' };
      console.log('[MultiplaySync] Received game state:', info.status);
      this.triggerListeners('gameState', info);
    }, (error) => {
      console.error('[MultiplaySync] gameState listener error:', error);
      this.triggerListeners('error', { type: 'gameState', message: error.message });
    });
  }

  /**
   * 점수 및 진행 라운드 업데이트 (실시간)
   */
  updateScore(newScore, round, isCompleted = false) {
    this.score = newScore;
    this.round = round;
    this.completed = isCompleted;

    if (this.isFirebaseReady && this.database) {
      const playerRef = this.database.ref(`rooms/${this.roomId}/players/${this.playerId}`);
      playerRef.update({
        score: this.score,
        round: this.round,
        completed: this.completed,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      }).catch(err => console.error('[MultiplaySync] updateScore error:', err));
    } else {
      this.virtualHeartbeat();
    }
  }

  /**
   * 선생님이 누르는 [게임 시작] 신호 (전체 학생 화면 동시 전환)
   * @param {Array<number>} itemOrder - 선택 사항: 20개 문제 인덱스 순서
   */
  broadcastGameStart(itemOrder = null) {
    const payload = {
      status: 'playing',
      startedAt: Date.now(),
      startedBy: this.playerName,
      roundCount: 20,
      itemOrder: itemOrder
    };

    console.log('[MultiplaySync] Broadcasting game start to room:', this.roomId);

    if (this.isFirebaseReady && this.database) {
      // Reset all players scores in this room before starting
      this.database.ref(`rooms/${this.roomId}/players`).once('value', (snap) => {
        const players = snap.val() || {};
        const updates = {};
        Object.keys(players).forEach(pId => {
          updates[`${pId}/score`] = 0;
          updates[`${pId}/round`] = 1;
          updates[`${pId}/completed`] = false;
        });
        if (Object.keys(updates).length > 0) {
          this.database.ref(`rooms/${this.roomId}/players`).update(updates);
        }
      });

      this.database.ref(`rooms/${this.roomId}/info`).update(payload).then(() => {
        console.log('[MultiplaySync] Game start broadcast successful!');
      }).catch(err => {
        console.error('[MultiplaySync] Game start broadcast failed:', err);
      });
    } else {
      const key = `virtual_state_${this.roomId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      if (this.channel) {
        this.channel.postMessage({ type: 'SYNC_GAME_STATE', payload });
      }
      this.triggerListeners('gameState', payload);
    }
  }

  /**
   * 시상대(Podium) 화면으로 전체 학생 이동 신호
   */
  broadcastGameOver() {
    const payload = {
      status: 'podium',
      finishedAt: Date.now()
    };

    if (this.isFirebaseReady && this.database) {
      this.database.ref(`rooms/${this.roomId}/info`).update(payload);
    } else {
      const key = `virtual_state_${this.roomId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      if (this.channel) {
        this.channel.postMessage({ type: 'SYNC_GAME_STATE', payload });
      }
      this.triggerListeners('gameState', payload);
    }
  }

  /**
   * 대기실로 전원 복귀
   */
  broadcastReturnToLobby() {
    const payload = {
      status: 'lobby',
      returnedAt: Date.now()
    };

    if (this.isFirebaseReady && this.database) {
      this.database.ref(`rooms/${this.roomId}/info`).update(payload);
    } else {
      const key = `virtual_state_${this.roomId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      if (this.channel) {
        this.channel.postMessage({ type: 'SYNC_GAME_STATE', payload });
      }
      this.triggerListeners('gameState', payload);
    }
  }

  // ==========================================
  // Virtual Sync Methods (For offline/tab testing)
  // ==========================================
  virtualJoinRoom() {
    const key = `virtual_room_${this.roomId}`;
    let players = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) players = JSON.parse(stored);
    } catch (e) {}

    players = players.filter(p => p.id !== this.playerId && (Date.now() - (p.updatedAt || 0) < 60000));
    players.push({
      id: this.playerId,
      name: this.playerName,
      role: this.role,
      score: this.score,
      round: this.round,
      completed: false,
      updatedAt: Date.now()
    });

    localStorage.setItem(key, JSON.stringify(players));

    if (this.channel) {
      this.channel.postMessage({ type: 'SYNC_VIRTUAL_PLAYERS', payload: players });
    }
    this.triggerListeners('players', players);

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => this.virtualHeartbeat(), 2000);
  }

  virtualHeartbeat() {
    if (this.isFirebaseReady && this.isConnectedToServer) return;
    const key = `virtual_room_${this.roomId}`;
    let players = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) players = JSON.parse(stored);
    } catch (e) {}

    players = players.filter(p => Date.now() - (p.updatedAt || 0) < 20000);
    const self = players.find(p => p.id === this.playerId);
    if (self) {
      self.score = this.score;
      self.round = this.round;
      self.completed = this.completed;
      self.updatedAt = Date.now();
    } else {
      players.push({
        id: this.playerId,
        name: this.playerName,
        role: this.role,
        score: this.score,
        round: this.round,
        completed: this.completed,
        updatedAt: Date.now()
      });
    }

    localStorage.setItem(key, JSON.stringify(players));
    if (this.channel) {
      this.channel.postMessage({ type: 'SYNC_VIRTUAL_PLAYERS', payload: players });
    }
    this.triggerListeners('players', players);
  }

  // ==========================================
  // Event Subscriptions
  // ==========================================
  onPlayersChange(callback) {
    this.listeners.players.push(callback);
  }

  onGameStateChange(callback) {
    this.listeners.gameState.push(callback);
  }

  onConnectionChange(callback) {
    this.listeners.connection.push(callback);
  }

  onError(callback) {
    this.listeners.error.push(callback);
  }

  triggerListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(`[MultiplaySync] Error in ${event} listener:`, e); }
      });
    }
  }
}

export const multiplay = new MultiplaySync();
