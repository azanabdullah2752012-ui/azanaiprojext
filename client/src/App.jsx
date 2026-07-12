import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { io } from 'socket.io-client';
import { AmbientEngine } from './engine/AmbientEngine';
import { InputController } from './engine/Input';
import { AIConsole } from './components/AIConsole';
import { ChatBox } from './components/ChatBox';
import { NPCChatModal } from './components/NPCChatModal';
import { ChestModal } from './components/ChestModal';
import { QuestBoardModal } from './components/QuestBoardModal';

export default function App() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  
  // Login / Profile customization
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState('#00f0ff');
  
  // Tabs: 'inspector' or 'logs'
  const [activeTab, setActiveTab] = useState('inspector');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [nearCitizen, setNearCitizen] = useState(null);
  const [activeChatNPC, setActiveChatNPC] = useState(null);
  const [nearChest, setNearChest] = useState(null);
  const [activeChest, setActiveChest] = useState(null);
  const [playerInventory, setPlayerInventory] = useState(['Apple x3', 'Wood x10', 'Coins x50']);
  
  // Game metrics
  const [simTime, setSimTime] = useState({ hour: 8, minute: 0 });
  const [playerCoords, setPlayerCoords] = useState({ x: 32, y: 34 });
  const [populationCount, setPopulationCount] = useState(6);
  const [playerEnergy, setPlayerEnergy] = useState(100);
  const [activeBuildItem, setActiveBuildItem] = useState(null);
  const [playerMoney, setPlayerMoney] = useState(50);
  const [nearCrop, setNearCrop] = useState(null);
  const [editorMode, setEditorMode] = useState(false);
  const [selectedBrush, setSelectedBrush] = useState({ type: 'terrain', id: 0 });
  const [playerHP, setPlayerHP] = useState(100);
  const [playerMaxHP, setPlayerMaxHP] = useState(100);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerXP, setPlayerXP] = useState(0);
  const [playerATK, setPlayerATK] = useState(10);
  const [playerDEF, setPlayerDEF] = useState(2);
  const [equippedWeapon, setEquippedWeapon] = useState(null);
  const [equippedArmor, setEquippedArmor] = useState(null);
  const [activeQuests, setActiveQuests] = useState([]);
  const [showQuestBoard, setShowQuestBoard] = useState(false);
  const [nearQuestBoard, setNearQuestBoard] = useState(false);
  
  // Chat logs
  const [messages, setMessages] = useState([
    {
      sender: 'System',
      time: '08:00 AM',
      text: 'CivilOS Initialized. Active Citizens: 6. Version 0.2.0.',
      type: 'system'
    }
  ]);

  const colorPresets = ['#00f0ff', '#ff007f', '#39ff14', '#ffb700', '#aa3bff'];

  // Start world socket connection
  const handleEnterWorld = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    // Switch state
    setJoined(true);
  };

  // Hook to handle canvas initialization, game loop, and sockets
  useEffect(() => {
    if (!canvasRef.current || !joined) return;
    
    const canvas = canvasRef.current;
    canvas.width = 720;
    canvas.height = 540;
    
    const input = new InputController();
    inputRef.current = input;
    
    // Connect to local Socket.io server
    const serverUrl = `http://${window.location.hostname}:3001`;
    const socket = io(serverUrl);
    socketRef.current = socket;
    
    const engine = new AmbientEngine(
      canvas,
      // Citizen click callback
      (citizen) => {
        setSelectedCitizen(citizen);
        setActiveTab('inspector');
      },
      // Near citizen trigger callback
      (citizen) => {
        setNearCitizen(citizen);
      },
      // Grid click callback
      (x, y) => {
        if (triggerGridBuildRef.current) {
          triggerGridBuildRef.current(x, y);
        }
      }
    );
    engineRef.current = engine;
    setPlayerInventory(engine.player.inventory);
    
    // Update player parameters in engine
    engine.player.name = username;
    engine.player.color = selectedColor;
    engine.player.def = playerDEF;

    engine.onPlayerDamage = (damage) => {
      setPlayerHP(prev => {
        const nextHP = Math.max(0, prev - damage);
        if (nextHP <= 0) {
          engine.player.x = 32;
          engine.player.y = 34;
          engine.player.targetX = 32;
          engine.player.targetY = 34;
          engine.player.moving = false;
          engine.player.moveProgress = 0;
          
          setMessages(prevMsgs => [
            ...prevMsgs,
            {
              sender: 'System',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `💀 You died! Respawned at Center Plaza. Lost 5 Coins.`,
              type: 'system'
            }
          ]);
          setPlayerMoney(coins => Math.max(0, coins - 5));
          return 50; 
        }
        return nextHP;
      });
    };
    
    // Emit join signal
    socket.emit('join-world', {
      name: username,
      color: selectedColor,
      x: engine.player.x,
      y: engine.player.y
    });

    // Socket Event listeners
    socket.on('connect', () => {
      console.log('[Socket] Connected to backend server');
    });
    
    socket.on('world-state', (data) => {
      // Load current online players
      data.players.forEach(p => {
        engine.addOtherPlayer(p);
      });
      setPopulationCount(6 + Object.keys(engine.otherPlayers).length);
    });
    
    socket.on('player-joined', (newPlayer) => {
      engine.addOtherPlayer(newPlayer);
      setPopulationCount(6 + Object.keys(engine.otherPlayers).length);
    });
    
    socket.on('player-moved', (data) => {
      engine.updateOtherPlayerPosition(data.id, data.x, data.y, data.facing);
    });
    
    socket.on('player-left', (data) => {
      engine.removeOtherPlayer(data.id);
      setPopulationCount(6 + Object.keys(engine.otherPlayers).length);
      
      // If we had this player inspected, close inspector
      setSelectedCitizen(prev => prev && prev.id === data.id ? null : prev);
    });
    
    socket.on('chat-sync', (msg) => {
      setMessages((prev) => [...prev, msg]);
      
      // Draw bubble overlay if a player spoke
      if (msg.type === 'player') {
        if (msg.id === socket.id) {
          engine.player.chatBubble = msg.text;
          engine.player.chatTimer = 180;
        } else {
          engine.showOtherPlayerChat(msg.id, msg.text);
        }
      }
    });

    socket.on('tile-painted', (data) => {
      if (engine) {
        if (data.brushType === 'terrain') {
          engine.terrainMap[data.y][data.x] = data.brushId;
        } else if (data.brushType === 'structure') {
          engine.structureMap[data.y][data.x] = data.brushId;
          if (data.brushId === 5) {
            engine.crops[`${data.x},${data.y}`] = { stage: 1, timer: 180 };
          } else {
            delete engine.crops[`${data.x},${data.y}`];
          }
        }
      }
    });

    socket.on('citizen-updated', (data) => {
      if (engine) {
        const npc = engine.citizens.find(c => c.id === data.id);
        if (npc) {
          npc.name = data.name;
          npc.job = data.job;
        }
      }
    });
    socket.on('load-map', (data) => {
      if (data.status === 'empty') {
        socket.emit('save-map', { terrain: engine.terrainMap, structure: engine.structureMap });
      } else {
        engine.terrainMap = data.terrain;
        engine.structureMap = data.structure;
      }
    });

    socket.on('load-player-profile', (profile) => {
      setPlayerLevel(profile.level);
      setPlayerXP(profile.xp);
      setPlayerHP(profile.hp);
      setPlayerMaxHP(profile.maxHp);
      setPlayerATK(profile.atk);
      setPlayerDEF(profile.def);
      setPlayerMoney(profile.money);
      setPlayerInventory(profile.inventory);
      
      engine.player.x = profile.x;
      engine.player.y = profile.y;
      engine.player.targetX = profile.x;
      engine.player.targetY = profile.y;
      engine.player.inventory = profile.inventory;
      engine.player.def = profile.def;
      setPlayerCoords({ x: profile.x, y: profile.y });
    });

    socket.on('load-citizens-state', (citizensData) => {
      if (citizensData && citizensData.length > 0) {
        citizensData.forEach(cit => {
          const match = engine.citizens.find(c => c.id === cit.id);
          if (match) {
            match.name = cit.name;
            match.job = cit.job;
            match.x = cit.x;
            match.y = cit.y;
            match.targetX = cit.x;
            match.targetY = cit.y;
            match.money = cit.money;
            match.inventory = cit.inventory;
          }
        });
      }
    });

    socket.emit('request-map');
    socket.emit('request-citizens');
    
    let animationFrameId;
    let lastTime = 0;
    let timeTickAcc = 0;
    
    let lastSentX = engine.player.x;
    let lastSentY = engine.player.y;
    
    const gameLoop = (timestamp) => {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      
      // Update simulator steps
      engine.update(input, simTime.hour);
      
      // Sync coordinates to state
      setPlayerCoords({ x: engine.player.x, y: engine.player.y });
      
      // Trigger socket send on movement cell transition
      if (engine.player.moving && (lastSentX !== engine.player.targetX || lastSentY !== engine.player.targetY)) {
        socket.emit('move-player', {
          x: engine.player.targetX,
          y: engine.player.targetY,
          facing: engine.player.facing
        });
        lastSentX = engine.player.targetX;
        lastSentY = engine.player.targetY;
      }
      
      // Draw screen layers
      engine.draw();
      
      // Clock simulation: 1 second real-time = 5 minutes game-time
      timeTickAcc += delta;
      if (timeTickAcc >= 1000) {
        setSimTime((prev) => {
          let m = prev.minute + 5;
          let h = prev.hour;
          if (m >= 60) {
            m = 0;
            h = (h + 1) % 24;
          }
          return { hour: h, minute: m };
        });
        setPlayerEnergy((e) => Math.max(0, e - 1));
        timeTickAcc = 0;
      }
      
      // Check E key press interaction
      // Find nearest chest
      let currentNearChest = null;
      const px = engine.player.x;
      const py = engine.player.y;
      for (const coords in engine.chests) {
        const [cx, cy] = coords.split(',').map(Number);
        const dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
        if (dist <= 1.5) {
          currentNearChest = { coords, items: engine.chests[coords] };
          break;
        }
      }
      setNearChest(currentNearChest);

      // Find nearest fully grown crop
      let currentNearCrop = null;
      for (const coords in engine.crops) {
        const crop = engine.crops[coords];
        if (crop.stage === 3) {
          const [cx, cy] = coords.split(',').map(Number);
          const dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
          if (dist <= 1.5) {
            currentNearCrop = coords;
            break;
          }
        }
      }
      setNearCrop(currentNearCrop);

      // Find proximity to Quest Board
      const distQuest = Math.sqrt(Math.pow(px - 31, 2) + Math.pow(py - 30, 2));
      const closeToQuestBoard = distQuest <= 1.5;
      setNearQuestBoard(closeToQuestBoard);

      // Spacebar attack sword swings
      if (input.consumeKey(' ')) {
        let tx = px;
        let ty = py;
        if (engine.player.facing === 'up') ty--;
        else if (engine.player.facing === 'down') ty++;
        else if (engine.player.facing === 'left') tx--;
        else if (engine.player.facing === 'right') tx++;

        engine.slashAnimations.push({ x: tx, y: ty, timer: 12 });

        engine.monsters.forEach((m, idx) => {
          if (m.x === tx && m.y === ty) {
            const damage = Math.max(1, playerATKRef.current - m.def);
            m.hp -= damage;
            engine.damagePopups.push({ x: m.x, y: m.y, text: `-${damage} HP 💥`, timer: 30, color: '#e74c3c' });

            if (m.hp <= 0) {
              engine.monsters.splice(idx, 1);
              
              addXP(m.xpReward);
              setPlayerMoney(c => c + m.coinReward);

              const timeStr = formatTime(simTimeRef.current.hour, simTimeRef.current.minute);
              setMessages(prev => [
                ...prev,
                {
                  sender: 'System',
                  time: timeStr,
                  text: `💥 Defeated ${m.name}! Gained +${m.xpReward} XP and +${m.coinReward} Coins.`,
                  type: 'system'
                }
              ]);

              setActiveQuests(prevQuests => {
                return prevQuests.map(q => {
                  if (q.status === 'active' && q.targetType === m.type) {
                    const newCurrent = Math.min(q.target, q.current + 1);
                    return {
                      ...q,
                      current: newCurrent,
                      status: newCurrent >= q.target ? 'ready' : 'active'
                    };
                  }
                  return q;
                });
              });
            }
          }
        });
      }
      
      // Check E key press interaction
      if (input.consumeKey('e')) {
        if (closeToQuestBoard) {
          setShowQuestBoard(true);
        } else if (currentNearCrop) {
          const [cx, cy] = currentNearCrop.split(',').map(Number);
          engine.structureMap[cy][cx] = 0; // empty Layer 2
          delete engine.crops[currentNearCrop];
          setNearCrop(null);

          const playerList = [...engine.player.inventory];
          const addOrStackItem = (list, itemStr) => {
            const parts = itemStr.split(' x');
            const name = parts[0];
            const count = parseInt(parts[1] || '1', 10);
            const existingIdx = list.findIndex(i => i.startsWith(name + ' x') || i === name);
            if (existingIdx !== -1) {
              const existingParts = list[existingIdx].split(' x');
              const existingCount = parseInt(existingParts[1] || '1', 10);
              list[existingIdx] = `${name} x${existingCount + count}`;
            } else {
              list.push(itemStr);
            }
          };

          addOrStackItem(playerList, 'Wheat x2');
          addOrStackItem(playerList, 'Wheat Seed x1');

          engine.player.inventory = playerList;
          setPlayerInventory(playerList);

          const timeStr = formatTime(simTime.hour, simTime.minute);
          setMessages((prev) => [
            ...prev,
            {
              sender: 'System',
              time: timeStr,
              text: `🌾 You harvested golden wheat! Gained: Wheat x2 and Wheat Seed x1.`,
              type: 'system'
            }
          ]);
        } else if (currentNearChest) {
          setActiveChest(currentNearChest);
        } else if (engine.citizens.length > 0) {
          let target = null;
          for (const cit of engine.citizens) {
            const dist = Math.sqrt(Math.pow(engine.player.x - cit.x, 2) + Math.pow(engine.player.y - cit.y, 2));
            if (dist <= 1.5) {
              target = cit;
              break;
            }
          }
          if (target) {
            setActiveChatNPC(target);
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      socket.disconnect();
    };
  }, [joined]);

  // Autosave loop to database every 30 seconds
  useEffect(() => {
    if (!joined) return;
    
    const interval = setInterval(() => {
      const engine = engineRef.current;
      const socket = socketRef.current;
      if (!engine || !socket) return;

      // 1. Save Player RPG Stats
      socket.emit('save-player-rpg', {
        name: username,
        level: playerLevelRef.current,
        xp: playerXPRef.current,
        hp: playerHPRef.current,
        maxHp: playerMaxHPRef.current,
        atk: playerATKRef.current,
        def: playerDEFRef.current,
        money: playerMoneyRef.current,
        inventory: playerInventoryRef.current,
        color: selectedColor,
        x: engine.player.x,
        y: engine.player.y
      });

      // 2. Save Citizens Coordinates/Money/Inventories
      const citizensList = engine.citizens.map(c => ({
        id: c.id,
        name: c.name,
        job: c.job,
        x: c.x,
        y: c.y,
        money: c.money,
        inventory: c.inventory
      }));
      socket.emit('save-citizens', citizensList);

      console.log('[Autosave] World state successfully written to SQLite.');
    }, 30000);

    return () => clearInterval(interval);
  }, [joined]);
  
  // Dialog trigger with NPC
  const triggerNPCInteraction = (npc) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    const timeStr = formatTime(simTime.hour, simTime.minute);
    
    // Instead of local mock only, send a chat message so it logs locally and fits the log pipeline
    if (socketRef.current) {
      socketRef.current.emit('send-chat', { text: `Hello, ${npc.name}!` });
    }
    
    // NPC responds
    setTimeout(() => {
      let npcReply = '';
      if (npc.id === 'npc_alex') {
        npcReply = "Greetings, traveler! I'm tending the anvil forge. Looking for quality tools?";
      } else if (npc.id === 'npc_sarah') {
        npcReply = "Hi! Smells good, right? Just finished baking a fresh batch of bread.";
      } else if (npc.id === 'npc_ethan') {
        npcReply = "Hello! I am Mayor Ethan. Welcome to our village! Let me know if you need anything.";
      } else if (npc.id === 'npc_lily') {
        npcReply = "Hi there! I'm Lily, the local teacher. Class is starting soon!";
      } else if (npc.id === 'npc_noah') {
        npcReply = "Howdy! I'm Noah, the farmer. Hard work pays off, but it's peaceful here.";
      } else if (npc.id === 'npc_emma') {
        npcReply = "Hello, traveler. I'm Dr. Emma. Stay healthy, and drink plenty of water!";
      } else {
        npcReply = "Hello! Nice to meet you.";
      }
      
      npc.chatBubble = npcReply;
      npc.chatTimer = 180;
      
      setMessages((prev) => [
        ...prev,
        {
          sender: npc.name,
          time: timeStr,
          text: npcReply,
          type: 'citizen'
        }
      ]);
      
      setSelectedCitizen(npc);
      setActiveTab('inspector');
    }, 600);
  };
  
  const handleSendMessage = (text) => {
    if (socketRef.current) {
      socketRef.current.emit('send-chat', { text: text });
    }
  };

  const handleNPCChatBubble = (npcId, text) => {
    const engine = engineRef.current;
    if (engine) {
      const npc = engine.citizens.find(c => c.id === npcId);
      if (npc) {
        npc.chatBubble = text;
        npc.chatTimer = 180;
        setSelectedCitizen(npc);
        setActiveTab('inspector');
      }
    }
    const timeStr = formatTime(simTime.hour, simTime.minute);
    setMessages((prev) => [
      ...prev,
      {
        sender: engine?.citizens.find(c => c.id === npcId)?.name || 'Citizen',
        time: timeStr,
        text: text,
        type: 'citizen'
      }
    ]);
  };

  const handleTransferItem = (idx, direction) => {
    const engine = engineRef.current;
    if (!engine || !activeChest) return;

    const chestCoords = activeChest.coords;
    const chestList = [...engine.chests[chestCoords]];
    const playerList = [...engine.player.inventory];

    const addOrStackItem = (list, itemStr) => {
      const parts = itemStr.split(' x');
      const name = parts[0];
      const count = parseInt(parts[1] || '1', 10);
      
      const existingIdx = list.findIndex(i => i.startsWith(name + ' x') || i === name);
      if (existingIdx !== -1) {
        const existingParts = list[existingIdx].split(' x');
        const existingCount = parseInt(existingParts[1] || '1', 10);
        list[existingIdx] = `${name} x${existingCount + count}`;
      } else {
        list.push(itemStr);
      }
    };

    const removeItem = (list, itemIndex) => {
      const itemStr = list[itemIndex];
      const parts = itemStr.split(' x');
      const name = parts[0];
      const count = parseInt(parts[1] || '1', 10);
      
      if (count > 1) {
        list[itemIndex] = `${name} x${count - 1}`;
      } else {
        list.splice(itemIndex, 1);
      }
      return `${name} x1`;
    };

    if (direction === 'take') {
      const movedItem = removeItem(chestList, idx);
      addOrStackItem(playerList, movedItem);
    } else if (direction === 'deposit') {
      const movedItem = removeItem(playerList, idx);
      addOrStackItem(chestList, movedItem);
    }

    engine.chests[chestCoords] = chestList;
    engine.player.inventory = playerList;

    setPlayerInventory(playerList);
    setActiveChest({ coords: chestCoords, items: chestList });

    if (selectedCitizen && selectedCitizen.id === 'local_player') {
      setSelectedCitizen(prev => ({
        ...prev,
        inventory: playerList
      }));
    }
  };

  const handleUseItem = (name) => {
    const engine = engineRef.current;
    if (!engine) return;

    const timeStr = formatTime(simTime.hour, simTime.minute);

    if (['Apple', 'Bread'].includes(name)) {
      const playerList = [...engine.player.inventory];
      const itemIdx = playerList.findIndex(i => i.startsWith(name + ' x') || i === name);
      if (itemIdx === -1) return;

      const parts = playerList[itemIdx].split(' x');
      const count = parseInt(parts[1] || '1', 10);
      if (count > 1) {
        playerList[itemIdx] = `${name} x${count - 1}`;
      } else {
        playerList.splice(itemIdx, 1);
      }

      const val = name === 'Apple' ? 15 : 30;
      let newEnergy = 100;
      setPlayerEnergy((prev) => {
        newEnergy = Math.min(100, prev + val);
        return newEnergy;
      });

      engine.player.inventory = playerList;
      setPlayerInventory(playerList);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `You consumed 1 ${name}. Energy is restored by +${val}% to ${newEnergy}%.`,
          type: 'system'
        }
      ]);

      if (selectedCitizen && selectedCitizen.id === 'local_player') {
        setSelectedCitizen(prev => ({
          ...prev,
          inventory: playerList
        }));
      }
    } else if (['Wood', 'Iron Ore', 'Wheat Seed'].includes(name)) {
      setActiveBuildItem(name);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `Build Mode: ${name} selected. Click an adjacent empty tile on the map to place/plant.`,
          type: 'system'
        }
      ]);
    }
  };

  const handleTrade = (type, itemName, itemPrice) => {
    const engine = engineRef.current;
    if (!engine) return;

    const timeStr = formatTime(simTime.hour, simTime.minute);
    const playerList = [...engine.player.inventory];

    const addOrStackItem = (list, itemStr) => {
      const parts = itemStr.split(' x');
      const name = parts[0];
      const count = parseInt(parts[1] || '1', 10);
      const existingIdx = list.findIndex(i => i.startsWith(name + ' x') || i === name);
      if (existingIdx !== -1) {
        const existingParts = list[existingIdx].split(' x');
        const existingCount = parseInt(existingParts[1] || '1', 10);
        list[existingIdx] = `${name} x${existingCount + count}`;
      } else {
        list.push(itemStr);
      }
    };

    const removeItem = (list, itemIndex) => {
      const itemStr = list[itemIndex];
      const parts = itemStr.split(' x');
      const name = parts[0];
      const count = parseInt(parts[1] || '1', 10);
      if (count > 1) {
        list[itemIndex] = `${name} x${count - 1}`;
      } else {
        list.splice(itemIndex, 1);
      }
      return `${name} x1`;
    };

    if (type === 'buy') {
      if (playerMoney < itemPrice) return;
      setPlayerMoney(prev => prev - itemPrice);
      
      let equipMsg = "";
      if (itemName === 'Broadsword') {
        setEquippedWeapon('Broadsword');
        setPlayerATK(25);
        equipMsg = " ⚔️ Equipped Broadsword! ATK is now 25.";
      } else if (itemName === 'Iron Plate Armor') {
        setEquippedArmor('Iron Plate Armor');
        setPlayerDEF(7);
        equipMsg = " 🛡️ Equipped Iron Plate Armor! DEF is now 7.";
      } else {
        addOrStackItem(playerList, itemName);
      }
      
      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `💰 You bought 1 ${itemName} for ${itemPrice} Coins.${equipMsg}`,
          type: 'system'
        }
      ]);
    } else if (type === 'sell') {
      const itemIdx = playerList.findIndex(i => i.startsWith(itemName + ' x') || i === itemName);
      if (itemIdx === -1) return;

      removeItem(playerList, itemIdx);
      setPlayerMoney(prev => prev + itemPrice);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `💰 You sold 1 ${itemName} for ${itemPrice} Coins.`,
          type: 'system'
        }
      ]);
    }

    engine.player.inventory = playerList;
    setPlayerInventory(playerList);
  };

  const addXP = (amount) => {
    setPlayerXP(prevXP => {
      let newXP = prevXP + amount;
      let reqXP = playerLevelRef.current * 100;
      let newLevel = playerLevelRef.current;
      let newMaxHP = playerMaxHP;
      let newATK = playerATK;
      
      while (newXP >= reqXP) {
        newXP -= reqXP;
        newLevel += 1;
        newMaxHP += 20;
        newATK += 4;
        reqXP = newLevel * 100;
        
        const engine = engineRef.current;
        if (engine) {
          engine.damagePopups.push({
            x: engine.player.x,
            y: engine.player.y,
            text: 'LEVEL UP! ✨',
            timer: 60,
            color: '#f1c40f'
          });
        }
      }
      
      if (newLevel !== playerLevelRef.current) {
        setPlayerLevel(newLevel);
        setPlayerMaxHP(newMaxHP);
        setPlayerHP(newMaxHP); 
        setPlayerATK(newATK);
      }
      return newXP;
    });
  };

  const handleAcceptQuest = (quest) => {
    setActiveQuests(prev => {
      if (prev.some(q => q.id === quest.id)) return prev;
      return [
        ...prev,
        {
          id: quest.id,
          title: quest.title,
          targetType: quest.targetType,
          current: 0,
          target: quest.target,
          rewardXP: quest.rewardXP,
          rewardCoins: quest.rewardCoins,
          status: 'active'
        }
      ];
    });
    const timeStr = formatTime(simTime.hour, simTime.minute);
    setMessages(prev => [
      ...prev,
      {
        sender: 'System',
        time: timeStr,
        text: `📜 Accepted Quest: ${quest.title}. Goal: ${quest.description}`,
        type: 'system'
      }
    ]);
  };

  const handleCompleteQuest = (questId) => {
    const active = activeQuests.find(q => q.id === questId);
    if (!active) return;

    if (active.targetType.startsWith('item_')) {
      const itemName = active.targetType.replace('item_', '');
      const engine = engineRef.current;
      if (!engine) return;

      const playerList = [...engine.player.inventory];
      const itemIdx = playerList.findIndex(i => i.startsWith(itemName + ' x') || i === itemName);
      if (itemIdx === -1) return;

      const parts = playerList[itemIdx].split(' x');
      const count = parseInt(parts[1] || '1', 10);
      if (count < active.target) return; 

      if (count > active.target) {
        playerList[itemIdx] = `${itemName} x${count - active.target}`;
      } else {
        playerList.splice(itemIdx, 1);
      }
      engine.player.inventory = playerList;
      setPlayerInventory(playerList);
    }

    addXP(active.rewardXP);
    setPlayerMoney(prev => prev + active.rewardCoins);
    setActiveQuests(prev => prev.filter(q => q.id !== questId));

    const timeStr = formatTime(simTime.hour, simTime.minute);
    setMessages(prev => [
      ...prev,
      {
        sender: 'System',
        time: timeStr,
        text: `🎉 Quest Completed: ${active.title}! Gained +${active.rewardXP} XP and +${active.rewardCoins} Coins.`,
        type: 'system'
      }
    ]);
  };

  const handleGridBuild = (x, y, itemName) => {
    const engine = engineRef.current;
    if (!engine) return;

    const dist = Math.sqrt(Math.pow(engine.player.x - x, 2) + Math.pow(engine.player.y - y, 2));
    if (dist > 2.5) {
      const timeStr = formatTime(simTime.hour, simTime.minute);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `Too far away to build there! Move closer.`,
          type: 'system'
        }
      ]);
      return;
    }

    if (engine.structureMap[y][x] !== 0) {
      const timeStr = formatTime(simTime.hour, simTime.minute);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `Cannot place there! Coordinates already contain a structure.`,
          type: 'system'
        }
      ]);
      return;
    }

    if (engine.terrainMap[y][x] === 2) {
      const timeStr = formatTime(simTime.hour, simTime.minute);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `Cannot build on water!`,
          type: 'system'
        }
      ]);
      return;
    }

    const playerList = [...engine.player.inventory];
    const itemIdx = playerList.findIndex(i => i.startsWith(itemName + ' x') || i === itemName);
    if (itemIdx === -1) return;

    const parts = playerList[itemIdx].split(' x');
    const count = parseInt(parts[1] || '1', 10);
    if (count > 1) {
      playerList[itemIdx] = `${itemName} x${count - 1}`;
    } else {
      playerList.splice(itemIdx, 1);
    }

    if (itemName === 'Wood') {
      engine.structureMap[y][x] = 1;
    } else if (itemName === 'Iron Ore') {
      engine.structureMap[y][x] = 3;
    } else if (itemName === 'Wheat Seed') {
      engine.structureMap[y][x] = 5;
      engine.crops[`${x},${y}`] = { stage: 1, timer: 180 }; // track crop growth
    }

    engine.player.inventory = playerList;
    setPlayerInventory(playerList);
    setActiveBuildItem(null);

    const timeStr = formatTime(simTime.hour, simTime.minute);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'System',
        time: timeStr,
        text: `Successfully placed ${itemName} at grid cell X: ${x}, Y: ${y}.`,
        type: 'system'
      }
    ]);

    if (selectedCitizen && selectedCitizen.id === 'local_player') {
      setSelectedCitizen(prev => ({
        ...prev,
        inventory: playerList
      }));
    }
  };

  const handleUpdateCitizen = (npcId, newConfig) => {
    const engine = engineRef.current;
    if (!npcId || !engine) return;

    const npc = engine.citizens.find(c => c.id === npcId);
    if (npc) {
      npc.name = newConfig.name;
      npc.job = newConfig.job;

      if (socketRef.current) {
        socketRef.current.emit('update-citizen', { id: npcId, name: newConfig.name, job: newConfig.job });
      }

      setSelectedCitizen(prev => prev ? { ...prev, name: newConfig.name, job: newConfig.job } : null);

      const timeStr = formatTime(simTime.hour, simTime.minute);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'System',
          time: timeStr,
          text: `🛠️ Configured Citizen ${newConfig.name} profile settings successfully.`,
          type: 'system'
        }
      ]);
    }
  };

  const handleGridClick = (x, y) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (editorModeRef.current) {
      const brush = selectedBrushRef.current;
      if (brush.type === 'terrain') {
        engine.terrainMap[y][x] = brush.id;
      } else if (brush.type === 'structure') {
        engine.structureMap[y][x] = brush.id;
        if (brush.id === 5) {
          engine.crops[`${x},${y}`] = { stage: 1, timer: 180 };
        } else {
          delete engine.crops[`${x},${y}`];
        }
      }
      if (socketRef.current) {
        socketRef.current.emit('paint-tile', { x, y, brushType: brush.type, brushId: brush.id });
      }
    } else {
      if (activeBuildItemRef.current) {
        handleGridBuild(x, y, activeBuildItemRef.current);
      }
    }
  };

  const triggerGridBuildRef = useRef(null);
  triggerGridBuildRef.current = (x, y) => {
    handleGridClick(x, y);
  };

  const activeBuildItemRef = useRef(null);
  activeBuildItemRef.current = activeBuildItem;

  const playerLevelRef = useRef(1);
  playerLevelRef.current = playerLevel;

  const playerHPRef = useRef(100);
  playerHPRef.current = playerHP;

  const playerATKRef = useRef(10);
  playerATKRef.current = playerATK;

  const playerXPRef = useRef(0);
  playerXPRef.current = playerXP;

  const playerMaxHPRef = useRef(100);
  playerMaxHPRef.current = playerMaxHP;

  const playerDEFRef = useRef(2);
  playerDEFRef.current = playerDEF;

  const playerMoneyRef = useRef(50);
  playerMoneyRef.current = playerMoney;

  const playerInventoryRef = useRef([]);
  playerInventoryRef.current = playerInventory;

  const simTimeRef = useRef(null);
  simTimeRef.current = simTime;

  const editorModeRef = useRef(false);
  editorModeRef.current = editorMode;

  const selectedBrushRef = useRef(null);
  selectedBrushRef.current = selectedBrush;
  
  const formatTime = (h, m) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minStr = m < 10 ? '0' + m : m;
    return `${hour12}:${minStr} ${ampm}`;
  };

  return (
    <div className="app-container">
      {/* Left: Viewport */}
      <div className="viewport-container">
        <header className="viewport-header">
          <div className="title-area">
            <h1 className="main-title">CivilOS Simulator</h1>
            <span className="subtitle">Ambient Engine Canvas • v0.2.0 (Multiplayer)</span>
          </div>
          {joined && (
            <button
              onClick={() => setEditorMode(!editorMode)}
              style={{
                background: editorMode ? 'rgba(255, 183, 0, 0.15)' : 'rgba(0, 240, 255, 0.05)',
                border: `1px solid ${editorMode ? 'var(--accent-yellow)' : 'var(--glass-border)'}`,
                color: editorMode ? 'var(--accent-yellow)' : 'var(--text-muted)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '8px 16px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginLeft: '20px',
                transition: 'all 0.3s ease',
                outline: 'none',
                zIndex: 6
              }}
            >
              🛠️ {editorMode ? 'EDITOR: ACTIVE' : 'WORLD EDITOR'}
            </button>
          )}
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">Time</span>
              <span className="stat-value">{formatTime(simTime.hour, simTime.minute)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">LVL</span>
              <span className="stat-value" style={{ color: 'var(--accent-yellow)', fontWeight: 'bold' }}>{playerLevel}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">HP</span>
              <span className="stat-value" style={{ color: playerHP < 30 ? '#ff0055' : '#39ff14' }}>{playerHP}/{playerMaxHP}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">XP</span>
              <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{playerXP}/{playerLevel * 100}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">ATK</span>
              <span className="stat-value">{playerATK}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">DEF</span>
              <span className="stat-value">{playerDEF}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Money</span>
              <span className="stat-value" style={{ color: 'var(--accent-yellow)' }}>{playerMoney}c</span>
            </div>
          </div>
        </header>

        <div className="canvas-wrapper">
          {joined && activeBuildItem && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 240, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '8px 18px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#020205',
              fontWeight: 'bold',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.6)',
              zIndex: 5,
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              🛠️ BUILD MODE: Click adjacent tile to place [{activeBuildItem}]
              <button 
                onClick={() => setActiveBuildItem(null)}
                style={{
                  background: '#020205',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '9px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Canvas Element */}
          <canvas ref={canvasRef} style={{ filter: !joined ? 'blur(10px)' : 'none' }}></canvas>
          
          {/* Login / Swatch overlay */}
          {!joined && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(5, 7, 12, 0.45)',
              zIndex: 10
            }}>
              <form onSubmit={handleEnterWorld} style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-lg)',
                padding: '36px',
                width: '380px',
                display: 'flex', flexDirection: 'column', gap: 20,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <h2 style={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    Enter Civilization
                  </h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Configure profile for multiplayer sync</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Username</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="Enter name..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '12px 16px',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Avatar Hue</label>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        style={{
                          width: '28px', height: '28px',
                          borderRadius: '50%',
                          background: color,
                          border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                          boxShadow: selectedColor === color ? `0 0 10px ${color}` : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                <button type="submit" style={{
                  background: 'var(--accent-cyan)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  boxShadow: `0 0 15px var(--accent-cyan-glow)`,
                  transition: 'all 0.3s ease',
                  marginTop: 10
                }}>
                  INITIALIZE CONNECT
                </button>
              </form>
            </div>
          )}
          
          {joined && nearCitizen && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 0, 127, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              boxShadow: '0 0 10px rgba(255, 0, 127, 0.5)',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              Press [E] to talk to {nearCitizen.name}
            </div>
          )}

          {joined && editorMode && (
            <div style={{
              position: 'absolute',
              top: '80px',
              left: '20px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius-md)',
              padding: '16px',
              width: '160px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 10
            }}>
              <h4 style={{ color: 'var(--accent-yellow)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                Terrain Brushes
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {[
                  { id: 0, label: 'Grass', color: '#1e331c' },
                  { id: 1, label: 'Road', color: '#2d2a26' },
                  { id: 2, label: 'Water', color: '#0f2942' },
                  { id: 3, label: 'Wood', color: '#3d2516' },
                  { id: 4, label: 'Stone', color: '#2c2e35' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedBrush({ type: 'terrain', id: item.id })}
                    style={{
                      background: item.color,
                      border: selectedBrush.type === 'terrain' && selectedBrush.id === item.id 
                        ? '2px solid var(--accent-cyan)' 
                        : '1px solid var(--glass-border)',
                      borderRadius: '4px',
                      height: '30px',
                      fontSize: '9px',
                      color: '#fff',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title={item.label}
                  >
                    {item.label[0]}
                  </button>
                ))}
              </div>

              <h4 style={{ color: 'var(--accent-yellow)', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px', margin: 0 }}>
                Structure Brushes
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {[
                  { id: 0, label: 'Erase', emoji: '🧽' },
                  { id: 1, label: 'Wall', emoji: '🧱' },
                  { id: 2, label: 'Tree', emoji: '🌲' },
                  { id: 3, label: 'Table', emoji: '🪑' },
                  { id: 5, label: 'Chest', emoji: '📦' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedBrush({ type: 'structure', id: item.id })}
                    style={{
                      background: selectedBrush.type === 'structure' && selectedBrush.id === item.id 
                        ? 'rgba(0, 240, 255, 0.15)' 
                        : 'rgba(0,0,0,0.2)',
                      border: selectedBrush.type === 'structure' && selectedBrush.id === item.id 
                        ? '2px solid var(--accent-cyan)' 
                        : '1px solid var(--glass-border)',
                      borderRadius: '4px',
                      height: '34px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                    title={item.label}
                  >
                    <span>{item.emoji}</span>
                    <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {joined && nearQuestBoard && !activeChest && !activeChatNPC && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 183, 0, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#020205',
              fontWeight: 'bold',
              boxShadow: '0 0 10px rgba(255, 183, 0, 0.5)',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              Press [E] to read Quest Bulletin Board
            </div>
          )}

          {joined && nearCrop && !activeChest && !activeChatNPC && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(57, 255, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#020205',
              fontWeight: 'bold',
              boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              Press [E] to harvest Wheat crops
            </div>
          )}

          {joined && nearChest && !activeChest && !activeChatNPC && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 183, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '6px 16px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              boxShadow: '0 0 10px rgba(255, 183, 0, 0.5)',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              Press [E] to open Storage Chest
            </div>
          )}

          {joined && activeChatNPC && (
            <NPCChatModal
              npc={activeChatNPC}
              onClose={() => setActiveChatNPC(null)}
              onSendMessage={handleNPCChatBubble}
              playerMoney={playerMoney}
              playerItems={playerInventory}
              onTrade={handleTrade}
              playerName={username}
            />
          )}

          {joined && activeChest && (
            <ChestModal
              chestCoords={activeChest.coords}
              chestItems={activeChest.items}
              playerItems={playerInventory}
              onClose={() => setActiveChest(null)}
              onTransferItem={handleTransferItem}
            />
          )}
          
          {joined && (
            <div className="controls-overlay">
              <div className="control-pill">
                <span style={{ color: 'var(--accent-cyan)' }}>WASD / Arrows</span> Move Avatar
              </div>
              <div className="control-pill">
                <span style={{ color: 'var(--accent-cyan)' }}>Mouse Click</span> Inspect Citizen
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Control Sidebar */}
      <div className="sidebar-container">
        <div className="sidebar-header">
          <span className="sidebar-title">CIVILIZATION CONSOLE</span>
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              INSPECTOR
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              LOGS
            </button>
          </div>
        </div>

      {showQuestBoard && (
        <QuestBoardModal
          onClose={() => setShowQuestBoard(false)}
          activeQuests={activeQuests}
          onAcceptQuest={handleAcceptQuest}
          onCompleteQuest={handleCompleteQuest}
          playerItems={playerInventory}
        />
      )}

        <div className="sidebar-content">
          {activeTab === 'inspector' ? (
            <AIConsole 
              selectedCitizen={
                selectedCitizen && selectedCitizen.id === 'local_player'
                  ? { ...selectedCitizen, inventory: playerInventory, money: playerMoney }
                  : selectedCitizen
              } 
              onUseItem={handleUseItem} 
              editorMode={editorMode}
              onUpdateCitizen={handleUpdateCitizen}
            />
          ) : (
            <ChatBox messages={messages} onSendMessage={handleSendMessage} />
          )}
        </div>
      </div>
    </div>
  );
}
