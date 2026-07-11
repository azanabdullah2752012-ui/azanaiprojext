import React, { useState, useEffect } from 'react';

export function AIConsole({ selectedCitizen, onUseItem, editorMode, onUpdateCitizen }) {
  const [editName, setEditName] = useState('');
  const [editJob, setEditJob] = useState('');

  useEffect(() => {
    if (selectedCitizen) {
      setEditName(selectedCitizen.name || '');
      setEditJob(selectedCitizen.job || 'Citizen');
    }
  }, [selectedCitizen]);

  if (!selectedCitizen) {
    return (
      <div className="empty-inspector">
        <div className="empty-icon">👁️</div>
        <h3>CivilOS Inspector</h3>
        <p>Click on any citizen or yourself in the simulator grid to inspect their live properties, thoughts, and cognitive state.</p>
      </div>
    );
  }

  const isPlayer = selectedCitizen.id === 'local_player';

  return (
    <div className="ai-console-panel">
      <div className="inspector-card">
        <div className="inspector-header">
          {editorMode && !isPlayer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Configure Citizen</span>
              <input 
                type="text" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  width: '90%'
                }}
                placeholder="Citizen Name"
              />
              <select
                value={editJob}
                onChange={(e) => setEditJob(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  width: '90%'
                }}
              >
                <option value="Blacksmith">Blacksmith</option>
                <option value="Baker">Baker</option>
                <option value="Mayor">Mayor</option>
                <option value="Teacher">Teacher</option>
                <option value="Farmer">Farmer</option>
                <option value="Doctor">Doctor</option>
                <option value="Villager">Villager</option>
              </select>
              <button
                onClick={() => onUpdateCitizen(selectedCitizen.id, { name: editName, job: editJob })}
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  borderRadius: '4px',
                  padding: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'bold',
                  marginTop: '4px',
                  width: '90%'
                }}
              >
                SAVE CITIZEN CONFIG
              </button>
            </div>
          ) : (
            <>
              <div>
                <h3 className="inspector-name" style={{ color: selectedCitizen.color }}>
                  {selectedCitizen.name}
                </h3>
                <span className="inspector-job">{selectedCitizen.job || 'Citizen'}</span>
              </div>
              <span className={`inspector-status-badge ${selectedCitizen.status === 'sleeping' ? 'status-sleeping' : 'status-active'}`}>
                {selectedCitizen.status || 'Active'}
              </span>
            </>
          )}
        </div>

        {/* Dynamic Stats Grid */}
        <div className="inspector-stat-grid">
          <div className="grid-item">
            <span className="grid-label">Location</span>
            <span className="grid-value">X: {selectedCitizen.x}, Y: {selectedCitizen.y}</span>
          </div>
          <div className="grid-item">
            <span className="grid-label">Capital</span>
            <span className="grid-value">{selectedCitizen.money !== undefined ? `${selectedCitizen.money} Coins` : '12 Coins'}</span>
          </div>
        </div>

        {/* Thought Bubble */}
        <div className="inspector-section">
          <span className="section-label">Active Thought</span>
          <div className="thought-bubble">
            "{selectedCitizen.thought || 'Nothing in mind right now.'}"
          </div>
        </div>

        {/* Goal & Plan */}
        <div className="inspector-section">
          <span className="section-label">Current Goal</span>
          <div className="plan-list">
            {isPlayer ? 'Explore the civilization, talk to NPCs, expand the map.' : (selectedCitizen.goal || 'Hammer forge metal items at shop.')}
          </div>
        </div>

        {/* Inventory */}
        <div className="inspector-section">
          <span className="section-label">Inventory</span>
          <div className="memory-list">
            {(selectedCitizen.inventory || []).map((item, idx) => {
              const name = item.split(' x')[0];
              const count = item.split(' x')[1] || '1';
              
              let actionText = '';
              if (['Apple', 'Bread'].includes(name)) actionText = 'Eat';
              else if (name === 'Wood') actionText = 'Build Wall';
              else if (name === 'Iron Ore') actionText = 'Place Anvil';
              else if (name === 'Wheat Seed') actionText = 'Plant Crop';
              
              return (
                <div key={idx} className="memory-item" style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>📦 {name}</span>
                    <span style={{ color: 'var(--accent-cyan)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>Quantity: x{count}</span>
                  </div>
                  
                  {isPlayer && actionText && (
                    <button
                      onClick={() => onUseItem(name)}
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--accent-cyan)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {actionText}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Relationships */}
        {!isPlayer && (
          <div className="inspector-section">
            <span className="section-label">Social Affiliation</span>
            <div className="relationship-list">
              <div className="relationship-item">
                <span className="relation-name">Azan (Player)</span>
                <span className="relation-value">🤝 Trust: {selectedCitizen.id === 'npc_alex' ? '82%' : '45%'}</span>
              </div>
              <div className="relationship-item">
                <span className="relation-name">{selectedCitizen.id === 'npc_alex' ? 'Sarah' : 'Alex'}</span>
                <span className="relation-value">❤️ Love: 70%</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Memories */}
        {!isPlayer && (
          <div className="inspector-section">
            <span className="section-label">Recent Memories (SQLite Logs)</span>
            <div className="memory-list">
              <div className="memory-item">
                <div className="memory-header">
                  <span>Conversation Log</span>
                  <span className="memory-importance">Importance: 8</span>
                </div>
                <p>"Azan talked to me about local trade routes. Offered advice on crafting hammers."</p>
              </div>
              <div className="memory-item">
                <div className="memory-header">
                  <span>Economic Event</span>
                  <span className="memory-importance">Importance: 4</span>
                </div>
                <p>"Harvested forge items and sold iron nails to the local builder."</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
