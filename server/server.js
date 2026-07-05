// server.js — BidBall Socket.IO server
// Deploy this on Railway / Render / any Node.js host

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
  createInitialState,
  processBid,
  processPass,
  advanceToNextPlayer,
  simulateMatch
} = require('./gameLogic');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// -------------------------------------------------------
// In-Memory Room Store
// rooms[roomCode] = {
//   state: gameState,
//   sockets: { team1: socketId, team2: socketId },
//   teamNames: { team1: string, team2: string }
// }
// -------------------------------------------------------
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcastState(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  io.to(roomCode).emit('gameState', {
    ...room.state,
    roomCode,
    team1Connected: !!room.sockets.team1,
    team2Connected: !!room.sockets.team2
  });
}

// -------------------------------------------------------
// Health Check
// -------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ status: 'BidBall server running', rooms: Object.keys(rooms).length });
});

// -------------------------------------------------------
// Socket.IO Events
// -------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // --------------- CREATE ROOM ---------------
  socket.on('createRoom', ({ teamName }) => {
    let roomCode;
    do { roomCode = generateRoomCode(); } while (rooms[roomCode]);

    rooms[roomCode] = {
      state: null, // state is initialised when game starts
      sockets: { team1: socket.id, team2: null },
      teamNames: { team1: teamName || 'Team A', team2: null }
    };

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.teamId = 'team1';

    socket.emit('roomCreated', { roomCode, teamId: 'team1' });
    console.log(`[Room] Created ${roomCode} by ${socket.id}`);
  });

  // --------------- JOIN ROOM ---------------
  socket.on('joinRoom', ({ roomCode, teamName }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];

    if (!room) {
      socket.emit('roomError', { message: `Room "${code}" not found. Check the code and try again.` });
      return;
    }
    if (room.sockets.team2) {
      socket.emit('roomError', { message: `Room "${code}" is already full.` });
      return;
    }

    room.sockets.team2 = socket.id;
    room.teamNames.team2 = teamName || 'Team B';

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.teamId = 'team2';

    socket.emit('roomJoined', { roomCode: code, teamId: 'team2' });

    // Notify host that opponent joined
    io.to(code).emit('playerJoined', {
      teamId: 'team2',
      teamName: room.teamNames.team2,
      team1Name: room.teamNames.team1,
      team2Name: room.teamNames.team2
    });

    console.log(`[Room] ${code} — team2 joined (${socket.id})`);
  });

  // --------------- START GAME ---------------
  socket.on('startGame', ({ team1Name, team2Name }) => {
    const { roomCode, teamId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return;
    if (teamId !== 'team1') {
      socket.emit('roomError', { message: 'Only the host can start the game.' });
      return;
    }
    if (!room.sockets.team2) {
      socket.emit('roomError', { message: 'Waiting for opponent to join before starting.' });
      return;
    }

    // Update names from host's input
    room.teamNames.team1 = team1Name || room.teamNames.team1;
    room.teamNames.team2 = team2Name || room.teamNames.team2;

    room.state = createInitialState(room.teamNames.team1, room.teamNames.team2);
    console.log(`[Game] Started in room ${roomCode}`);
    broadcastState(roomCode);
  });

  // --------------- BID ---------------
  socket.on('bid', ({ amount }) => {
    const { roomCode, teamId } = socket.data;
    const room = rooms[roomCode];
    if (!room || !room.state) return;

    const state = room.state;
    if (state.activeTurn !== teamId) {
      socket.emit('roomError', { message: "It's not your turn to bid." });
      return;
    }

    const result = processBid(state, teamId, parseFloat(amount));
    broadcastState(roomCode);

    if (!result.valid) {
      socket.emit('bidError', { message: result.error });
    }
  });

  // --------------- PASS ---------------
  socket.on('pass', () => {
    const { roomCode, teamId } = socket.data;
    const room = rooms[roomCode];
    if (!room || !room.state) return;

    const state = room.state;
    if (state.biddingMode === 'normal' && state.activeTurn !== teamId) {
      socket.emit('roomError', { message: "It's not your turn to pass." });
      return;
    }

    processPass(state, teamId);
    broadcastState(roomCode);
  });

  // --------------- SKIP PLAYER ---------------
  socket.on('skipPlayer', () => {
    const { roomCode } = socket.data;
    const room = rooms[roomCode];
    if (!room || !room.state) return;
    if (room.state.biddingMode !== 'skipped') return;

    advanceToNextPlayer(room.state);
    broadcastState(roomCode);
  });

  // --------------- SIMULATE MATCH ---------------
  socket.on('simulateMatch', () => {
    const { roomCode } = socket.data;
    const room = rooms[roomCode];
    if (!room || !room.state) return;

    simulateMatch(room.state);
    broadcastState(roomCode);
  });

  // --------------- PLAY AGAIN (reset to lobby) ---------------
  socket.on('playAgain', () => {
    const { roomCode, teamId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return;
    if (teamId !== 'team1') {
      socket.emit('roomError', { message: 'Only the host can restart the game.' });
      return;
    }

    room.state = null;
    io.to(roomCode).emit('gameState', {
      stage: 'lobby_waiting',
      roomCode,
      team1Connected: !!room.sockets.team1,
      team2Connected: !!room.sockets.team2,
      team1: { name: room.teamNames.team1, money: 35, players: [] },
      team2: { name: room.teamNames.team2, money: 35, players: [] }
    });
  });

  // --------------- DISCONNECT ---------------
  socket.on('disconnect', () => {
    const { roomCode, teamId } = socket.data || {};
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      if (teamId) room.sockets[teamId] = null;

      console.log(`[-] ${teamId} disconnected from room ${roomCode}`);

      // Notify remaining player
      io.to(roomCode).emit('opponentDisconnected', { teamId });

      // Clean up empty rooms
      if (!room.sockets.team1 && !room.sockets.team2) {
        delete rooms[roomCode];
        console.log(`[Room] ${roomCode} deleted (empty)`);
      }
    }
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

// -------------------------------------------------------
// Start Server
// -------------------------------------------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`BidBall server listening on port ${PORT}`);
});
