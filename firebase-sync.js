/**
 * Firebase Realtime Database Synchronization & Virtual Multiplay Fallback
 * 
 * Supports both:
 * 1. Real Firebase Realtime Database (via CDN SDK v9 compat)
 * 2. Virtual Multiplay Sync (BroadcastChannel + LocalStorage) for zero-config instant play across tabs/windows
 */

class MultiplaySync {
  constructor() {
    this.roomId = 'classroom-1';
    this.playerId = 'player_' + Math.random().toString(36).substring(2, 8);
    this.playerName = '친환경학생';
    this.isHost = false;
    this.score = 0;
    this.round = 0;

    this.firebaseApp = null;
    this.database = null;
    this.isFirebaseReady = false;

    this.listeners = {
      players: [],
      gameState: []
    };

    // Virtual Realtime Channel (Same browser / multi-tab)
    this.channel = null;
    this.setupVirtualChannel();
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

  /**
   * Firebase 초기화
   * @param {Object} config - Firebase Config object
   */
  initFirebase(config) {
    if (!config || !config.databaseURL) {
      console.log('Firebase config not provided. Using Virtual Realtime Sync mode.');
      this.isFirebaseReady = false;
      return false;
    }

    try {
      if (window.firebase && !firebase.apps.length) {
        this.firebaseApp = firebase.initializeApp(config);
        this.database = firebase.database();
        this.isFirebaseReady = true;
        console.log('Firebase Realtime Database initialized successfully!');
        return true;
      } else if (window.firebase && firebase.apps.length) {
        this.database = firebase.database();
        this.isFirebaseReady = true;
        return true;
      }
    } catch (err) {
      console.error('Firebase initialization error:', err);
      this.isFirebaseReady = false;
      return false;
    }
    return false;
  }

  setPlayerInfo(name, roomId) {
    this.playerName = name.trim() || '친환경학생';
    if (roomId) this.roomId = roomId.trim().toLowerCase();
  }

  joinRoom(asHost = false) {
    this.isHost = asHost;
    this.score = 0;
    this.round = 1;

    if (this.isFirebaseReady && this.database) {
      const playerRef = this.database.ref(`rooms/${this.roomId}/players/${this.playerId}`);
      playerRef.set({
        id: this.playerId,
        name: this.playerName,
        score: this.score,
        round: this.round,
        isHost: this.isHost,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });

      playerRef.onDisconnect().remove();

      // Listen to players
      const roomPlayersRef = this.database.ref(`rooms/${this.roomId}/players`);
      roomPlayersRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const playerList = Object.values(data);
        this.triggerListeners('players', playerList);
      });

      // Listen to game state
      const stateRef = this.database.ref(`rooms/${this.roomId}/state`);
      stateRef.on('value', (snapshot) => {
        const state = snapshot.val() || { status: 'lobby' };
        this.triggerListeners('gameState', state);
      });
    } else {
      // Virtual Sync (LocalStorage & BroadcastChannel)
      this.virtualJoinRoom();
    }
  }

  virtualJoinRoom() {
    const key = `virtual_room_${this.roomId}`;
    let players = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) players = JSON.parse(stored);
    } catch (e) {}

    // Check if player exists
    players = players.filter(p => p.id !== this.playerId && (Date.now() - (p.updatedAt || 0) < 60000));
    players.push({
      id: this.playerId,
      name: this.playerName,
      score: this.score,
      round: this.round,
      isHost: this.isHost,
      updatedAt: Date.now()
    });

    localStorage.setItem(key, JSON.stringify(players));

    // Broadcast to other tabs
    if (this.channel) {
      this.channel.postMessage({ type: 'SYNC_VIRTUAL_PLAYERS', payload: players });
    }
    this.triggerListeners('players', players);

    // Virtual Heartbeat
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.virtualHeartbeat();
    }, 2000);
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
      self.updatedAt = Date.now();
    } else {
      players.push({
        id: this.playerId,
        name: this.playerName,
        score: this.score,
        round: this.round,
        isHost: this.isHost,
        updatedAt: Date.now()
      });
    }
    localStorage.setItem(key, JSON.stringify(players));
    if (this.channel) {
      this.channel.postMessage({ type: 'SYNC_VIRTUAL_PLAYERS', payload: players });
    }
    this.triggerListeners('players', players);
  }

  updateScore(newScore, round) {
    this.score = newScore;
    this.round = round;

    if (this.isFirebaseReady && this.database) {
      const playerRef = this.database.ref(`rooms/${this.roomId}/players/${this.playerId}`);
      playerRef.update({
        score: this.score,
        round: this.round,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
    } else {
      this.virtualHeartbeat();
    }
  }

  // 방 전체 게임 시작 신호 전송
  broadcastGameStart() {
    const payload = {
      status: 'playing',
      startedAt: Date.now(),
      startedBy: this.playerName
    };

    if (this.isFirebaseReady && this.database) {
      this.database.ref(`rooms/${this.roomId}/state`).set(payload);
    } else {
      const key = `virtual_state_${this.roomId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      if (this.channel) {
        this.channel.postMessage({ type: 'SYNC_GAME_STATE', payload });
      }
      this.triggerListeners('gameState', payload);
    }
  }

  // 방 전체 시상대 이동 신호 전송
  broadcastGameOver() {
    const payload = {
      status: 'podium',
      finishedAt: Date.now()
    };

    if (this.isFirebaseReady && this.database) {
      this.database.ref(`rooms/${this.roomId}/state`).set(payload);
    } else {
      const key = `virtual_state_${this.roomId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      if (this.channel) {
        this.channel.postMessage({ type: 'SYNC_GAME_STATE', payload });
      }
      this.triggerListeners('gameState', payload);
    }
  }

  // 리스너 등록
  onPlayersChange(callback) {
    this.listeners.players.push(callback);
  }

  onGameStateChange(callback) {
    this.listeners.gameState.push(callback);
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
