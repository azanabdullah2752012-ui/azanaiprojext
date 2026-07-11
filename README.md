# CivilOS & AmbientSpaces 🌐
> **An Artificial Civilization Simulator** — A persistent sandbox world where players and local AI-driven citizens co-exist, trade, build, and farm.

---

## 🗺️ Project Vision
**CivilOS** is a lightweight simulation core running inside a React monorepo that governs physical rules, multiplayer synchronizations, and resource states, while **Ambient Engine** is a high-performance 2D canvas engine displaying the sandbox in real-time. Instead of standard "static game NPCs," citizens inside CivilOS have distinct roles, routines, wallets, and interactive dialogues backed by local LLM model interfaces.

---

## 🛠️ Technology Stack
- **Frontend client**: React + Vite + Vanilla CSS
- **Viewport Renderer**: HTML5 Canvas 2D engine with Viewport Culling & coordinates interpolation
- **Backend multiplayer**: Node.js + Express + Socket.io (WebSocket channels)
- **Local AI Interface**: Ollama API querying local `qwen2.5-coder:7b` (recommended) or `qwen2.5-coder:3b` models
- **Database schemas (Planned)**: SQLite database tables for long-term memory logs and routine saves

---

## 🎮 Core Gameplay Loops

### 1. Dynamic AI Dialogue System
Approach any citizen (Alex the Blacksmith, Sarah the Baker, Emma the Doctor, Noah the Farmer, Ethan the Mayor, Lily the Teacher) and press **`[E]`** to talk.
- Relays prompts to your local **Ollama** server.
- Injects character system prompts based on their personalities and current actions.
- Displays responsive speech bubbles on the map canvas and logs history inside the sidebar console.
- **Offline Fallback**: If your local Ollama app isn't active, citizens respond with interactive, in-character fallback scripts without crashing.

### 2. Double-Grid Inventory Chests
Cottages throughout the village house interactive **Storage Chests** (Anvil Forge, Bakery, Clinic, School, Town Hall, etc.).
- Stand near a chest and press **`[E]`** to view storage.
- Transfer items one-by-one with intelligent stack merging.

### 3. Energy & Consumables
- Select yourself inside the grid viewport to inspect your live stats, coins, and items.
- Your **Energy** decays slowly as simulated time passes.
- Consume **Apples** (`+15%` Energy) or **Bread** (`+30%` Energy) directly from your inventory card to recharge.

### 4. Crafting & Build Mode
Activate placement mode directly from your item card to build structures on adjacent grid cells:
- **`Wood`** -> Build wooden walls to design customized cottages.
- **`Iron Ore`** -> Place anvil tables.
- **`Wheat Seed`** -> Plant crop fields.

### 5. Farming Growth Loop & Trading Shops
- Plant **Wheat Seeds** on Grass or Dirt. Crops undergo **3 growth stages** (Sprout -> Growing stalks -> Golden harvest ears).
- Approach mature crops and press **`[E]`** to harvest them (yielding **Wheat x2** and **Wheat Seeds x1**).
- Speak to citizens and open the **Trade Items** tab to buy tools/goods or sell your farming harvests (e.g. selling Wheat to Sarah the Baker or Noah the Farmer for Coins).

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Ollama App**: Download from [ollama.com](https://ollama.com) and install:
   ```bash
   ollama pull qwen2.5-coder:7b
   # or
   ollama pull qwen2.5-coder:3b
   ```

### Installation & Run

1. Clone the project and install monorepo workspace dependencies:
   ```bash
   npm install
   ```

2. Start the unified development server (launches backend on port `3001` and Vite client on port `5173` concurrently):
   ```bash
   npm run dev
   ```

3. Open **[http://localhost:5173/](http://localhost:5173/)** in your browser, pick a username, select an avatar color, and enter the civilization!

---

## 📁 Repository Directory
```
AmbientSpaces/
├── client/
│   ├── src/
│   │   ├── components/      # Glassmorphic UI overlays (ChatModal, ChestModal, AIConsole)
│   │   ├── engine/          # Canvas Viewport & Camera follow (AmbientEngine, Input)
│   │   ├── App.jsx          # Game loop clocks & hooks
│   │   └── index.css        # Glassmorphism tokens & animations
│   └── package.json
│
├── server/
│   ├── server.js            # Socket.io sync & Ollama proxy router
│   └── package.json
│
├── package.json             # Root concurrency workspace settings
└── README.md
```
