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
    this.chests = {
      '14,8': ['Iron Ore x5', 'Hammer x1'],
      '51,42': ['Bread x6', 'Wheat x10'],
      '23,17': ['Coins x20', 'Apple x2'],   // Player's chest
      '43,17': ['Book x3', 'Paper x10'],     // School chest
      '52,7': ['Bandage x4', 'Medicine x2'], // Clinic chest
      '42,26': ['Gold Ring x1', 'Coins x100'], // Town Hall chest
      '9,41': ['Wheat Seed x15', 'Hoe x1']   // Farmer's chest
    };
    
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
        chatTimer: 0
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
        chatTimer: 0
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
        chatTimer: 0
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
        chatTimer: 0
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
        chatTimer: 0
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
        chatTimer: 0
      }
    ];
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
  
  update(inputController) {
    this.time += 0.05;
    
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
          case 5: // Chest / Crop
            ctx.fillStyle = '#7a5015';
            ctx.fillRect(tx + 6, ty + 8, 20, 16);
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
