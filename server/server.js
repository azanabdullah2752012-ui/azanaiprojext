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

// Real-time synchronization namespace
io.on('connection', (socket) => {
  console.log(`[Socket] New connection established: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket] Connection closed: ${socket.id}`);
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
