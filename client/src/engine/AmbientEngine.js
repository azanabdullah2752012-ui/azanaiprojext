// AmbientEngine - Canvas-based retro rendering and movement logic

export class AmbientEngine {
  constructor(canvas, onCitizenClick, onNearCitizen) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.onCitizenClick = onCitizenClick;
    this.onNearCitizen = onNearCitizen; // Trigger popup prompt: (citizenId) or null
    
    this.tileSize = 32; // pixel size of one grid cell
    this.scale = 2;     // canvas rendering scale (retro feel)
    
    // Map dimensions: 32x24 grid
    this.mapWidth = 32;
    this.mapHeight = 24;
    
    // Camera center offset
    this.camera = { x: 0, y: 0 };
    
    // Time tracking for water waves / sprite bobbing
    this.time = 0;
    
    this.initializeMap();
    this.initializePlayer();
    this.initializeCitizens();
    
    this.setupClickEvent();
  }
  
  initializeMap() {
    // Layer 1: Terrain (0 = Grass, 1 = Road, 2 = Water, 3 = Wood Floor, 4 = Stone Floor)
    this.terrainMap = Array(this.mapHeight).fill(null).map(() => Array(this.mapWidth).fill(0));
    
    // Layer 2: Structures (0 = Empty, 1 = Wall/Brick, 2 = Tree, 3 = Table, 4 = Chair, 5 = Chest, 6 = Water Edge/Fence)
    this.structureMap = Array(this.mapHeight).fill(null).map(() => Array(this.mapWidth).fill(0));
    
    // Draw paths/roads (horizontal street and vertical alley)
    for (let x = 0; x < this.mapWidth; x++) {
      this.terrainMap[12][x] = 1;
      this.terrainMap[13][x] = 1;
    }
    for (let y = 6; y < 18; y++) {
      this.terrainMap[y][10] = 1;
      this.terrainMap[y][11] = 1;
    }
    
    // Create a lake at top-right
    for (let y = 1; y < 7; y++) {
      for (let x = 20; x < 30; x++) {
        this.terrainMap[y][x] = 2;
        this.structureMap[y][x] = 6; // solid water
      }
    }
    
    // Place trees around the lake and map borders
    const trees = [
      [2,18], [3,18], [4,19], [6,19], [7,20], [7,22], [7,25], [7,28],
      [1,1], [2,1], [1,2], [8,3], [9,4], [10,2], [18,4], [19,3], [20,5],
      [22,10], [21,9], [22,12], [22,13], [20,28], [21,29], [18,30]
    ];
    trees.forEach(([ty, tx]) => {
      if (ty < this.mapHeight && tx < this.mapWidth) {
        this.structureMap[ty][tx] = 2; // Tree
      }
    });
    
    // House 1: Blacksmith cottage (top-left) - Stone floor
    for (let y = 2; y <= 6; y++) {
      for (let x = 3; x <= 8; x++) {
        this.terrainMap[y][x] = 4; // Stone floor
        if (y === 2 || y === 6 || x === 3 || x === 8) {
          // Walls around cottage
          this.structureMap[y][x] = 1; 
        }
      }
    }
    this.structureMap[6][6] = 0; // Door (walkable)
    this.structureMap[3][4] = 3; // Blacksmith Table
    
    // House 2: Baker cottage (bottom-right) - Wood floor
    for (let y = 16; y <= 20; y++) {
      for (let x = 18; x <= 24; x++) {
        this.terrainMap[y][x] = 3; // Wood floor
        if (y === 16 || y === 20 || x === 18 || x === 24) {
          this.structureMap[y][x] = 1; // Walls
        }
      }
    }
    this.structureMap[16][21] = 0; // Door (walkable)
    this.structureMap[18][22] = 3; // Baker Counter
    this.structureMap[18][20] = 5; // Chest
  }
  
  initializePlayer() {
    this.player = {
      id: 'local_player',
      name: 'Player',
      x: 10,             // cell coordinates
      y: 13,
      targetX: 10,       // target cell coordinates during interpolation
      targetY: 13,
      moving: false,
      moveProgress: 0,   // 0 to 1
      speed: 0.15,       // movement speed per tick
      color: '#00f0ff',
      facing: 'down',
      avatarType: 'human',
      chatBubble: null,
      chatTimer: 0
    };
  }
  
  initializeCitizens() {
    // List of active citizens (initially mock static ones for Milestone 1 visualization)
    // Milestone 3/4 will plug these directly to server socket updates.
    this.citizens = [
      {
        id: 'npc_alex',
        name: 'Alex (Blacksmith)',
        x: 5,
        y: 4,
        targetX: 5,
        targetY: 4,
        moving: false,
        moveProgress: 0,
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
        x: 21,
        y: 18,
        targetX: 21,
        targetY: 18,
        moving: false,
        moveProgress: 0,
        color: '#ff007f',
        facing: 'left',
        job: 'Baker',
        thought: 'The bread ovens are heating up nicely today.',
        status: 'working',
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
            inventory: ['Apple x3', 'Map x1'],
            money: 45
          });
        }
      }
    });
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
    
    // Render Layer 1: Terrain
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tx = x * this.tileSize;
        const ty = y * this.tileSize;
        const type = this.terrainMap[y][x];
        
        switch (type) {
          case 0: // Grass
            ctx.fillStyle = '#1e331c';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            // Draw some mini grass blades procedurally
            ctx.strokeStyle = '#2b4d28';
            ctx.lineWidth = 1;
            if ((x + y) % 3 === 0) {
              ctx.beginPath();
              ctx.moveTo(tx + 8, ty + 12);
              ctx.lineTo(tx + 10, ty + 6);
              ctx.lineTo(tx + 12, ty + 12);
              ctx.stroke();
            }
            if ((x * 2 + y) % 5 === 0) {
              ctx.beginPath();
              ctx.moveTo(tx + 20, ty + 24);
              ctx.lineTo(tx + 22, ty + 18);
              ctx.lineTo(tx + 24, ty + 24);
              ctx.stroke();
            }
            break;
          case 1: // Road/Path
            ctx.fillStyle = '#2d2a26';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            ctx.fillStyle = '#37322d';
            // Subtle pebbles
            if ((x * y) % 4 === 1) {
              ctx.fillRect(tx + 4, ty + 6, 2, 2);
              ctx.fillRect(tx + 16, ty + 20, 2, 2);
            }
            break;
          case 2: // Water
            // Animated wave color styling
            const wave = Math.sin(this.time + x + y) * 2;
            ctx.fillStyle = y % 2 === 0 ? '#0f2942' : '#0c2238';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            ctx.fillStyle = '#19436b';
            ctx.fillRect(tx + 4 + wave, ty + 12, 10, 1);
            break;
          case 3: // Wood Floor
            ctx.fillStyle = '#3d2516';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#2b1a0f';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);
            break;
          case 4: // Stone Floor
            ctx.fillStyle = '#2c2e35';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#1e1f24';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);
            break;
        }
      }
    }
    
    // Render Layer 2: Structures
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tx = x * this.tileSize;
        const ty = y * this.tileSize;
        const struct = this.structureMap[y][x];
        
        switch (struct) {
          case 1: // Wall/Brick
            ctx.fillStyle = '#473d38';
            ctx.fillRect(tx, ty, this.tileSize, this.tileSize);
            ctx.fillStyle = '#574c46';
            ctx.fillRect(tx + 2, ty + 2, this.tileSize - 4, this.tileSize - 4);
            ctx.strokeStyle = '#2d2522';
            ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);
            break;
          case 2: // Tree
            // Trunk
            ctx.fillStyle = '#4c3218';
            ctx.fillRect(tx + 12, ty + 18, 8, 14);
            // Foliage
            ctx.fillStyle = '#1c4515';
            ctx.beginPath();
            ctx.arc(tx + 16, ty + 12, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#285e20';
            ctx.beginPath();
            ctx.arc(tx + 14, ty + 10, 10, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 3: // Table
            ctx.fillStyle = '#613b1d';
            ctx.fillRect(tx + 2, ty + 4, this.tileSize - 4, this.tileSize - 8);
            ctx.fillStyle = '#804f27';
            ctx.fillRect(tx + 4, ty + 6, this.tileSize - 8, this.tileSize - 12);
            break;
          case 5: // Chest
            ctx.fillStyle = '#7a5015';
            ctx.fillRect(tx + 6, ty + 8, 20, 16);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(tx + 14, ty + 14, 4, 4); // lock
            break;
        }
      }
    }
    
    // Render Citizens
    this.citizens.forEach(cit => this.drawCharacter(cit));
    
    // Render Local Player
    this.drawCharacter(this.player);
    
    // Render Speech bubbles (in a separate pass so they draw on top of everything)
    this.drawChatBubble(this.player);
    this.citizens.forEach(cit => this.drawChatBubble(cit));
    
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
