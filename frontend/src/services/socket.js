import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || window.location.origin;

class SocketService {
  constructor() {
    this.socket = null;
    this.currentToken = null;
  }

  connect(token) {
    // If token changed, disconnect existing connection
    if (this.currentToken && this.currentToken !== token) {
      this.disconnect();
    }

    // If already connected with same token, return existing connection
    if (this.socket?.connected && this.currentToken === token) {
      return this.socket;
    }

    // Create new connection
    this.currentToken = token;
    this.socket = io(SOCKET_URL, {
      query: { token },
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server with user:', this.currentToken);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentToken = null;
  }

  getSocket() {
    return this.socket;
  }

  sendMessage(roomId, content) {
    if (this.socket) {
      this.socket.emit('send_message', { roomId, content });
    }
  }

  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join_room', { roomId });
    }
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave_room', { roomId });
    }
  }

  onMessage(callback) {
    if (this.socket) {
      this.socket.on('message', callback);
    }
  }

  onJoinedRoom(callback) {
    if (this.socket) {
      this.socket.on('joined_room', callback);
    }
  }

  onLeftRoom(callback) {
    if (this.socket) {
      this.socket.on('left_room', callback);
    }
  }

  offMessage() {
    if (this.socket) {
      this.socket.off('message');
    }
  }
}

const socketService = new SocketService();
export default socketService; 
