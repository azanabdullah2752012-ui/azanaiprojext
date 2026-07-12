const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'civil_os.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[SQLite] Failed to connect to database:', err.message);
  } else {
    console.log('[SQLite] Connected to civil_os.sqlite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // 1. Memories Table
    db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        npc_id TEXT,
        player_name TEXT,
        timestamp TEXT,
        text TEXT,
        opinion_score INTEGER DEFAULT 0
      )
    `);

    // 2. Relationship Scores Table
    db.run(`
      CREATE TABLE IF NOT EXISTS relationship_scores (
        npc_id TEXT,
        player_name TEXT,
        trust INTEGER DEFAULT 50,
        PRIMARY KEY (npc_id, player_name)
      )
    `);

    // 3. World State (Maps persistence)
    db.run(`
      CREATE TABLE IF NOT EXISTS world_state (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // 4. Citizen States
    db.run(`
      CREATE TABLE IF NOT EXISTS citizen_states (
        id TEXT PRIMARY KEY,
        name TEXT,
        job TEXT,
        x INTEGER,
        y INTEGER,
        money INTEGER,
        inventory TEXT
      )
    `);

    // 5. Player States
    db.run(`
      CREATE TABLE IF NOT EXISTS player_states (
        username TEXT PRIMARY KEY,
        level INTEGER,
        xp INTEGER,
        hp INTEGER,
        max_hp INTEGER,
        atk INTEGER,
        def INTEGER,
        money INTEGER,
        inventory TEXT,
        color TEXT,
        x INTEGER,
        y INTEGER
      )
    `);
    
    console.log('[SQLite] Database schemas initialized.');
  });
}

// Promises wrapper helpers
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Database APIs
const dbService = {
  addMemory: async (npcId, playerName, text, opinionScore = 0) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sql = `INSERT INTO memories (npc_id, player_name, timestamp, text, opinion_score) VALUES (?, ?, ?, ?, ?)`;
    await runQuery(sql, [npcId, playerName, timestamp, text, opinionScore]);
    console.log(`[SQLite] Added memory for ${npcId} talking to ${playerName}.`);
  },

  getMemories: async (npcId, playerName, limit = 5) => {
    const sql = `SELECT * FROM memories WHERE npc_id = ? AND player_name = ? ORDER BY id DESC LIMIT ?`;
    const rows = await allQuery(sql, [npcId, playerName, limit]);
    return rows.reverse(); // return chronological order
  },

  getTrustScore: async (npcId, playerName) => {
    const sql = `SELECT trust FROM relationship_scores WHERE npc_id = ? AND player_name = ?`;
    const row = await getQuery(sql, [npcId, playerName]);
    return row ? row.trust : 50; // default trust to 50
  },

  adjustTrustAndSaveMemory: async (npcId, playerName, playerMsg, npcReply) => {
    // 1. Analyze Sentiment delta
    const lower = playerMsg.toLowerCase();
    let delta = 0;
    
    const positiveWords = ['thank', 'good', 'nice', 'help', 'friend', 'love', 'cool', 'awesome', 'great', 'baker', 'forge'];
    const negativeWords = ['bad', 'hate', 'stupid', 'ugly', 'fool', 'dumb', 'jerk', 'die'];

    if (positiveWords.some(w => lower.includes(w))) {
      delta = 3;
    } else if (negativeWords.some(w => lower.includes(w))) {
      delta = -8;
    }

    // 2. Update Relationship Score
    const currentTrust = await dbService.getTrustScore(npcId, playerName);
    const newTrust = Math.max(0, Math.min(100, currentTrust + delta));
    
    const insertScoreSql = `
      INSERT INTO relationship_scores (npc_id, player_name, trust) 
      VALUES (?, ?, ?) 
      ON CONFLICT(npc_id, player_name) DO UPDATE SET trust = ?
    `;
    await runQuery(insertScoreSql, [npcId, playerName, newTrust, newTrust]);

    // 3. Save memory entry
    const memoryText = `${playerName} said: "${playerMsg}" -> I replied: "${npcReply}"`;
    await dbService.addMemory(npcId, playerName, memoryText, delta);

    return { trust: newTrust, delta };
  },

  saveWorldMap: async (key, mapData) => {
    const value = JSON.stringify(mapData);
    const sql = `INSERT INTO world_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`;
    await runQuery(sql, [key, value, value]);
  },

  loadWorldMap: async (key) => {
    const sql = `SELECT value FROM world_state WHERE key = ?`;
    const row = await getQuery(sql, [key]);
    return row ? JSON.parse(row.value) : null;
  },

  saveCitizen: async (cit) => {
    const invStr = JSON.stringify(cit.inventory || []);
    const sql = `INSERT INTO citizen_states (id, name, job, x, y, money, inventory) VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET name = ?, job = ?, x = ?, y = ?, money = ?, inventory = ?`;
    await runQuery(sql, [cit.id, cit.name, cit.job, cit.x, cit.y, cit.money, invStr, cit.name, cit.job, cit.x, cit.y, cit.money, invStr]);
  },

  loadCitizens: async () => {
    const sql = `SELECT * FROM citizen_states`;
    const rows = await allQuery(sql);
    return rows.map(r => ({
      ...r,
      inventory: JSON.parse(r.inventory || '[]')
    }));
  },

  savePlayer: async (player) => {
    const invStr = JSON.stringify(player.inventory || []);
    const sql = `INSERT INTO player_states (username, level, xp, hp, max_hp, atk, def, money, inventory, color, x, y)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(username) DO UPDATE SET level = ?, xp = ?, hp = ?, max_hp = ?, atk = ?, def = ?, money = ?, inventory = ?, color = ?, x = ?, y = ?`;
    await runQuery(sql, [
      player.username, player.level, player.xp, player.hp, player.maxHp, player.atk, player.def, player.money, invStr, player.color, player.x, player.y,
      player.level, player.xp, player.hp, player.maxHp, player.atk, player.def, player.money, invStr, player.color, player.x, player.y
    ]);
  },

  loadPlayer: async (username) => {
    const sql = `SELECT * FROM player_states WHERE username = ?`;
    const row = await getQuery(sql, [username]);
    if (!row) return null;
    return {
      ...row,
      inventory: JSON.parse(row.inventory || '[]')
    };
  }
};

module.exports = dbService;
