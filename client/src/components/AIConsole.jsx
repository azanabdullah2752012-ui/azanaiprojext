import React from 'react';

export function AIConsole({ selectedCitizen }) {
  if (!selectedCitizen) {
    return (
      <div className="empty-inspector">
        <div className="empty-icon">👁️</div>
        <h3>CivilOS Inspector</h3>
        <p>Click on any citizen or yourself in the simulator grid to inspect their live properties, thoughts, and cognitive state.</p>
      </div>
    );
  }

  // Check if it's the player
  const isPlayer = selectedCitizen.id === 'local_player';

  return (
    <div className="ai-console-panel">
      <div className="inspector-card">
        <div className="inspector-header">
          <div>
            <h3 className="inspector-name" style={{ color: selectedCitizen.color }}>
              {selectedCitizen.name}
            </h3>
            <span className="inspector-job">{selectedCitizen.job || 'Citizen'}</span>
          </div>
          <span className={`inspector-status-badge ${selectedCitizen.status === 'sleeping' ? 'status-sleeping' : 'status-active'}`}>
            {selectedCitizen.status || 'Active'}
          </span>
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
            {(selectedCitizen.inventory || ['Iron Ore x2', 'Hammer x1', 'Bread x1']).map((item, idx) => (
              <div key={idx} className="memory-item" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <span>📦 {item.split(' ')[0]}</span>
                <span style={{ color: 'var(--accent-cyan)' }}>{item.split(' ')[1] || 'x1'}</span>
              </div>
            ))}
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
