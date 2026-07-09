# SQLite Database Schema Specification

This document details the SQLite database schemas for **AmbientSpaces v1.0**. All persistent world states, player credentials, and citizen memories are stored locally in a single SQLite database file (`server/data/civilos.db`).

---

## Tables

### 1. `players`
Stores persistent information for human players.
```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,           -- Unique player identifier / socket ID
  username TEXT NOT NULL,         -- Screen name
  x INTEGER NOT NULL,            -- Grid X coordinate
  y INTEGER NOT NULL,            -- Grid Y coordinate
  avatar_color TEXT NOT NULL,     -- Chosen skin hex color
  coins INTEGER DEFAULT 50,      -- Current wallet balance
  inventory TEXT DEFAULT '[]'     -- JSON array of items (e.g. '["Apple x3"]')
);
```

### 2. `citizens`
Stores properties, attributes, and coordinates for simulated AI NPCs.
```sql
CREATE TABLE citizens (
  id TEXT PRIMARY KEY,           -- Unique identifier (e.g., 'npc_alex')
  name TEXT NOT NULL,            -- Display name
  job TEXT NOT NULL,             -- Occupation (Blacksmith, Baker, etc.)
  home_x INTEGER NOT NULL,       -- Home grid X
  home_y INTEGER NOT NULL,       -- Home grid Y
  work_x INTEGER NOT NULL,       -- Job location grid X
  work_y INTEGER NOT NULL,       -- Job location grid Y
  x INTEGER NOT NULL,            -- Current X coordinate
  y INTEGER NOT NULL,            -- Current Y coordinate
  mood TEXT NOT NULL,            -- Current emotional status (Happy, Tired, etc.)
  energy INTEGER DEFAULT 100,    -- Value between 0 and 100
  money INTEGER DEFAULT 20,      -- Citizen budget
  inventory TEXT DEFAULT '[]',   -- JSON array of items
  active_goal TEXT,              -- Active simulation mission statement
  active_thought TEXT            -- Current thought description
);
```

### 3. `memories`
Stores summarizing entries representing experiences and interactions for each NPC.
```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  citizen_id TEXT NOT NULL,      -- Associated citizen ID
  interactor_id TEXT,            -- ID of target player or NPC involved
  summary TEXT NOT NULL,         -- Summarized memory sentence
  importance INTEGER NOT NULL,   -- Rating from 1 (low) to 10 (high)
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  trust_change INTEGER DEFAULT 0, -- Trust delta from this interaction
  FOREIGN KEY(citizen_id) REFERENCES citizens(id)
);
```

### 4. `relationships`
Tracks social affiliation mapping from one Citizen to players or other NPCs.
```sql
CREATE TABLE relationships (
  citizen_id TEXT NOT NULL,      -- Source citizen ID
  target_id TEXT NOT NULL,       -- Target player or citizen ID
  trust INTEGER DEFAULT 50,      -- Range 0 to 100
  fear INTEGER DEFAULT 0,        -- Range 0 to 100
  love INTEGER DEFAULT 0,        -- Range 0 to 100
  respect INTEGER DEFAULT 50,    -- Range 0 to 100
  PRIMARY KEY (citizen_id, target_id),
  FOREIGN KEY(citizen_id) REFERENCES citizens(id)
);
```

### 5. `world_map`
Stores layout grids to persist terrain overlays and modifications made via the World Editor.
```sql
CREATE TABLE world_map (
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  layer INTEGER NOT NULL,        -- 1 = Terrain, 2 = Structure, 3 = Item
  tile_id INTEGER NOT NULL,      -- ID mapping to tileset asset indices
  PRIMARY KEY (x, y, layer)
);
```
