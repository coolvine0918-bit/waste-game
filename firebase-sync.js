/**
 * Firebase Realtime Database Synchronization Module
 * 
 * Manages Teacher / Student Roles, Room State, Realtime Player Scores,
 * and Broadcast Events.
 */

import { getActiveFirebaseConfig } from './firebase-config.js';

class MultiplaySync {
  constructor() {
    this.roomId = 'class1';
    this.playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    this.playerName = '학생1';
    this.role = 'student'; // 'student' or 'teacher'
    this.score = 0;
    this.round = 1;
    this.completed = false;

    this.firebaseApp = null;
    this.database = null;
    this.isFirebaseReady = false;
    this.isConnectedToServer = false;

    this.listeners = {
      players: [],
      gameState: [],
      connection: []
    };

    // Virtual Fallback Channel (same-tab testing only)
    this.channel = null;
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
      console.warn('BroadcastChannel not supported:', e);
    }
  }

  autoInit() {
    const config = getActiveFirebaseConfig();
    if (config) {
      this.initFirebase(config);
    } else {
      console.warn('[MultiplaySync] Firebase config not set. Running in offline/virtual mode.');
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
      if (window.firebase) {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.database = firebase.database();
        this.isFirebaseReady = true;

        // Monitor connection state (.info/connected)
        const connectedRef = this.database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
          this.isConnectedToServer = (snap.val() === true);
          this.triggerListeners('connection', {
            ready: true,
            online: this.isConnectedToServer,
            mode: 'firebase'
          });
        });

        console.log('[MultiplaySync] Firebase initialized successfully with URL:', config.databaseURL);
        return true;
      }
    } catch (err) {
      console.error('[MultiplaySync] Firebase init error:', err);
      this.isFirebaseReady = false;
      this.triggerListeners('connection', { ready: false, online: false, error: err.message, mode: 'virtual' });
      return false;
    }
    return false;
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
    this.score = 0;
    this.round = 1;
    this.completed = false;

    if (this.isFirebaseReady && this.database) {
      // 1. If teacher, register host in room info if not set
      if (this.role === 'teacher') {
        const infoRef = this.database.ref(`rooms/${this.roomId}/info`);
        infoRef.update({
          hostId: this.playerId,
          hostName: this.playerName,
          status: 'lobby',
          lastActive: firebase.database.ServerValue.TIMESTAMP
        });
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
      });

      // Auto remove on disconnect
      playerRef.onDisconnect().remove();

      // 3. Listen to all players in this room
      const roomPlayersRef = this.database.ref(`rooms/${this.roomId}/players`);
      roomPlayersRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const playerList = Object.values(data);
        this.triggerListeners('players', playerList);
      });

      // 4. Listen to room game state (rooms/{roomId}/info)
      const stateRef = this.database.ref(`rooms/${this.roomId}/info`);
      stateRef.on('value', (snapshot) => {
        const info = snapshot.val() || { status: 'lobby' };
        this.triggerListeners('gameState', info);
      });

    } else {
      // Virtual Sync Fallback (Local Multi-Tab)
      this.virtualJoinRoom();
    }
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
      });
    } else {
      this.virtualHeartbeat();
    }
  }

  /**
   * 선생님이 누르는 [게임 시작] 신호 (전체 학생 화면 동시 전환)
   */
  broadcastGameStart() {
    const payload = {
      status: 'playing',
      startedAt: Date.now(),
      startedBy: this.playerName,
      roundCount: 20
    };

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
    if (this.isFirebaseReady) return;
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

  triggerListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }
}

export const multiplay = new MultiplaySync();
