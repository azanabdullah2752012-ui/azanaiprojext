// AmbientEngine - Canvas-based retro rendering and movement logic

export class AmbientEngine {
  constructor(canvas, onCitizenClick, onNearCitizen, onGridClick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.onCitizenClick = onCitizenClick;
    this.onNearCitizen = onNearCitizen; // Trigger popup prompt: (citizenId) or null
    this.onGridClick = onGridClick;
    
    this.tileSize = 32; // pixel size of one grid cell
    this.scale = 2;     // canvas rendering scale (retro feel)
    
    // Map dimensions: 64x64 grid
    this.mapWidth = 64;
    this.mapHeight = 64;
    
    // Camera center offset
    this.camera = { x: 0, y: 0 };
    
    // Time tracking for water waves / sprite bobbing
    this.time = 0;
    
    this.otherPlayers = {}; // multiplayer roster mapping
    this.crops = {};        // farming crop tracking
    this.chests = {
      '14,8': ['Iron Ore x5', 'Hammer x1'],
      '51,42': ['Bread x6', 'Wheat x10'],
      '23,17': ['Coins x20', 'Apple x2'],   // Player's chest
      '43,17': ['Book x3', 'Paper x10'],     // School chest
      '52,7': ['Bandage x4', 'Medicine x2'], // Clinic chest
      '42,26': ['Gold Ring x1', 'Coins x100'], // Town Hall chest
      '9,41': ['Wheat Seed x15', 'Hoe x1']   // Farmer's chest
    };
    this.npcSchedules = {
      npc_alex: {
        0: { x: 12, y: 10, activity: 'Sleeping in blacksmith cottage' },
        8: { x: 11, y: 8, activity: 'Stoking anvil forge fire' },
        12: { x: 32, y: 32, activity: 'Eating lunch at center plaza' },
        13: { x: 11, y: 8, activity: 'Hammering iron tools' },
        17: { x: 50, y: 52, activity: 'Strolling near the lake' },
        20: { x: 12, y: 10, activity: 'Cleaning up forge workshop' },
        21: { x: 12, y: 10, activity: 'Sleeping' }
      },
      npc_sarah: {
        0: { x: 48, y: 44, activity: 'Sleeping in bakery bedroom' },
        8: { x: 49, y: 42, activity: 'Baking fresh morning bread' },
        12: { x: 32, y: 32, activity: 'Eating lunch at center plaza' },
        13: { x: 49, y: 42, activity: 'Serving bread to customers' },
        17: { x: 52, y: 52, activity: 'Relaxing near water bank' },
        20: { x: 48, y: 44, activity: 'Closing down the ovens' },
        21: { x: 48, y: 44, activity: 'Sleeping' }
      },
      npc_noah: {
        0: { x: 9, y: 42, activity: 'Sleeping in farmer cottage' },
        8: { x: 18, y: 44, activity: 'Watering the crop fields' },
        12: { x: 32, y: 32, activity: 'Eating lunch at center plaza' },
        13: { x: 18, y: 44, activity: 'Tilling fields and weeds' },
        17: { x: 50, y: 52, activity: 'Enjoying the evening lake view' },
        20: { x: 9, y: 42, activity: 'Sitting on cottage porch' },
        21: { x: 9, y: 42, activity: 'Sleeping' }
      },
      npc_emma: {
        0: { x: 52, y: 9, activity: 'Sleeping in clinic backroom' },
        8: { x: 50, y: 8, activity: 'Tending clinic patients' },
        12: { x: 32, y: 32, activity: 'Eating lunch at center plaza' },
        13: { x: 50, y: 8, activity: 'Reviewing patient checkups' },
        17: { x: 12, y: 12, activity: 'Taking a stroll down blacksmith alley' },
        20: { x: 52, y: 9, activity: 'Filing medical prescriptions' },
        21: { x: 52, y: 9, activity: 'Sleeping' }
      },
      npc_lily: {
        0: { x: 39, y: 21, activity: 'Sleeping in school backroom' },
        8: { x: 41, y: 19, activity: 'Teaching school children' },
        12: { x: 32, y: 32, activity: 'Eating lunch at center plaza' },
        13: { x: 41, y: 19, activity: 'Grading student notebooks' },
        17: { x: 40, y: 28, activity: 'Reading book near Town Hall' },
        20: { x: 39, y: 21, activity: 'Preparing tomorrow lessons' },
        21: { x: 39, y: 21, activity: 'Sleeping' }
      },
      npc_ethan: {
        0: { x: 35, y: 27, activity: 'Sleeping in Town Hall room' },
        8: { x: 38, y: 27, activity: 'Reviewing budget papers' },
        12: { x: 32, y: 32, activity: 'Eating lunch at center plaza' },
        13: { x: 38, y: 27, activity: 'Meeting village delegates' },
        17: { x: 32, y: 32, activity: 'Conducting inspector rounds' },
        20: { x: 35, y: 27, activity: 'Reading municipal codes' },
        21: { x: 35, y: 27, activity: 'Sleeping' }
      }
    };
    
    this.lastHour = -1;
    this.autonomousTalkTimer = 300;
    this.initializeMap();
    this.initializePlayer();
    this.initializeCitizens();
    
    this.setupClickEvent();
  }
  
  drawHouse(xStart, yStart, width, height, floorType, wallType, doorX, doorY) {
    for (let y = yStart; y < yStart + height; y++) {
      for (let x = xStart; x < xStart + width; x++) {
        this.terrainMap[y][x] = floorType;
        if (y === yStart || y === yStart + height - 1 || x === xStart || x === xStart + width - 1) {
          this.structureMap[y][x] = wallType;
        }
      }
    }
    this.structureMap[doorY][doorX] = 0; // walkable doorway
  }

