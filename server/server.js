const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Root ping endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'CivilOS backend', version: '0.1' });
});

// Create Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory player state tracker
const activePlayers = {};

// Real-time synchronization namespace
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Player joined world event
  socket.on('join-world', (playerInfo) => {
    // Generate state details
    const newPlayer = {
      id: socket.id,
      name: playerInfo.name || `Player_${socket.id.substring(0, 4)}`,
      color: playerInfo.color || '#00f0ff',
      x: playerInfo.x !== undefined ? playerInfo.x : 10,
      y: playerInfo.y !== undefined ? playerInfo.y : 13,
      facing: 'down'
    };
    
    activePlayers[socket.id] = newPlayer;
    console.log(`[Socket] Player registered: ${newPlayer.name} (${socket.id})`);
    
    // 1. Send currently online players to the joining client
    socket.emit('world-state', {
      players: Object.values(activePlayers).filter(p => p.id !== socket.id)
    });
    
    // 2. Broadcast join status to everyone else
    socket.broadcast.emit('player-joined', newPlayer);
    
    // 3. Log join announcement in chat
    io.emit('chat-sync', {
      sender: 'System',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `${newPlayer.name} has joined the civilization.`,
      type: 'system'
    });
  });

  // Position change broadcast
  socket.on('move-player', (moveData) => {
    if (activePlayers[socket.id]) {
      activePlayers[socket.id].x = moveData.x;
      activePlayers[socket.id].y = moveData.y;
      activePlayers[socket.id].facing = moveData.facing;
      
      // Relays coordinates to all other clients
      socket.broadcast.emit('player-moved', {
        id: socket.id,
        x: moveData.x,
        y: moveData.y,
        facing: moveData.facing
      });
    }
  });

  // Chat message broadcasts
  socket.on('send-chat', (chatData) => {
    const player = activePlayers[socket.id];
    if (player) {
      const chatPayload = {
        id: socket.id,
        sender: player.name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: chatData.text,
        type: 'player'
      };
      
      io.emit('chat-sync', chatPayload);
    }
  });

  // Disconnection cleanup
  socket.on('disconnect', () => {
    const player = activePlayers[socket.id];
    if (player) {
      console.log(`[Socket] Player left: ${player.name} (${socket.id})`);
      
      // Alert other clients
      socket.broadcast.emit('player-left', { id: socket.id });
      
      // Log departure announcement in chat
      io.emit('chat-sync', {
        sender: 'System',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `${player.name} has departed from the civilization.`,
        type: 'system'
      });
      
      delete activePlayers[socket.id];
    } else {
      console.log(`[Socket] Unregistered connection closed: ${socket.id}`);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` CivilOS Simulator Backend Running       `);
  console.log(` Port: ${PORT}                           `);
  console.log(` Mode: Development                       `);
  console.log(`=========================================`);
});
