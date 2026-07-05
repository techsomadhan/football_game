// socket.js — singleton socket.io-client instance
// VITE_SERVER_URL should be set to your deployed server URL in production
// e.g. https://bidball-server.railway.app
// For local dev it falls back to localhost:3001

import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

export default socket;
