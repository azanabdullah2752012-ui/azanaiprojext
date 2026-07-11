import React, { useState, useEffect, useRef } from 'react';

export function NPCChatModal({ npc, onClose, onSendMessage, playerMoney, playerItems, onTrade, playerName }) {
  const [activeSubTab, setActiveSubTab] = useState('talk'); // 'talk' or 'trade'
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
  }, [chatLog, isLoading, activeSubTab]);

  const tradeCatalog = {
    npc_alex: {
      sells: [
        { name: 'Iron Ore', price: 10 },
        { name: 'Hammer', price: 30 },
        { name: 'Hoe', price: 20 },
        { name: 'Broadsword', price: 50 },
        { name: 'Iron Plate Armor', price: 60 }
      ],
      buys: [
        { name: 'Wood', price: 5 },
        { name: 'Iron Ore', price: 8 }
      ]
    },
    npc_sarah: {
      sells: [
        { name: 'Bread', price: 8 },
        { name: 'Apple', price: 4 }
      ],
      buys: [
        { name: 'Wheat', price: 4 }
      ]
    },
    npc_noah: {
      sells: [
        { name: 'Wheat Seed', price: 2 },
        { name: 'Wheat', price: 5 },
        { name: 'Apple', price: 3 }
      ],
      buys: [
        { name: 'Wood', price: 3 },
        { name: 'Hoe', price: 15 }
      ]
    },
    npc_emma: {
      sells: [
        { name: 'Bandage', price: 15 },
        { name: 'Medicine', price: 35 }
      ],
      buys: [
        { name: 'Apple', price: 3 }
      ]
    },
    npc_lily: {
      sells: [
        { name: 'Book', price: 25 }
      ],
      buys: [
        { name: 'Paper', price: 3 }
      ]
    },
    npc_ethan: {
      sells: [
        { name: 'Gold Ring', price: 120 }
      ],
      buys: [
        { name: 'Wheat', price: 6 }
      ]
    }
  };

  const catalog = tradeCatalog[npc.id] || { sells: [], buys: [] };

  const getPlayerItemCount = (name) => {
    const item = playerItems.find(i => i.startsWith(name + ' x') || i === name);
    if (!item) return 0;
    const parts = item.split(' x');
    return parseInt(parts[1] || '1', 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText;
    setInputText('');
    
    setChatLog((prev) => [...prev, { sender: 'You', text: userMessage, role: 'user' }]);
    setIsLoading(true);

    try {
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
          history: history,
          playerName: playerName || 'Traveler'
        })
      });

      const data = await response.json();
      setChatLog((prev) => [...prev, { sender: npc.name, text: data.text, role: 'assistant' }]);
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
        width: '480px',
        height: '450px',
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

        {/* Tab selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
          <button 
            onClick={() => setActiveSubTab('talk')} 
            style={{
              flex: 1, padding: '10px', background: activeSubTab === 'talk' ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none', color: activeSubTab === 'talk' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            TALK & SOCIALIZE
          </button>
          <button 
            onClick={() => setActiveSubTab('trade')} 
            style={{
              flex: 1, padding: '10px', background: activeSubTab === 'trade' ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none', color: activeSubTab === 'trade' ? 'var(--accent-yellow)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            TRADE ITEMS
          </button>
        </div>

        {activeSubTab === 'talk' ? (
          <>
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
          </>
        ) : (
          /* Trade Panel Area */
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 'bold' }}>💰 Your Wallet:</span>
              <span style={{ fontSize: '15px', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{playerMoney} Coins</span>
            </div>

            {/* Sells catalog */}
            <div>
              <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Buy from {npc.name}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catalog.sells.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing for sale.</div>
                ) : (
                  catalog.sells.map((item, idx) => {
                    const canAfford = playerMoney >= item.price;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '4px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', marginLeft: '10px' }}>{item.price} Coins</span>
                        </div>
                        <button
                          disabled={!canAfford}
                          onClick={() => onTrade('buy', item.name, item.price)}
                          style={{
                            background: canAfford ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${canAfford ? 'var(--accent-cyan)' : 'var(--glass-border)'}`,
                            color: canAfford ? 'var(--accent-cyan)' : 'var(--text-muted)',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            cursor: canAfford ? 'pointer' : 'not-allowed',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 'bold'
                          }}
                        >
                          BUY
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Buys catalog */}
            <div>
              <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Sell to {npc.name}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catalog.buys.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>This citizen does not buy any goods.</div>
                ) : (
                  catalog.buys.map((item, idx) => {
                    const ownedCount = getPlayerItemCount(item.name);
                    const canSell = ownedCount > 0;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '4px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)', marginLeft: '10px' }}>+{item.price} Coins</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px' }}>(You own: {ownedCount})</span>
                        </div>
                        <button
                          disabled={!canSell}
                          onClick={() => onTrade('sell', item.name, item.price)}
                          style={{
                            background: canSell ? 'rgba(255, 183, 0, 0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${canSell ? 'var(--accent-yellow)' : 'var(--glass-border)'}`,
                            color: canSell ? 'var(--accent-yellow)' : 'var(--text-muted)',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            cursor: canSell ? 'pointer' : 'not-allowed',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 'bold'
                          }}
                        >
                          SELL 1
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

