import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import { AmbientEngine } from './engine/AmbientEngine';
import { InputController } from './engine/Input';
import { AIConsole } from './components/AIConsole';
import { ChatBox } from './components/ChatBox';
import { NPCChatModal } from './components/NPCChatModal';

export default function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  
  // Login / Profile customization
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState('#00f0ff');
  
  // Tabs: 'inspector' or 'logs'
  const [activeTab, setActiveTab] = useState('inspector');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [nearCitizen, setNearCitizen] = useState(null);
  const [activeChatNPC, setActiveChatNPC] = useState(null);
  
  // Game metrics
  const [simTime, setSimTime] = useState({ hour: 8, minute: 0 });
  const [playerCoords, setPlayerCoords] = useState({ x: 10, y: 13 });
  const [populationCount, setPopulationCount] = useState(6);
  
  // Chat logs
  const [messages, setMessages] = useState([
    {
      sender: 'System',
      time: '08:00 AM',
      text: 'CivilOS Initialized. Active Citizens: 6. Version 0.2.0.',
      type: 'system'
    }
  ]);

  const colorPresets = ['#00f0ff', '#ff007f', '#39ff14', '#ffb700', '#aa3bff'];

  // Start world socket connection
  const handleEnterWorld = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    // Switch state
    setJoined(true);
  };

  // Hook to handle canvas initialization, game loop, and sockets
  useEffect(() => {
    if (!canvasRef.current || !joined) return;
    
    const canvas = canvasRef.current;
    canvas.width = 720;
    canvas.height = 540;
    
    const input = new InputController();
    inputRef.current = input;
    
    // Connect to local Socket.io server
    const serverUrl = `http://${window.location.hostname}:3001`;
    const socket = io(serverUrl);
    socketRef.current = socket;
    
    const engine = new AmbientEngine(
      canvas,
      // Citizen click callback
      (citizen) => {
        setSelectedCitizen(citizen);
        setActiveTab('inspector');
      },
      // Near citizen trigger callback
      (citizen) => {
        setNearCitizen(citizen);
      }
    );
    engineRef.current = engine;
    
    // Update player parameters in engine
    engine.player.name = username;
    engine.player.color = selectedColor;
    
    // Emit join signal
    socket.emit('join-world', {
      name: username,
      color: selectedColor,
      x: engine.player.x,
      y: engine.player.y
    });

    // Socket Event listeners
    socket.on('connect', () => {
      console.log('[Socket] Connected to backend server');
    });
    
    socket.on('world-state', (data) => {
      // Load current online players
      data.players.forEach(p => {
        engine.addOtherPlayer(p);
      });
      setPopulationCount(6 + Object.keys(engine.otherPlayers).length);
    });
    
    socket.on('player-joined', (newPlayer) => {
      engine.addOtherPlayer(newPlayer);
      setPopulationCount(6 + Object.keys(engine.otherPlayers).length);
    });
    
    socket.on('player-moved', (data) => {
      engine.updateOtherPlayerPosition(data.id, data.x, data.y, data.facing);
    });
    
    socket.on('player-left', (data) => {
      engine.removeOtherPlayer(data.id);
      setPopulationCount(6 + Object.keys(engine.otherPlayers).length);
      
      // If we had this player inspected, close inspector
      setSelectedCitizen(prev => prev && prev.id === data.id ? null : prev);
    });
    
    socket.on('chat-sync', (msg) => {
      setMessages((prev) => [...prev, msg]);
      
      // Draw bubble overlay if a player spoke
      if (msg.type === 'player') {
        if (msg.id === socket.id) {
          engine.player.chatBubble = msg.text;
          engine.player.chatTimer = 180;
        } else {
          engine.showOtherPlayerChat(msg.id, msg.text);
        }
      }
    });
    
    let animationFrameId;
    let lastTime = 0;
    let timeTickAcc = 0;
    
    let lastSentX = engine.player.x;
    let lastSentY = engine.player.y;
    
    const gameLoop = (timestamp) => {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      
      // Update simulator steps
      engine.update(input);
      
      // Sync coordinates to state
      setPlayerCoords({ x: engine.player.x, y: engine.player.y });
      
      // Trigger socket send on movement cell transition
      if (engine.player.moving && (lastSentX !== engine.player.targetX || lastSentY !== engine.player.targetY)) {
        socket.emit('move-player', {
          x: engine.player.targetX,
          y: engine.player.targetY,
          facing: engine.player.facing
        });
        lastSentX = engine.player.targetX;
        lastSentY = engine.player.targetY;
      }
      
      // Draw screen layers
      engine.draw();
      
      // Clock simulation: 1 second real-time = 5 minutes game-time
      timeTickAcc += delta;
      if (timeTickAcc >= 1000) {
        setSimTime((prev) => {
          let m = prev.minute + 5;
          let h = prev.hour;
          if (m >= 60) {
            m = 0;
            h = (h + 1) % 24;
          }
          return { hour: h, minute: m };
        });
        timeTickAcc = 0;
      }
      
      // Check E key press interaction
      if (input.consumeKey('e') && engine.citizens.length > 0) {
        let target = null;
        for (const cit of engine.citizens) {
          const dist = Math.sqrt(Math.pow(engine.player.x - cit.x, 2) + Math.pow(engine.player.y - cit.y, 2));
          if (dist <= 1.5) {
            target = cit;
            break;
          }
        }
        
        if (target) {
          setActiveChatNPC(target);
        }
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      socket.disconnect();
    };
  }, [joined]);
  
  // Dialog trigger with NPC
  const triggerNPCInteraction = (npc) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    const timeStr = formatTime(simTime.hour, simTime.minute);
    
    // Instead of local mock only, send a chat message so it logs locally and fits the log pipeline
    if (socketRef.current) {
      socketRef.current.emit('send-chat', { text: `Hello, ${npc.name}!` });
    }
    
    // NPC responds
    setTimeout(() => {
      let npcReply = '';
      if (npc.id === 'npc_alex') {
        npcReply = "Greetings, traveler! I'm tending the anvil forge. Looking for quality tools?";
      } else if (npc.id === 'npc_sarah') {
        npcReply = "Hi! Smells good, right? Just finished baking a fresh batch of bread.";
      } else if (npc.id === 'npc_ethan') {
        npcReply = "Hello! I am Mayor Ethan. Welcome to our village! Let me know if you need anything.";
      } else if (npc.id === 'npc_lily') {
        npcReply = "Hi there! I'm Lily, the local teacher. Class is starting soon!";
      } else if (npc.id === 'npc_noah') {
        npcReply = "Howdy! I'm Noah, the farmer. Hard work pays off, but it's peaceful here.";
      } else if (npc.id === 'npc_emma') {
        npcReply = "Hello, traveler. I'm Dr. Emma. Stay healthy, and drink plenty of water!";
      } else {
        npcReply = "Hello! Nice to meet you.";
      }
      
      npc.chatBubble = npcReply;
      npc.chatTimer = 180;
      
      setMessages((prev) => [
        ...prev,
        {
          sender: npc.name,
          time: timeStr,
          text: npcReply,
          type: 'citizen'
        }
      ]);
      
      setSelectedCitizen(npc);
      setActiveTab('inspector');
    }, 600);
  };
  
  const handleSendMessage = (text) => {
    if (socketRef.current) {
      socketRef.current.emit('send-chat', { text: text });
    }
  };

  const handleNPCChatBubble = (npcId, text) => {
    const engine = engineRef.current;
    if (engine) {
      const npc = engine.citizens.find(c => c.id === npcId);
      if (npc) {
        npc.chatBubble = text;
        npc.chatTimer = 180;
        setSelectedCitizen(npc);
        setActiveTab('inspector');
      }
    }
    const timeStr = formatTime(simTime.hour, simTime.minute);
    setMessages((prev) => [
      ...prev,
      {
        sender: engine?.citizens.find(c => c.id === npcId)?.name || 'Citizen',
        time: timeStr,
        text: text,
        type: 'citizen'
      }
    ]);
  };
  
  const formatTime = (h, m) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minStr = m < 10 ? '0' + m : m;
    return `${hour12}:${minStr} ${ampm}`;
  };

  return (
    <div className="app-container">
      {/* Left: Viewport */}
      <div className="viewport-container">
        <header className="viewport-header">
          <div className="title-area">
            <h1 className="main-title">CivilOS Simulator</h1>
            <span className="subtitle">Ambient Engine Canvas • v0.2.0 (Multiplayer)</span>
          </div>
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">System Time</span>
              <span className="stat-value">{formatTime(simTime.hour, simTime.minute)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Position</span>
              <span className="stat-value">X: {playerCoords.x}, Y: {playerCoords.y}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Population</span>
              <span className="stat-value">{populationCount} online</span>
            </div>
          </div>
        </header>

        <div className="canvas-wrapper">
          {/* Canvas Element */}
          <canvas ref={canvasRef} style={{ filter: !joined ? 'blur(10px)' : 'none' }}></canvas>
          
          {/* Login / Swatch overlay */}
          {!joined && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(5, 7, 12, 0.45)',
              zIndex: 10
            }}>
              <form onSubmit={handleEnterWorld} style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '36px',
                width: '380px',
                display: 'flex', flexDirection: 'column', gap: 20,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <h2 style={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    Enter Civilization
                  </h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure profile for multiplayer sync</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Username</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="Enter name..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '12px 16px',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Avatar Hue</label>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        style={{
                          width: '28px', height: '28px',
                          borderRadius: '50%',
                          background: color,
                          border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                          boxShadow: selectedColor === color ? `0 0 10px ${color}` : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                <button type="submit" style={{
                  background: 'var(--accent-cyan)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  boxShadow: `0 0 15px var(--accent-cyan-glow)`,
                  transition: 'all 0.3s ease',
                  marginTop: 10
                }}>
                  INITIALIZE CONNECT
                </button>
              </form>
            </div>
          )}
          
          {joined && nearCitizen && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 0, 127, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              boxShadow: '0 0 10px rgba(255, 0, 127, 0.5)',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              Press [E] to talk to {nearCitizen.name}
            </div>
          )}

          {joined && activeChatNPC && (
            <NPCChatModal
              npc={activeChatNPC}
              onClose={() => setActiveChatNPC(null)}
              onSendMessage={handleNPCChatBubble}
            />
          )}
          
          {joined && (
            <div className="controls-overlay">
              <div className="control-pill">
                <span style={{ color: 'var(--accent-cyan)' }}>WASD / Arrows</span> Move Avatar
              </div>
              <div className="control-pill">
                <span style={{ color: 'var(--accent-cyan)' }}>Mouse Click</span> Inspect Citizen
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Control Sidebar */}
      <div className="sidebar-container">
        <div className="sidebar-header">
          <span className="sidebar-title">CIVILIZATION CONSOLE</span>
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              INSPECTOR
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              LOGS
            </button>
          </div>
        </div>

        <div className="sidebar-content">
          {activeTab === 'inspector' ? (
            <AIConsole selectedCitizen={selectedCitizen} />
          ) : (
            <ChatBox messages={messages} onSendMessage={handleSendMessage} />
          )}
        </div>
      </div>
    </div>
  );
}
