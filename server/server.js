const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');

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

  // Collaborate Paint Tile trigger
  socket.on('paint-tile', (tileData) => {
    socket.broadcast.emit('tile-painted', tileData);
  });

  // Update NPC profile config trigger
  socket.on('update-citizen', (citData) => {
    if (npcProfiles[citData.id]) {
      npcProfiles[citData.id].name = citData.name;
      npcProfiles[citData.id].job = citData.job;
      console.log(`[Socket] Citizen Profile Configuration updated: ${citData.id} -> ${citData.name} (${citData.job})`);
      socket.broadcast.emit('citizen-updated', citData);
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

// NPC profiles dictionary for system prompt injection
const npcProfiles = {
  npc_alex: {
    name: 'Alex',
    job: 'Blacksmith',
    persona: 'helpful, hard-working, slightly gruff, uses blacksmithing terms (sparks, anvil, iron, forge). Keep replies under 3 sentences.'
  },
  npc_sarah: {
    name: 'Sarah',
    job: 'Baker',
    persona: 'warm, friendly, cheerful, loves baking, smells like flour and honey, talks about fresh bread, cookies, and warmth. Keep replies under 3 sentences.'
  },
  npc_ethan: {
    name: 'Ethan',
    job: 'Mayor',
    persona: 'polite, professional, visionary, loves organizing the town, proud of the community. Keep replies under 3 sentences.'
  },
  npc_lily: {
    name: 'Lily',
    job: 'Teacher',
    persona: 'patient, enthusiastic, intelligent, loves teaching kids, asks questions, talks about lessons and reading. Keep replies under 3 sentences.'
  },
  npc_noah: {
    name: 'Noah',
    job: 'Farmer',
    persona: 'grounded, practical, peaceful, speaks slow and relaxed, loves agriculture, crops, and weather. Keep replies under 3 sentences.'
  },
  npc_emma: {
    name: 'Emma',
    job: 'Doctor',
    persona: 'empathetic, calm, analytical, cares deeply about health and well-being, gives health tips. Keep replies under 3 sentences.'
  }
};

// HTTP Endpoint to proxy dialogue prompts to local Ollama instance
app.post('/api/chat-npc', async (req, res) => {
  const { npcId, history, playerName, message } = req.body;
  const profile = npcProfiles[npcId] || { name: 'Citizen', job: 'Villager', persona: 'polite and friendly.' };
  const user = playerName || 'Traveler';
  const playerMsg = message || 'Hello!';

  try {
    // Fetch recent memories and trust from SQLite
    const trust = await db.getTrustScore(npcId, user);
    const memories = await db.getMemories(npcId, user, 5);

    let memorySnippet = "";
    if (memories.length > 0) {
      memorySnippet = `\nRecent memories you have of interacting with ${user}:\n` +
        memories.map(m => `- [Trust Change ${m.opinion_score}]: ${m.text}`).join('\n');
    }

    const systemPrompt = `You are ${profile.name}, the local ${profile.job} in the 2D village of AmbientSpaces.
Your personality is: ${profile.persona}
Your current relationship trust score with ${user} is ${trust}/100.
${memorySnippet}
Answer in character. Keep answers very concise (1-3 sentences max). Speak naturally as if in a casual 2D dialogue game. Do not use emojis, and do not use markdown code blocks.`;

    // 1. Query local Ollama for available models
    let modelName = 'qwen2.5-coder:3b'; // Default fallback
    try {
      const tagsResponse = await fetch('http://localhost:11434/api/tags');
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json();
        const availableModels = tagsData.models.map(m => m.name);
        
        const preferences = ['qwen2.5-coder:7b', 'qwen2.5-coder:3b'];
        const matched = preferences.find(pref => availableModels.includes(pref));
        if (matched) {
          modelName = matched;
        } else if (availableModels.length > 0) {
          modelName = availableModels[0];
        }
      }
    } catch (e) {
      console.warn('[Ollama] Failed to fetch tags, using default fallback model name.', e.message);
    }

    console.log(`[Ollama] Chat request for ${profile.name} using model: ${modelName}`);

    const formattedHistory = (history || []).map(h => ({
      role: h.role === 'system' ? 'system' : h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content || h.text
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory
    ];

    // 2. Query local Ollama Chat Endpoint
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama responded with status: ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    const replyText = data.message.content.trim();

    console.log(`[Ollama] Response generated for ${profile.name}: "${replyText}"`);

    // 3. Save memory and update relationship trust score in SQLite
    const result = await db.adjustTrustAndSaveMemory(npcId, user, playerMsg, replyText);
    console.log(`[SQLite] Saved conversation memory for ${profile.name}. Trust score updated by ${result.delta} to ${result.trust}/100.`);

    res.json({ text: replyText });

  } catch (error) {
    console.error('[Ollama Error] Failed to generate chat response:', error.message);
    
    const fallbacks = {
      npc_alex: "I'd love to chat, but the forge is calling! These horseshoe hammers won't make themselves.",
      npc_sarah: "Oh dear, my baking timer is ringing! Let's talk more when the bread is out of the oven.",
      npc_ethan: "Pardon me, but municipal duties await. Let's touch base later near the Town Square.",
      npc_lily: "Class is starting, and the children are waiting. See you after school!",
      npc_noah: "Sun is setting, got to head to the crop field now. See you around!",
      npc_emma: "I have a patient checklist to finish. Stay safe and healthy!"
    };
    const fallbackText = fallbacks[npcId] || "I need to get back to my daily work. Let's chat later!";
    const replyText = `[Offline AI Fallback] ${fallbackText}`;

    // Still save the fallback interaction to SQLite so memory state is tracked
    try {
      await db.adjustTrustAndSaveMemory(npcId, user, playerMsg, replyText);
    } catch (dbErr) {
      console.error('[SQLite Error] Failed to save fallback memory:', dbErr.message);
    }
    
    res.json({ text: replyText });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` CivilOS Simulator Backend Running       `);
  console.log(` Port: ${PORT}                           `);
  console.log(` Mode: Development                       `);
  console.log(`=========================================`);
});