  initializeMap() {
    // Layer 1: Terrain (0 = Grass, 1 = Road, 2 = Water, 3 = Wood Floor, 4 = Stone Floor)
    this.terrainMap = Array(this.mapHeight).fill(null).map(() => Array(this.mapWidth).fill(0));
    
    // Layer 2: Structures (0 = Empty, 1 = Wall/Brick, 2 = Tree, 3 = Table, 4 = Chair, 5 = Chest, 6 = Water Edge/Fence)
    this.structureMap = Array(this.mapHeight).fill(null).map(() => Array(this.mapWidth).fill(0));
    
    // 1. Build map boundary trees to act as borders
    for (let y = 0; y < this.mapHeight; y++) {
      this.structureMap[y][0] = 2;
      this.structureMap[y][this.mapWidth - 1] = 2;
    }
    for (let x = 0; x < this.mapWidth; x++) {
      this.structureMap[0][x] = 2;
      this.structureMap[this.mapHeight - 1][x] = 2;
    }

    // 2. Draw Main roads (vertical and horizontal cross street in center)
    for (let y = 1; y < this.mapHeight - 1; y++) {
      this.terrainMap[y][31] = 1;
      this.terrainMap[y][32] = 1;
    }
    for (let x = 1; x < this.mapWidth - 1; x++) {
      this.terrainMap[31][x] = 1;
      this.terrainMap[32][x] = 1;
    }

    // 3. Draw Side roads connecting sectors
    // Blacksmith Road (top-left)
    for (let y = 8; y <= 31; y++) {
      this.terrainMap[y][12] = 1;
    }
    // Clinic/School Road (top-right)
    for (let x = 32; x <= 50; x++) {
      this.terrainMap[15][x] = 1;
    }
    // Farmer Road (bottom-left)
    for (let x = 11; x <= 31; x++) {
      this.terrainMap[45][x] = 1;
    }
    // Baker Road (bottom-right)
    for (let y = 32; y <= 45; y++) {
      this.terrainMap[y][49] = 1;
    }

    // 4. Construct Village Buildings
    // Blacksmith cottage (top-left)
    this.drawHouse(8, 6, 8, 6, 4, 1, 12, 11);
    this.structureMap[8][10] = 3; // Forge anvil table
    this.structureMap[8][14] = 5; // Blacksmith storage chest

    // Player default starting home (top-left)
    this.drawHouse(18, 16, 7, 6, 3, 1, 21, 21);
    this.structureMap[17][23] = 5; // Player chest

    // School house (top-right)
    this.drawHouse(38, 16, 8, 7, 3, 1, 41, 22);
    this.structureMap[17][43] = 5; // School chest

    // Doctor clinic (top-right)
    this.drawHouse(46, 6, 8, 6, 4, 1, 50, 11);
    this.structureMap[8][48] = 3; // Clinic bed/table
    this.structureMap[7][52] = 5; // Clinic medicine chest

    // Town Hall (center top)
    this.drawHouse(33, 25, 10, 5, 4, 1, 38, 29);
    this.structureMap[26][42] = 5; // Town Hall vault chest

    // Baker cottage (bottom-right)
    this.drawHouse(46, 40, 8, 6, 3, 1, 49, 45);
    this.structureMap[42][48] = 3; // Baker counter
    this.structureMap[42][51] = 5; // Baker yeast chest

    // Farmer cottage (bottom-left)
    this.drawHouse(8, 40, 7, 6, 3, 1, 11, 45);
    this.structureMap[41][9] = 5; // Farmer seed chest

    // 5. Draw Lake / Water pond (bottom-right)
    for (let y = 48; y < 58; y++) {
      for (let x = 45; x < 60; x++) {
        this.terrainMap[y][x] = 2;
        this.structureMap[y][x] = 6;
      }
    }

    // 6. Draw Crop Fields (bottom-left)
    for (let y = 40; y <= 48; y++) {
      for (let x = 16; x <= 26; x++) {
        this.terrainMap[y][x] = 1; // Dirt/farming floor
        // Place crop indicators procedurally
        if ((x + y) % 2 === 0) {
          this.structureMap[y][x] = 5; // use chest index as crop placeholder
        }
      }
    }

    // 7. Decorate world with random trees
    for (let i = 0; i < 60; i++) {
      const tx = Math.floor(Math.random() * (this.mapWidth - 2)) + 1;
      const ty = Math.floor(Math.random() * (this.mapHeight - 2)) + 1;
      // Do not overwrite roads, buildings or water
      if (this.terrainMap[ty][tx] === 0 && this.structureMap[ty][tx] === 0) {
        this.structureMap[ty][tx] = 2; // Tree
      }
    }
  }
  
  initializePlayer() {
    this.player = {
      id: 'local_player',
      name: 'Player',
      x: 32,             // Spawn player at center road coordinates
      y: 34,
      targetX: 32,
      targetY: 34,
      moving: false,
      moveProgress: 0,
      speed: 0.25,       // Speeds up movement transition tick (faster)
      color: '#00f0ff',
      facing: 'down',
      avatarType: 'human',
      chatBubble: null,
      chatTimer: 0,
      inventory: ['Apple x3', 'Wood x10', 'Coins x50']
    };
  }
  
