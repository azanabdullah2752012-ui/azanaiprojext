import React, { useState, useEffect, useRef } from 'react';

export function NPCChatModal({ npc, onClose, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const [chatLog, setChatLog] = useState([
    {
      sender: npc.name,
      text: getNPCInitialGreeting(npc.id),
      role: 'assistant'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText;
    setInputText('');
    
    // Add user message to local log
    setChatLog((prev) => [...prev, { sender: 'You', text: userMessage, role: 'user' }]);
    setIsLoading(true);

    try {
      // Send chat history and prompt to backend API
      const history = chatLog.map(log => ({
        role: log.role,
        content: log.text
      }));

      const response = await fetch(`http://${window.location.hostname}:3001/api/chat-npc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: npc.id,
          message: userMessage,
          history: history
        })
      });

      const data = await response.json();
      
      // Update dialogue
      setChatLog((prev) => [...prev, { sender: npc.name, text: data.text, role: 'assistant' }]);
      
      // Draw speech bubble on NPC in world
      onSendMessage(npc.id, data.text);

    } catch (err) {
      console.error('Failed to get Ollama response:', err);
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'System',
          text: 'Ollama is offline. Start the Ollama desktop app to talk dynamically!',
          role: 'system'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  function getNPCInitialGreeting(npcId) {
    switch (npcId) {
      case 'npc_alex': return "Greetings, traveler! I'm tending the anvil forge. Looking for quality tools?";
      case 'npc_sarah': return "Hi! Smells good, right? Just finished baking a fresh batch of bread.";
      case 'npc_ethan': return "Hello! I am Mayor Ethan. Welcome to our village! Let me know if you need anything.";
      case 'npc_lily': return "Hi there! I'm Lily, the local teacher. Class is starting soon!";
      case 'npc_noah': return "Howdy! I'm Noah, the farmer. Hard work pays off, but it's peaceful here.";
      case 'npc_emma': return "Hello, traveler. I'm Dr. Emma. Stay healthy, and drink plenty of water!";
      default: return "Hello! Nice to meet you.";
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 7, 12, 0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 20,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--border-radius-lg)',
        width: '460px',
        height: '420px',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div>
            <h3 style={{ color: npc.color, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              💬 {npc.name}
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {npc.job} • Mood: {npc.mood || 'Calm'}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '20px',
              cursor: 'pointer',
              outline: 'none',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Chat Transcript Area */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'rgba(0,0,0,0.1)'
        }}>
          {chatLog.map((log, idx) => {
            const isUser = log.role === 'user';
            const isSystem = log.role === 'system';
            
            return (
              <div 
                key={idx} 
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  background: isUser ? 'rgba(0, 240, 255, 0.08)' : isSystem ? 'rgba(255, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isUser ? 'rgba(0, 240, 255, 0.2)' : isSystem ? 'rgba(255, 0, 0, 0.2)' : 'var(--glass-border)'}`,
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  color: isSystem ? '#ff6b6b' : 'var(--text-main)'
                }}>
                  <div style={{ 
                    fontSize: '9px', 
                    color: isUser ? 'var(--accent-cyan)' : isSystem ? '#ff6b6b' : npc.color,
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}>
                    {log.sender}
                  </div>
                  {log.text}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px 12px 12px 2px',
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                fontFamily: 'var(--font-mono)'
              }}>
                ⚡ {npc.name} is formulating response...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSubmit} style={{
          padding: '16px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          gap: 10,
          background: 'rgba(0,0,0,0.15)'
        }}>
          <input
            type="text"
            required
            disabled={isLoading}
            placeholder={`Say something to ${npc.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '10px 14px',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--text-main)',
              padding: '0 16px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            TALK
          </button>
        </form>
      </div>
    </div>
  );
}
