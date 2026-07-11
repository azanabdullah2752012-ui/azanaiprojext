import React from 'react';

export function ChestModal({ chestCoords, chestItems, playerItems, onClose, onTransferItem }) {
  // Helper to parse item name and count: e.g. "Wood x15" -> { name: "Wood", count: 15 }
  const parseItem = (itemStr) => {
    const parts = itemStr.split(' x');
    return {
      name: parts[0],
      count: parseInt(parts[1] || '1', 10),
      raw: itemStr
    };
  };

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
        width: '500px',
        maxHeight: '480px',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div>
            <h3 style={{ color: 'var(--accent-yellow)', fontSize: '16px', fontWeight: 600 }}>
              📦 Storage Chest (Coords: {chestCoords})
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Click items to transfer between chest and your inventory
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

        {/* Chest Inventory Section */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <h4 style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Chest Contents
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            maxHeight: '130px',
            overflowY: 'auto',
            minHeight: '60px'
          }}>
            {chestItems.length === 0 ? (
              <div style={{ gridColumn: 'span 4', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '15px' }}>
                Empty Chest
              </div>
            ) : (
              chestItems.map((item, idx) => {
                const parsed = parseItem(item);
                return (
                  <div 
                    key={idx}
                    onClick={() => onTransferItem(idx, 'take')}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-yellow)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>📦</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {parsed.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--accent-yellow)', fontFamily: 'var(--font-mono)' }}>
                      x{parsed.count}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Player Inventory Section */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Your Inventory
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            maxHeight: '130px',
            overflowY: 'auto',
            minHeight: '60px'
          }}>
            {playerItems.length === 0 ? (
              <div style={{ gridColumn: 'span 4', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '15px' }}>
                Your bags are empty
              </div>
            ) : (
              playerItems.map((item, idx) => {
                const parsed = parseItem(item);
                return (
                  <div 
                    key={idx}
                    onClick={() => onTransferItem(idx, 'deposit')}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎒</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {parsed.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      x{parsed.count}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