  initializeCitizens() {
    this.citizens = [
      {
        id: 'npc_alex',
        name: 'Alex (Blacksmith)',
        x: 11,
        y: 8,
        targetX: 11,
        targetY: 8,
        moving: false,
        moveProgress: 0,
        speed: 0.25,
        color: '#ffb700',
        facing: 'down',
        job: 'Blacksmith',
        thought: 'I should finish hammering this anvil iron soon.',
        status: 'working',
        chatBubble: null,
        chatTimer: 0,
        inventory: ['Wood x4', 'Iron Ore x3', 'Hammer x1'],
        money: 40
      },
      {
        id: 'npc_sarah',
        name: 'Sarah (Baker)',
        x: 49,
        y: 42,
        targetX: 49,
        targetY: 42,
        moving: false,
        moveProgress: 0,
        speed: 0.25,
        color: '#ff007f',
        facing: 'left',
        job: 'Baker',
        thought: 'The bread ovens are heating up nicely today.',
        status: 'working',
        chatBubble: null,
        chatTimer: 0,
        inventory: ['Wheat x2', 'Bread x3', 'Apple x2'],
        money: 30
      },
      {
        id: 'npc_ethan',
        name: 'Ethan (Mayor)',
        x: 38,
        y: 30,
        targetX: 38,
        targetY: 30,
        moving: false,
        moveProgress: 0,
        speed: 0.25,
        color: '#aa3bff',
        facing: 'down',
        job: 'Mayor',
        thought: 'I need to review the municipal budget today.',
        status: 'active',
        chatBubble: null,
        chatTimer: 0,
        inventory: ['Gold Ring x1'],
        money: 100
      },
      {
        id: 'npc_lily',
        name: 'Lily (Teacher)',
        x: 41,
        y: 19,
        targetX: 41,
        targetY: 19,
        moving: false,
        moveProgress: 0,
        speed: 0.25,
        color: '#39ff14',
        facing: 'left',
        job: 'Teacher',
        thought: 'Preparing the lesson plan for the school children.',
        status: 'active',
        chatBubble: null,
        chatTimer: 0,
        inventory: ['Book x2', 'Paper x10'],
        money: 25
      },
      {
        id: 'npc_noah',
        name: 'Noah (Farmer)',
        x: 18,
        y: 44,
        targetX: 18,
        targetY: 44,
        moving: false,
        moveProgress: 0,
        speed: 0.25,
        color: '#ffb700',
        facing: 'right',
        job: 'Farmer',
        thought: 'The crops are growing tall. We need rain soon.',
        status: 'active',
        chatBubble: null,
        chatTimer: 0,
        inventory: ['Wheat Seed x10', 'Wheat x4'],
        money: 20
      },
      {
        id: 'npc_emma',
        name: 'Emma (Doctor)',
        x: 50,
        y: 8,
        targetX: 50,
        targetY: 8,
        moving: false,
        moveProgress: 0,
        speed: 0.25,
        color: '#e2e8f0',
        facing: 'down',
        job: 'Doctor',
        thought: 'Reviewing patient charts for the clinic checkups.',
        status: 'active',
        chatBubble: null,
        chatTimer: 0,
        inventory: ['Medicine x2', 'Apple x5', 'Bandage x3'],
        money: 50
      }
    ];

    this.citizens.forEach(cit => {
      cit.path = [];
    });
  }
  
  setupClickEvent() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      // Calculate cursor position inside the scaled canvas coordinate space
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;
      
      // Un-apply zoom scale
      const unscaledX = clickX / this.scale;
      const unscaledY = clickY / this.scale;
      
      // Translate back camera offset
      const worldX = unscaledX + this.camera.x;
      const worldY = unscaledY + this.camera.y;
      
      // Convert to grid cell coordinates
      const gridX = Math.floor(worldX / this.tileSize);
      const gridY = Math.floor(worldY / this.tileSize);
      
      // Check if clicked on any citizen
      let clickedCitizen = null;
      for (const cit of this.citizens) {
        // Interpolated actual coordinates
        const drawX = (cit.x + (cit.targetX - cit.x) * cit.moveProgress);
        const drawY = (cit.y + (cit.targetY - cit.y) * cit.moveProgress);
        
        // Inside boundaries
        if (Math.abs(worldX - (drawX * this.tileSize + this.tileSize/2)) < this.tileSize/2 &&
            Math.abs(worldY - (drawY * this.tileSize + this.tileSize/2)) < this.tileSize/2) {
          clickedCitizen = cit;
          break;
        }
      }
      
      // Check if clicked on other multiplayer player
      if (!clickedCitizen) {
        for (const id in this.otherPlayers) {
          const op = this.otherPlayers[id];
          const drawX = (op.x + (op.targetX - op.x) * op.moveProgress);
          const drawY = (op.y + (op.targetY - op.y) * op.moveProgress);
          if (Math.abs(worldX - (drawX * this.tileSize + this.tileSize/2)) < this.tileSize/2 &&
              Math.abs(worldY - (drawY * this.tileSize + this.tileSize/2)) < this.tileSize/2) {
            clickedCitizen = op;
            break;
          }
        }
      }
      
