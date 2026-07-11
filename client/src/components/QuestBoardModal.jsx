import React from 'react';

export function QuestBoardModal({ onClose, activeQuests, onAcceptQuest, onCompleteQuest, playerItems }) {
  const boardQuests = [
    { id: 'q_slime', title: 'East Forest Slimes', description: 'Defeat 3 Forest Slimes wandering in the woods to protect our village borders.', targetType: 'slime', target: 3, rewardXP: 60, rewardCoins: 30 },
    { id: 'q_wheat', title: 'Sarah\'s Flour Reserves', description: 'Harvest and deliver 5 Wheat units to Sarah the Baker to stoke the ovens.', targetType: 'item_Wheat', target: 5, rewardXP: 50, rewardCoins: 25 },
    { id: 'q_apples', title: 'Medical Herb Supplies', description: 'Gather and bring 3 Apples for Emma the Doctor to brew healing potions.', targetType: 'item_Apple', target: 3, rewardXP: 40, rewardCoins: 15 }
  ];

  const getOwnedCount = (targetType) => {
    if (!targetType.startsWith('item_')) return 0;
    const itemName = targetType.replace('item_', '');
    const itemStr = playerItems.find(i => i.startsWith(itemName + ' x') || i === itemName);
    if (!itemStr) return 0;
    return parseInt(itemStr.split(' x')[1] || '1', 10);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 2, 5, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--border-radius-md)',
        padding: '24px',
        width: '90%',
        maxWidth: '460px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-main)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-yellow)', fontSize: '18px', fontFamily: 'var(--font-mono)' }}>📜 QUEST BULLETIN BOARD</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', outline: 'none'
          }}>&times;</button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 20px 0', lineHeight: 1.4 }}>
          Help the citizens of AmbientSpaces. Walk to the quest coordinates, fulfill objectives, and claim Coins & Level up XP.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {boardQuests.map(quest => {
            const active = activeQuests.find(q => q.id === quest.id);
            const isReady = active && active.status === 'ready';

            let ownedCount = 0;
            if (quest.targetType.startsWith('item_')) {
              ownedCount = getOwnedCount(quest.targetType);
            }
            const itemQuestCompleted = quest.targetType.startsWith('item_') && ownedCount >= quest.target;

            return (
              <div key={quest.id} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: 'var(--text-main)', fontSize: '13px', margin: 0, fontWeight: 'bold' }}>{quest.title}</h4>
                  <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    +{quest.rewardXP} XP • +{quest.rewardCoins}c
                  </span>
                </div>
                <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted)', lineHeight: 1.4 }}>{quest.description}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  {active ? (
                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: (isReady || itemQuestCompleted) ? '#39ff14' : 'var(--accent-cyan)' }}>
                      {quest.targetType.startsWith('item_') ? (
                        <span>Progress: {ownedCount}/{quest.target} (Owned)</span>
                      ) : (
                        <span>Progress: {active.current}/{quest.target} (Defeated)</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Available</div>
                  )}

                  {!active ? (
                    <button
                      onClick={() => onAcceptQuest(quest)}
                      style={{
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid var(--accent-cyan)',
                        color: 'var(--accent-cyan)',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ACCEPT
                    </button>
                  ) : (isReady || itemQuestCompleted) ? (
                    <button
                      onClick={() => onCompleteQuest(quest.id)}
                      style={{
                        background: '#39ff14',
                        border: '1px solid #39ff14',
                        color: '#020205',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      CLAIM REWARD
                    </button>
                  ) : (
                    <button
                      disabled
                      style={{
                        background: 'none',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-muted)',
                        borderRadius: '4px',
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'not-allowed',
                        opacity: 0.6
                      }}
                    >
                      ACTIVE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
