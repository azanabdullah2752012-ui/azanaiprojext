import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { AmbientEngine } from './engine/AmbientEngine';
import { InputController } from './engine/Input';
import { AIConsole } from './components/AIConsole';
import { ChatBox } from './components/ChatBox';

export default function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputRef = useRef(null);
  
  // Tabs: 'inspector' or 'logs'
  const [activeTab, setActiveTab] = useState('inspector');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [nearCitizen, setNearCitizen] = useState(null);
  
  // Game metrics
  const [simTime, setSimTime] = useState({ hour: 8, minute: 0 });
  const [playerCoords, setPlayerCoords] = useState({ x: 10, y: 13 });
  
  // Chat logs
  const [messages, setMessages] = useState([
    {
      sender: 'System',
      time: '08:00 AM',
      text: 'CivilOS Initialized. Active Citizens: 2. Version 0.1.',
      type: 'system'
    },
    {
      sender: 'System',
      time: '08:00 AM',
      text: 'Ambient Engine Renderer Online. Use WASD or Arrow Keys to move.',
      type: 'system'
    }
  ]);

  // Hook to run the game loop
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Set explicit canvas size
    const canvas = canvasRef.current;
    canvas.width = 720;
    canvas.height = 540;
    
    const input = new InputController();
    inputRef.current = input;
    
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
    
    let animationFrameId;
    let lastTime = 0;
    let timeTickAcc = 0;
    
    const gameLoop = (timestamp) => {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      
      // Update simulation logic
      engine.update(input);
      
      // Draw simulation layers
      engine.draw();
      
      // Sync React states occasionally
      setPlayerCoords({ x: engine.player.x, y: engine.player.y });
      
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
        // Find nearest citizen to talk to
        let target = null;
        for (const cit of engine.citizens) {
          const dist = Math.sqrt(Math.pow(engine.player.x - cit.x, 2) + Math.pow(engine.player.y - cit.y, 2));
          if (dist <= 1.5) {
            target = cit;
            break;
          }
        }
        
        if (target) {
          triggerNPCInteraction(target);
        }
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  // Perform conversation trigger in local single-player prototype mode
  const triggerNPCInteraction = (npc) => {
    // Player speech bubble
    const engine = engineRef.current;
    if (!engine) return;
    
    engine.player.chatBubble = "Hello there!";
    engine.player.chatTimer = 120; // frame count
    
    const timeStr = formatTime(simTime.hour, simTime.minute);
    
    // Add player chat to logs
    setMessages((prev) => [
      ...prev,
      {
        sender: 'You',
        time: timeStr,
        text: 'Hello there!',
        type: 'player'
      }
    ]);
    
    // NPC responds shortly after
    setTimeout(() => {
      let npcReply = '';
      if (npc.id === 'npc_alex') {
        npcReply = "Greetings, traveler! I'm tending the anvil forge. Looking for quality tools?";
      } else if (npc.id === 'npc_sarah') {
        npcReply = "Hi! Smells good, right? Just finished baking a fresh batch of bread.";
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
      
      // Auto inspect clicked NPC when talking
      setSelectedCitizen(npc);
      setActiveTab('inspector');
    }, 600);
  };
  
  const handleSendMessage = (text) => {
    const timeStr = formatTime(simTime.hour, simTime.minute);
    
    // Add to message feed
    setMessages((prev) => [
      ...prev,
      {
        sender: 'You',
        time: timeStr,
        text: text,
        type: 'player'
      }
    ]);
    
    // Draw bubble on player character
    if (engineRef.current) {
      engineRef.current.player.chatBubble = text;
      engineRef.current.player.chatTimer = 180;
    }
    
    // Simple command handling or random AI reaction
    if (nearCitizen) {
      setTimeout(() => {
        const responses = [
          "That sounds intriguing. Tell me more.",
          "I'm keeping busy with my daily shift.",
          "CivilOS keeps this town running smoothly.",
          "Our economy depends on good trade."
        ];
        const randomResp = responses[Math.floor(Math.random() * responses.length)];
        
        nearCitizen.chatBubble = randomResp;
        nearCitizen.chatTimer = 180;
        
        setMessages((prev) => [
          ...prev,
          {
            sender: nearCitizen.name,
            time: timeStr,
            text: randomResp,
            type: 'citizen'
          }
        ]);
      }, 800);
    }
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
            <span className="subtitle">Ambient Engine Canvas • v0.1</span>
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
              <span className="stat-value">2 Citizens</span>
            </div>
          </div>
        </header>

        <div className="canvas-wrapper">
          <canvas ref={canvasRef}></canvas>
          
          {nearCitizen && (
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
              pointerEvents: 'none'
            }}>
              Press [E] to talk to {nearCitizen.name}
            </div>
          )}
          
          <div className="controls-overlay">
            <div className="control-pill">
              <span style={{ color: 'var(--accent-cyan)' }}>WASD / Arrows</span> Move Avatar
            </div>
            <div className="control-pill">
              <span style={{ color: 'var(--accent-cyan)' }}>Mouse Click</span> Inspect Citizen
            </div>
          </div>
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