      if (clickedCitizen) {
        this.onCitizenClick(clickedCitizen);
      } else {
        // Also check if clicked player
        const pDrawX = (this.player.x + (this.player.targetX - this.player.x) * this.player.moveProgress);
        const pDrawY = (this.player.y + (this.player.targetY - this.player.y) * this.player.moveProgress);
        if (Math.abs(worldX - (pDrawX * this.tileSize + this.tileSize/2)) < this.tileSize/2 &&
            Math.abs(worldY - (pDrawY * this.tileSize + this.tileSize/2)) < this.tileSize/2) {
          this.onCitizenClick({
            id: 'local_player',
            name: 'You (Player)',
            job: 'Traveler',
            thought: 'Exploring CivilOS...',
            status: 'active',
            color: '#00f0ff',
            inventory: this.player.inventory, // pass real local inventory
            money: 45
          });
        } else {
          // Fire general grid coordinate click
          this.onGridClick(gridX, gridY);
        }
      }
    });
  }

  findPath(startX, startY, targetX, targetY) {
    const cols = this.mapWidth;
    const rows = this.mapHeight;
    const openSet = [];
    const closedSet = new Set();
    
    const startNode = {
      x: startX,
      y: startY,
      g: 0,
      h: Math.abs(startX - targetX) + Math.abs(startY - targetY),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    
    openSet.push(startNode);
    
    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      
      if (current.x === targetX && current.y === targetY) {
        const path = [];
        let curr = current;
        while (curr.parent) {
          path.push({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        return path.reverse();
      }
      
      closedSet.add(`${current.x},${current.y}`);
      
      const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ];
      
      for (const dir of directions) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        if (closedSet.has(`${nx},${ny}`)) continue;
        
        const isTarget = nx === targetX && ny === targetY;
        if (!this.isTileWalkable(nx, ny) && !isTarget) continue;
        
        const gScore = current.g + 1;
        const hScore = Math.abs(nx - targetX) + Math.abs(ny - targetY);
        const fScore = gScore + hScore;
        
        const existingNode = openSet.find(node => node.x === nx && node.y === ny);
        if (existingNode) {
          if (gScore < existingNode.g) {
            existingNode.g = gScore;
            existingNode.f = fScore;
            existingNode.parent = current;
          }
        } else {
          openSet.push({
            x: nx,
            y: ny,
            g: gScore,
            h: hScore,
            f: fScore,
            parent: current
          });
        }
      }
    }
    
    return [];
  }

  runAutonomousEconomyTick() {
    const addOrStackItem = (npc, itemStr) => {
      const parts = itemStr.split(' x');
      const name = parts[0];
      const count = parseInt(parts[1] || '1', 10);
      const existingIdx = npc.inventory.findIndex(i => i.startsWith(name + ' x') || i === name);
      if (existingIdx !== -1) {
        const existingParts = npc.inventory[existingIdx].split(' x');
        const existingCount = parseInt(existingParts[1] || '1', 10);
        npc.inventory[existingIdx] = `${name} x${existingCount + count}`;
      } else {
        npc.inventory.push(itemStr);
      }
    };

    const hasItemCount = (npc, itemName, reqCount = 1) => {
      const item = npc.inventory.find(i => i.startsWith(itemName + ' x') || i === itemName);
      if (!item) return false;
      const count = parseInt(item.split(' x')[1] || '1', 10);
      return count >= reqCount;
    };

    const removeItemCount = (npc, itemName, reqCount = 1) => {
      const idx = npc.inventory.findIndex(i => i.startsWith(itemName + ' x') || i === itemName);
      if (idx === -1) return;
      const parts = npc.inventory[idx].split(' x');
      const count = parseInt(parts[1] || '1', 10);
      if (count > reqCount) {
        npc.inventory[idx] = `${itemName} x${count - reqCount}`;
      } else {
        npc.inventory.splice(idx, 1);
      }
    };

    const farmer = this.citizens.find(c => c.id === 'npc_noah');
    const baker = this.citizens.find(c => c.id === 'npc_sarah');
    const blacksmith = this.citizens.find(c => c.id === 'npc_alex');
    const mayor = this.citizens.find(c => c.id === 'npc_ethan');

    // 1. Farmer gathers seeds and wheat
    if (farmer) {
      addOrStackItem(farmer, 'Wheat Seed x1');
      if (Math.random() < 0.6) {
        addOrStackItem(farmer, 'Wheat x1');
      }
    }

    // 2. Baker bakes bread
    if (baker) {
      if (hasItemCount(baker, 'Wheat', 2)) {
        removeItemCount(baker, 'Wheat', 2);
        addOrStackItem(baker, 'Bread x1');
        baker.chatBubble = "Ah, fresh hot bread baked! 🍞";
        baker.chatTimer = 120;
      }
    }

    // 3. Blacksmith hammers tools
    if (blacksmith) {
      if (hasItemCount(blacksmith, 'Iron Ore', 2) && hasItemCount(blacksmith, 'Wood', 1)) {
        removeItemCount(blacksmith, 'Iron Ore', 2);
        removeItemCount(blacksmith, 'Wood', 1);
        addOrStackItem(blacksmith, 'Hammer x1');
        blacksmith.chatBubble = "Forged a new iron hammer! 🔨";
        blacksmith.chatTimer = 120;
      }
    }

    // 4. Trade exchanges
    if (baker && farmer) {
      if (!hasItemCount(baker, 'Wheat', 2) && hasItemCount(farmer, 'Wheat', 1)) {
        if (baker.money >= 4) {
          baker.money -= 4;
          farmer.money += 4;
          removeItemCount(farmer, 'Wheat', 1);
          addOrStackItem(baker, 'Wheat x1');
          baker.chatBubble = "Bought wheat harvest from Noah!";
          baker.chatTimer = 120;
          farmer.chatBubble = "Sold wheat to Sarah Baker!";
          farmer.chatTimer = 120;
          console.log(`[Economy] Sarah bought 1 Wheat from Noah Farmer for 4 Coins.`);
        }
      }
    }

    if (blacksmith && farmer) {
      if (!hasItemCount(blacksmith, 'Wood', 2) && hasItemCount(farmer, 'Wood', 1)) {
        if (blacksmith.money >= 3) {
          blacksmith.money -= 3;
          farmer.money += 3;
          removeItemCount(farmer, 'Wood', 1);
          addOrStackItem(blacksmith, 'Wood x1');
          console.log(`[Economy] Alex Blacksmith bought 1 Wood from Noah Farmer for 3 Coins.`);
        }
      }
    }

    // 5. Taxes collection at 6 PM
    if (mayor && this.lastHour === 18) {
      this.citizens.forEach(cit => {
        if (cit.id !== 'npc_ethan' && cit.money >= 1) {
          cit.money -= 1;
          mayor.money += 1;
        }
      });
      mayor.chatBubble = "Collected evening taxes! 💰";
      mayor.chatTimer = 120;
      console.log(`[Economy] Ethan (Mayor) collected evening taxes from citizens.`);
    }
  }

  runAutonomousTalk() {
    // Proximity conversations between citizens
    for (let i = 0; i < this.citizens.length; i++) {
      const c1 = this.citizens[i];
      for (let j = i + 1; j < this.citizens.length; j++) {
        const c2 = this.citizens[j];
        
        const dist = Math.sqrt(Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y, 2));
        if (dist <= 2.5 && !c1.chatBubble && !c2.chatBubble) {
          const dialogues = [
            {
              c1: 'npc_alex', c2: 'npc_noah',
              msg1: "Noah, got any wood blocks ready for the blacksmith forge?",
              msg2: "Sure thing, Alex! I've loaded some logs."
            },
            {
              c1: 'npc_sarah', c2: 'npc_lily',
              msg1: "Morning Lily! Have you tried the hot baked buns?",
              msg2: "They smell wonderful, Sarah! I'll grab one after lessons."
            },
            {
              c1: 'npc_emma', c2: 'npc_ethan',
              msg1: "Good day, Mayor Ethan. The clinic records are all filed.",
              msg2: "Splendid work, Emma. The village health is in safe hands."
            },
            {
              c1: 'npc_sarah', c2: 'npc_noah',
              msg1: "Noah, your wheat fields are looking exceptionally gold!",
              msg2: "Thank you, Sarah. The harvest yield is perfect."
            },
            {
              c1: 'npc_alex', c2: 'npc_sarah',
              msg1: "Hey Sarah, the bakery smell is drifting into the forge!",
              msg2: "Baking bread keeps the village happy, Alex!"
            },
            {
              c1: 'npc_lily', c2: 'npc_ethan',
              msg1: "Mayor, the children are studying the village history maps.",
              msg2: "Knowledge is the path to a great civilization, Lily!"
            }
          ];

          const match = dialogues.find(d => 
            (d.c1 === c1.id && d.c2 === c2.id) || 
            (d.c1 === c2.id && d.c2 === c1.id)
          );

          if (match) {
            const isReverse = match.c1 === c2.id;
            const bubble1 = isReverse ? match.msg2 : match.msg1;
            const bubble2 = isReverse ? match.msg1 : match.msg2;

            c1.chatBubble = bubble1;
            c1.chatTimer = 180;

            setTimeout(() => {
              c2.chatBubble = bubble2;
              c2.chatTimer = 180;
            }, 1000);

            console.log(`[Conversation] ${c1.name}: "${bubble1}" -> ${c2.name}: "${bubble2}"`);
            return; 
          }
        }
      }
    }

    // Mutter thoughts if alone (20% chance if no one spoke)
    if (Math.random() < 0.25) {
      const lonelyNPC = this.citizens[Math.floor(Math.random() * this.citizens.length)];
      if (!lonelyNPC.chatBubble) {
        const thoughts = {
          npc_alex: ["Whew, the anvil forge fire is burning hot today!", "Need to hammer out some more iron tools.", "I should inspect the storage chests."],
          npc_sarah: ["Nothing beats the aroma of fresh baked cinnamon bread!", "I hope the traveler likes my muffins.", "Need to gather more wheat seeds."],
          npc_noah: ["The crops are growing strong under the sun.", "Time to till the field soil again.", "Let's check the water pond levels."],
          npc_emma: ["Stay safe, eat healthy! Check your energy stats.", "Reviewing clinic prescription lists.", "Hope everyone is feeling well today."],
          npc_lily: ["Education is the spark that lights the fire of life.", "So many assignments left to grade...", "Time for the afternoon square reading."],
          npc_ethan: ["This village will stand tall as a sanctuary.", "Let's inspect the dirt roads and cottage structures.", "Taxes keep the Town Hall running smoothly."]
        };
        const list = thoughts[lonelyNPC.id] || ["Just a nice quiet day in AmbientSpaces."];
        lonelyNPC.chatBubble = list[Math.floor(Math.random() * list.length)];
        lonelyNPC.chatTimer = 150;
      }
    }
  }

  // Sockets helpers for Multiplayer Sync
  addOtherPlayer(playerInfo) {
    this.otherPlayers[playerInfo.id] = {
      id: playerInfo.id,
      name: playerInfo.name,
      color: playerInfo.color,
      x: playerInfo.x,
      y: playerInfo.y,
      targetX: playerInfo.x,
      targetY: playerInfo.y,
      moving: false,
      moveProgress: 0,
      facing: playerInfo.facing || 'down',
      chatBubble: null,
      chatTimer: 0,
      job: 'Player',
      thought: 'Visiting this village...',
      status: 'active'
    };
  }
  
  removeOtherPlayer(id) {
    delete this.otherPlayers[id];
  }
  
  updateOtherPlayerPosition(id, x, y, facing) {
    const op = this.otherPlayers[id];
    if (op) {
      op.facing = facing;
      if (op.x !== x || op.y !== y) {
        op.x = op.targetX;
        op.y = op.targetY;
        op.targetX = x;
        op.targetY = y;
        op.moving = true;
        op.moveProgress = 0;
      }
    }
  }
  
  showOtherPlayerChat(id, text) {
    const op = this.otherPlayers[id];
    if (op) {
      op.chatBubble = text;
      op.chatTimer = 180;
    }
  }
  
  isTileWalkable(x, y) {
    // Boundary check
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
    
    // Check solid structures on Layer 2
    const structId = this.structureMap[y][x];
    if (structId === 1 || structId === 2 || structId === 6) return false; // wall, tree, lake solid
    
    return true;
  }
  
  update(inputController, currentHour = 8) {
    this.time += 0.05;

    if (currentHour !== this.lastHour) {
      this.lastHour = currentHour;
      this.runAutonomousEconomyTick();
    }

    // Update Autonomous Citizen Conversations Ticker
    this.autonomousTalkTimer--;
    if (this.autonomousTalkTimer <= 0) {
      this.autonomousTalkTimer = 300;
      this.runAutonomousTalk();
    }

    // 1. Update citizen position interpolation & step execution
    this.citizens.forEach(cit => {
      if (cit.moving) {
        cit.moveProgress += 0.04; // slow walking speed
        if (cit.moveProgress >= 1) {
          cit.x = cit.targetX;
          cit.y = cit.targetY;
          cit.moving = false;
          cit.moveProgress = 0;
        }
      }

      if (!cit.moving && cit.path && cit.path.length > 0) {
        const nextStep = cit.path.shift();
        if (this.isTileWalkable(nextStep.x, nextStep.y)) {
          cit.targetX = nextStep.x;
          cit.targetY = nextStep.y;
          cit.moving = true;
          cit.moveProgress = 0;

          if (nextStep.x > cit.x) cit.facing = 'right';
          else if (nextStep.x < cit.x) cit.facing = 'left';
          else if (nextStep.y > cit.y) cit.facing = 'down';
          else if (nextStep.y < cit.y) cit.facing = 'up';
        } else {
          // Path blocked, recalculate A*
          const finalTarget = cit.path[cit.path.length - 1] || nextStep;
          cit.path = this.findPath(cit.x, cit.y, finalTarget.x, finalTarget.y);
        }
      }
    });

    // 2. Check schedules when citizen is idle
    this.citizens.forEach(cit => {
      if (!cit.moving && (!cit.path || cit.path.length === 0)) {
        const scheds = this.npcSchedules[cit.id];
        if (scheds) {
          let activeHour = -1;
          for (const hStr in scheds) {
            const h = parseInt(hStr, 10);
            if (h <= currentHour && h > activeHour) {
              activeHour = h;
            }
          }
          if (activeHour !== -1) {
            const target = scheds[activeHour];
            if (cit.x !== target.x || cit.y !== target.y) {
              const path = this.findPath(cit.x, cit.y, target.x, target.y);
              if (path && path.length > 0) {
                cit.path = path;
                cit.thought = target.activity;
                cit.status = target.activity.includes('Sleeping') ? 'resting' : 'active';
              }
            }
          }
        }
      }
    });
    
    // Update Crop Growth (Farming mechanics)
    for (const coords in this.crops) {
      const crop = this.crops[coords];
      if (crop.stage < 3) {
        crop.timer--;
        if (crop.timer <= 0) {
          crop.stage += 1;
          const [cx, cy] = coords.split(',').map(Number);
          if (crop.stage === 2) {
            this.structureMap[cy][cx] = 7; // Growing crop stalks
            crop.timer = 180; // time to reach stage 3
          } else if (crop.stage === 3) {
            this.structureMap[cy][cx] = 8; // Fully grown golden wheat stalks
            crop.timer = 0;
          }
        }
      }
    }
    
    // Update player movement interpolation
    if (this.player.moving) {
      this.player.moveProgress += this.player.speed;
      if (this.player.moveProgress >= 1) {
        this.player.x = this.player.targetX;
        this.player.y = this.player.targetY;
        this.player.moving = false;
        this.player.moveProgress = 0;
      }
    }
    
    // If not moving, process input
    if (!this.player.moving) {
      let dx = 0;
      let dy = 0;
      
      if (inputController.isKeyPressed('up')) {
        dy = -1;
        this.player.facing = 'up';
      } else if (inputController.isKeyPressed('down')) {
        dy = 1;
        this.player.facing = 'down';
      } else if (inputController.isKeyPressed('left')) {
        dx = -1;
        this.player.facing = 'left';
      } else if (inputController.isKeyPressed('right')) {
        dx = 1;
        this.player.facing = 'right';
      }
      
      if (dx !== 0 || dy !== 0) {
        const tx = this.player.x + dx;
        const ty = this.player.y + dy;
        
        if (this.isTileWalkable(tx, ty)) {
          this.player.targetX = tx;
          this.player.targetY = ty;
          this.player.moving = true;
          this.player.moveProgress = 0;
        }
      }
    }
    
    // Check proximity to citizens
    let nearCitizen = null;
    const px = this.player.x;
    const py = this.player.y;
    
    for (const cit of this.citizens) {
      const distance = Math.sqrt(Math.pow(px - cit.x, 2) + Math.pow(py - cit.y, 2));
      if (distance <= 1.5) {
        nearCitizen = cit;
        break;
      }
    }
    
    this.onNearCitizen(nearCitizen);
    
    // Update other players positions and chat bubble timers
    for (const id in this.otherPlayers) {
      const op = this.otherPlayers[id];
      if (op.moving) {
        op.moveProgress += 0.15; // standard speed
        if (op.moveProgress >= 1) {
          op.x = op.targetX;
          op.y = op.targetY;
          op.moving = false;
          op.moveProgress = 0;
        }
      }
      if (op.chatBubble) {
        op.chatTimer--;
        if (op.chatTimer <= 0) op.chatBubble = null;
      }
    }
    
    // Update chat bubble timers
    if (this.player.chatBubble) {
      this.player.chatTimer--;
      if (this.player.chatTimer <= 0) this.player.chatBubble = null;
    }
    this.citizens.forEach(cit => {
      if (cit.chatBubble) {
        cit.chatTimer--;
        if (cit.chatTimer <= 0) cit.chatBubble = null;
      }
    });
    
    // Center camera on player (scaled pixels)
    // Actual player screen x, y in grid offsets
    const pX = (this.player.x + (this.player.targetX - this.player.x) * this.player.moveProgress) * this.tileSize;
    const pY = (this.player.y + (this.player.targetY - this.player.y) * this.player.moveProgress) * this.tileSize;
    
    const viewportWidth = this.canvas.width / this.scale;
    const viewportHeight = this.canvas.height / this.scale;
    
    this.camera.x = pX - viewportWidth / 2 + this.tileSize / 2;
    this.camera.y = pY - viewportHeight / 2 + this.tileSize / 2;
    
    // Clamp camera within map limits
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.mapWidth * this.tileSize - viewportWidth));
    this.camera.y = Math.max(0, Math.min(this.camera.y, this.mapHeight * this.tileSize - viewportHeight));
  }
  
  draw() {
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.camera.x, -this.camera.y);
    
    // Calculate visible tile bounds (viewport culling for fast render)
    const startX = Math.max(0, Math.floor(this.camera.x / this.tileSize));
    const endX = Math.min(this.mapWidth - 1, Math.ceil((this.camera.x + this.canvas.width / this.scale) / this.tileSize));
    const startY = Math.max(0, Math.floor(this.camera.y / this.tileSize));
    const endY = Math.min(this.mapHeight - 1, Math.ceil((this.camera.y + this.canvas.height / this.scale) / this.tileSize));

    // Render Layer 1: Terrain (visible bounds only)
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tx = x * this.tileSize;
        const ty = y * this.tileSize;
        const type = this.terrainMap[y][x];
        
        switch (type) {
          case 0: // Grass
            ctx.fillStyle = '#1e331c';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            break;
          case 1: // Road/Path
            ctx.fillStyle = '#2d2a26';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            break;
          case 2: // Water
            ctx.fillStyle = '#0f2942';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            break;
          case 3: // Wood Floor
            ctx.fillStyle = '#3d2516';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            break;
          case 4: // Stone Floor
            ctx.fillStyle = '#2c2e35';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            break;
        }
      }
    }
    
    // Render Layer 2: Structures (visible bounds only)
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tx = x * this.tileSize;
        const ty = y * this.tileSize;
        const struct = this.structureMap[y][x];
        
        switch (struct) {
          case 1: // Wall/Brick
            ctx.fillStyle = '#473d38';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#2d2522';
            ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);
            break;
          case 2: // Tree (simple flat circle tree for speed)
            ctx.fillStyle = '#4c3218';
            ctx.fillRect(tx + 13, ty + 20, 6, 12);
            ctx.fillStyle = '#1c4515';
            ctx.beginPath();
            ctx.arc(tx + 16, ty + 12, 12, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 3: // Table
            ctx.fillStyle = '#613b1d';
            ctx.fillRect(tx + 2, ty + 4, this.tileSize - 4, this.tileSize - 8);
            break;
          case 5: // Chest or Sprout Crop (Stage 1)
            if (this.chests[`${x},${y}`]) {
              ctx.fillStyle = '#7a5015';
              ctx.fillRect(tx + 6, ty + 8, 20, 16);
              ctx.fillStyle = '#f1c40f';
              ctx.fillRect(tx + 14, ty + 12, 4, 4);
            } else {
              ctx.fillStyle = '#2ecc71';
              ctx.fillRect(tx + 14, ty + 20, 4, 6);
            }
            break;
          case 7: // Growing Crop (Stage 2)
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(tx + 10, ty + 12, 3, 14);
            ctx.fillRect(tx + 18, ty + 15, 3, 11);
            break;
          case 8: // Fully Grown Crop (Stage 3)
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(tx + 8, ty + 6, 3, 20);
            ctx.fillRect(tx + 16, ty + 4, 3, 22);
            ctx.fillRect(tx + 24, ty + 8, 3, 18);
            ctx.fillStyle = '#e67e22';
            ctx.fillRect(tx + 6, ty + 6, 7, 4);
            ctx.fillRect(tx + 14, ty + 4, 7, 4);
            ctx.fillRect(tx + 22, ty + 8, 7, 4);
            break;
        }
      }
    }
    
    // Render Citizens
    this.citizens.forEach(cit => this.drawCharacter(cit));
    
    // Render Other Multiplayer Players
    for (const id in this.otherPlayers) {
      this.drawCharacter(this.otherPlayers[id]);
    }
    
    // Render Local Player
    this.drawCharacter(this.player);
    
    // Render Speech bubbles (in a separate pass so they draw on top of everything)
    this.drawChatBubble(this.player);
    this.citizens.forEach(cit => this.drawChatBubble(cit));
    for (const id in this.otherPlayers) {
      this.drawChatBubble(this.otherPlayers[id]);
    }
    
    ctx.restore();
  }
  
  drawCharacter(char) {
    const ctx = this.ctx;
    
    // Smooth positions using moveProgress interpolation
    const drawX = (char.x + (char.targetX - char.x) * char.moveProgress) * this.tileSize;
    const drawY = (char.y + (char.targetY - char.y) * char.moveProgress) * this.tileSize;
    
    // Character body details
    const bobbing = char.moving ? Math.sin(this.time * 2.5) * 2 : 0;
    
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(drawX + 16, drawY + 28, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Character head/body rectangle (retro 2D style)
    ctx.fillStyle = char.color;
    ctx.fillRect(drawX + 8, drawY + 8 + bobbing, 16, 18);
    
    // Eye indicators based on facing direction
    ctx.fillStyle = '#ffffff';
    let ex1 = 0, ey1 = 0, ex2 = 0, ey2 = 0;
    switch (char.facing) {
      case 'down':
        ex1 = 11; ey1 = 14; ex2 = 17; ey2 = 14;
        break;
      case 'up':
        // no eyes shown when walking up
        break;
      case 'left':
        ex1 = 9; ey1 = 14; ex2 = 13; ey2 = 14;
        break;
      case 'right':
        ex1 = 15; ey1 = 14; ex2 = 19; ey2 = 14;
        break;
    }
    
    if (char.facing !== 'up') {
      ctx.fillRect(drawX + ex1, drawY + ey1 + bobbing, 2, 2);
      ctx.fillRect(drawX + ex2, drawY + ey2 + bobbing, 2, 2);
      ctx.fillStyle = '#000000';
      ctx.fillRect(drawX + ex1 + (char.facing === 'left' ? -1 : 1), drawY + ey1 + bobbing, 1, 1);
      ctx.fillRect(drawX + ex2 + (char.facing === 'left' ? -1 : 1), drawY + ey2 + bobbing, 1, 1);
    }
    
    // Drawing short name tag
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.font = '8px monospace';
    const textWidth = ctx.measureText(char.name).width;
    ctx.fillRect(drawX + 16 - textWidth/2 - 3, drawY - 6, textWidth + 6, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(char.name, drawX + 16 - textWidth/2, drawY + 2);
  }
  
  drawChatBubble(char) {
    if (!char.chatBubble) return;

    // Proximity check: Only show chat bubbles if within 6 grid cells of the player
    if (char.id !== 'local_player') {
      const dist = Math.sqrt(Math.pow(this.player.x - char.x, 2) + Math.pow(this.player.y - char.y, 2));
      if (dist > 6) return;
    }
    
    const ctx = this.ctx;
    const drawX = (char.x + (char.targetX - char.x) * char.moveProgress) * this.tileSize;
    const drawY = (char.y + (char.targetY - char.y) * char.moveProgress) * this.tileSize;
    
    const bubbleText = char.chatBubble;
    ctx.font = '10px sans-serif';
    const padding = 8;
    const textWidth = ctx.measureText(bubbleText).width;
    const bubbleWidth = Math.min(120, textWidth + padding * 2);
    const bubbleHeight = 24 + Math.floor(bubbleText.length / 18) * 10;
    
    const bx = drawX + 16 - bubbleWidth / 2;
    const by = drawY - bubbleHeight - 12;
    
    // Draw bubble bg
    ctx.fillStyle = 'rgba(15, 17, 26, 0.9)';
    ctx.strokeStyle = char.color;
    ctx.lineWidth = 1;
    
    // Rounded rect
    ctx.beginPath();
    ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 6);
    ctx.fill();
    ctx.stroke();
    
    // Draw pointer triangle
    ctx.fillStyle = 'rgba(15, 17, 26, 0.9)';
    ctx.beginPath();
    ctx.moveTo(drawX + 12, by + bubbleHeight);
    ctx.lineTo(drawX + 16, by + bubbleHeight + 6);
    ctx.lineTo(drawX + 20, by + bubbleHeight);
    ctx.fill();
    
    ctx.strokeStyle = char.color;
    ctx.beginPath();
    ctx.moveTo(drawX + 12, by + bubbleHeight);
    ctx.lineTo(drawX + 16, by + bubbleHeight + 6);
    ctx.lineTo(drawX + 20, by + bubbleHeight);
    ctx.stroke();
    
    // Draw text inside (multiline wrap)
    ctx.fillStyle = '#ffffff';
    const words = bubbleText.split(' ');
    let line = '';
    let currentY = by + 14;
    
    for (let i = 0; i < words.length; i++) {
      let testLine = line + words[i] + ' ';
      let metrics = ctx.measureText(testLine);
      if (metrics.width > bubbleWidth - padding * 2 && i > 0) {
        ctx.fillText(line, bx + padding, currentY);
        line = words[i] + ' ';
        currentY += 12;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, bx + padding, currentY);
  }
}
