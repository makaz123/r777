//Singleton Pattern to create a single instance of the Websocket
import { host } from '../redux/api';
import {
  updateAvbalance,
  updateExposure,
  getUser,
} from '../redux/reducer/authReducer';
import {
  getPendingBet,
  updateCashoutValues,
} from '../redux/reducer/betReducer';
import { handleBetSettlementWebSocketPayload } from '../utils/betSettlementToast';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.currentUserId = null;
  }

  matchesCurrentUser(messageUserId) {
    const currentId = this.currentUserId ? String(this.currentUserId) : null;
    const targetId =
      messageUserId != null && messageUserId !== ''
        ? String(messageUserId)
        : null;
    return !targetId || !currentId || targetId === currentId;
  }

  connect(dispatch, userId = null) {
    if (this.socket) {
      console.log('WebSocket already connected');
      return;
    }

    // Store userId for filtering incoming messages
    const raw = userId || localStorage.getItem('userId');
    this.currentUserId = raw ? String(raw) : null;

    let wsUrl = host;
    if (wsUrl === '/') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}`;
    }

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket connected, userId:', this.currentUserId);

      // Register userId so backend can send targeted updates (balance, exposure, open bets, cashout)
      if (this.currentUserId && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({ type: 'register', userId: this.currentUserId })
        );
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'balance_update') {
          if (this.matchesCurrentUser(data.userId)) {
            dispatch(updateAvbalance(data.newBalance));
          }
        }

        if (data.type === 'user_refresh_needed') {
          if (this.matchesCurrentUser(data.userId)) {
            dispatch(getUser());
            window.dispatchEvent(new CustomEvent('user-profile-refresh'));
          }
        }

        if (data.type === 'exposure_update') {
          if (this.matchesCurrentUser(data.userId)) {
            dispatch(updateExposure(data.newExposure));
          }
        }

        if (data.type === 'open_bets_update') {
          if (this.matchesCurrentUser(data.userId)) {
            dispatch(getPendingBet());
            window.dispatchEvent(
              new CustomEvent('client-bet-history-refresh', {
                detail: {},
              })
            );
          }
        }

        if (data.type === 'cashout_update') {
          if (this.matchesCurrentUser(data.userId)) {
            dispatch(updateCashoutValues(data.bets));
          }
        }

        if (data.type === 'bet_settlement') {
          if (this.matchesCurrentUser(data.userId)) {
            dispatch(getUser());
            dispatch(getPendingBet());
            if (data.role === 'bettor' && data.gameId) {
              window.dispatchEvent(
                new CustomEvent('client-bet-history-refresh', {
                  detail: { gameId: String(data.gameId) },
                })
              );
            }
          }
          handleBetSettlementWebSocketPayload(data);
        }
      } catch (error) {
        console.error(' WebSocket Error:', error);
      }
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      this.socket = null;
      this.tryReconnect(dispatch);
    };

    this.socket.onerror = (error) => {
      console.error(
        '%c WebSocket Error',
        'background: #f44336; color: white; padding: 2px;',
        error
      );
    };
  }

  // Subscribe to a game with userId
  subscribe(gameid, apitype = 'cricket', roundId = null) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        gameid: gameid,
        apitype: apitype,
        roundId: roundId,
        userId: this.currentUserId,
      };
      this.socket.send(JSON.stringify(message));
      console.log('Subscribed to:', gameid, 'with userId:', this.currentUserId);
    } else {
      console.warn('WebSocket not ready, cannot subscribe');
    }
  }

  // Update current userId (useful when user logs in)
  setUserId(userId) {
    this.currentUserId = userId ? String(userId) : null;
    if (this.socket && this.socket.readyState === WebSocket.OPEN && userId) {
      this.socket.send(
        JSON.stringify({ type: 'register', userId: String(userId) })
      );
    }
  }

  tryReconnect(dispatch) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(` Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(dispatch, this.currentUserId), 3000);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Create a single instance
export const wsService = new WebSocketService();
