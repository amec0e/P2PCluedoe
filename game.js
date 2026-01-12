const THEMES = Object.freeze({
    cluedoeclassic: Object.freeze({
        name: 'Cluedoe Classic',
        objective: 'Someone has been murdered, everyone is a suspect, find out who did the crime.',
        suspects: Object.freeze(['Col. Mustard', 'Miss Scarlet', 'Mrs. Peacock', 'Mrs. White', 'Prof. Plum', 'Rev. Green']),
        weapons: Object.freeze(['Candlestick', 'Knife', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench']),
        rooms: Object.freeze(['Ballroom', 'Billiard Room', 'Conservatory', 'Dining Room', 'Hall', 'Kitchen', 'Library', 'Lounge', 'Study']),
        characters: Object.freeze(['Benoit Blanc', 'Col. Mustard', 'Dr. Orchid', 'Eddie Valiant', 'Frank Drebin', 'Miss Scarlet', 'Mrs. Peacock', 'Mrs. White', 'Prof. Plum', 'Rev. Green', 'Sherlock Holmes'])
    }),
    strangethings: Object.freeze({
        name: 'Strange Things',
        objective: 'With all radio communications down, the team split up all over Hawkins and a defeated Demogorgon, you must figure out which one of the team defeated the Demogorgon. With what weapon and where in Hawkins.',
        suspects: Object.freeze(['Dustin', 'Eleven', 'Lucas', 'Max', 'Mike', 'Will']),
        weapons: Object.freeze(['Fireworks', 'Flame Thrower', '.357 Revolver', 'Shotgun', 'Nailed Baseball Bat', 'Wrist Rocket']),
        rooms: Object.freeze(['Castle Byers', 'Forest Hill Trailer Park', 'Hawkins Community Pool', 'Hawkins Highschool', 'Hawkins Memorial Hospital', 'Hawkins National Lab', 'Palace Arcade', 'Star Court Mall', 'The Creel House']),
        characters: Object.freeze(['Eddie Munson', 'Jim Hopper', 'Johnathan Byers', 'Murray Bauman', 'Nancy Wheeler', 'Robin Buckley', 'Steve Harrington'])
    })
});
let activeTheme = 'cluedoeclassic';
let SUSPECTS = THEMES[activeTheme].suspects;
let WEAPONS = THEMES[activeTheme].weapons;
let ROOMS = THEMES[activeTheme].rooms;
let CHARACTERS = THEMES[activeTheme].characters;
let gameState = {
    isHost: false,
    gameCode: null,
    playerName: null,
    players: [],
    myCards: [],
    solution: null,
    currentTurn: 0,
    gameStarted: false,
    notes: {},
    myCurrentRoom: 'Hallway',
    destinationRoom: null,
    movesRequired: 0,
    movesAccumulated: 0,
    isInRoom: false,
    suggestionRoomThisTurn: null,
    turnTimeLimit: 120,
    turnTimer: null,
    turnTimeRemaining: 0,
    selectedTheme: 'cluedoeclassic'
};
let peer = null;
let connections = {};
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeNotes();
});
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function initializeEventListeners() {
    document.getElementById('host-btn').addEventListener('click', startHosting);
    document.getElementById('join-btn').addEventListener('click', showJoinScreen);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('cancel-host-btn').addEventListener('click', () => {
        if (peer) peer.destroy();
        peer = null;
        connections = {};
        gameState.gameCode = null;
        gameState.playerName = null;
        gameState.players = [];
        gameState.isHost = false;
        showScreen('welcome-screen');
    });
    document.getElementById('join-game-btn').addEventListener('click', joinGame);
    document.getElementById('cancel-join-btn').addEventListener('click', () => {
        gameState.playerName = null;
        showScreen('welcome-screen');
    });
    document.getElementById('leave-lobby-btn').addEventListener('click', leaveLobby);
    document.getElementById('suggest-btn').addEventListener('click', makeSuggestion);
    document.getElementById('accuse-btn').addEventListener('click', makeAccusation);
    document.getElementById('leave-game-btn').addEventListener('click', leaveGame);
    document.getElementById('select-destination-btn').addEventListener('click', selectDestination);
    document.getElementById('roll-dice-btn').addEventListener('click', rollDice);
    document.getElementById('end-turn-btn').addEventListener('click', endTurn);
    document.getElementById('new-game-btn').addEventListener('click', () => {
        if (peer) peer.destroy();
        location.reload();
    });
}
function initializeNotes() {
    const allCards = [...SUSPECTS, ...WEAPONS, ...ROOMS];
    gameState.notes = {};
    allCards.forEach(card => {
        gameState.notes[card] = 'unknown';
    });
}
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}
function createCharacterButtons(containerId, onSelect) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    CHARACTERS.forEach(character => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'character-btn';
        btn.textContent = character;
        btn.onclick = () => onSelect(character, btn);
        container.appendChild(btn);
    });
}
// ===== HOST FUNCTIONS =====
function startHosting() {
    showScreen('host-screen');
    createThemeButtons();
    document.getElementById('host-objective-display').textContent = THEMES[gameState.selectedTheme].objective;
    createCharacterButtons('host-character-select', (character, btn) => {
        const takenByOther = gameState.players.some(p => p.name === character && !p.isHost);
        if (takenByOther) {
            alert(`${character} is already taken by another player.`);
            return;
        }
        document.querySelectorAll('#host-character-select .character-btn').forEach(b => {
            b.classList.remove('selected');
        });
        btn.classList.add('selected');
        gameState.playerName = character;
        if (!peer) {
            initializeHost();
        } else {
            gameState.players[0].name = character;
            gameState.players[0].hasChosenCharacter = true;
            updatePlayerList();
            checkCanStartGame();
            broadcast({
                type: 'player_list_update',
                players: gameState.players
            });
        }
    });
    const firstBtn = document.querySelector('#host-character-select .character-btn:first-child');
    if (firstBtn) {
        firstBtn.click();
    }
}
function createThemeButtons() {
    const container = document.getElementById('host-theme-select');
    container.innerHTML = '';
    Object.keys(THEMES).forEach(themeKey => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary btn-small';
        btn.textContent = THEMES[themeKey].name;
        if (themeKey === gameState.selectedTheme) {
            btn.classList.add('btn-primary', 'theme-selected');
            btn.classList.remove('btn-secondary');
        }
        btn.onclick = () => selectTheme(themeKey);
        container.appendChild(btn);
    });
}
function selectTheme(themeKey) {
    gameState.selectedTheme = themeKey;
    activeTheme = themeKey;
    SUSPECTS = THEMES[themeKey].suspects;
    WEAPONS = THEMES[themeKey].weapons;
    ROOMS = THEMES[themeKey].rooms;
    CHARACTERS = THEMES[themeKey].characters;
    initializeNotes();
    gameState.playerName = null;
    if (gameState.players.length > 0) {
        gameState.players.forEach((player, index) => {
            player.hasChosenCharacter = false;
            player.name = `Player ${index + 1}`;
        });
        updatePlayerList();
        checkCanStartGame();
    }
    document.querySelectorAll('#host-theme-select button').forEach(btn => {
        btn.classList.remove('btn-primary', 'theme-selected');
        btn.classList.add('btn-secondary');
    });
    event.target.classList.add('btn-primary', 'theme-selected');
    event.target.classList.remove('btn-secondary');
    document.getElementById('host-objective-display').textContent = THEMES[themeKey].objective;
    createCharacterButtons('host-character-select', (character, btn) => {
        const takenByOther = gameState.players.some(p => p.name === character && !p.isHost);
        if (takenByOther) {
            alert(`${character} is already taken by another player.`);
            return;
        }
        document.querySelectorAll('#host-character-select .character-btn').forEach(b => {
            b.classList.remove('selected');
        });
        btn.classList.add('selected');
        gameState.playerName = character;
        if (!peer) {
            initializeHost();
        } else {
            gameState.players[0].name = character;
            gameState.players[0].hasChosenCharacter = true;
            updatePlayerList();
            checkCanStartGame();
            broadcast({
                type: 'player_list_update',
                players: gameState.players
            });
        }
    });
    if (peer) {
        broadcast({
            type: 'theme_changed',
            theme: themeKey,
            players: gameState.players
        });
    }
}
function updateHostCharacterButtons() {
    const takenCharacters = gameState.players.map(p => p.name);
    const container = document.getElementById('host-character-select');
    if (container && container.children.length > 0) {
        Array.from(container.children).forEach(btn => {
            const character = btn.textContent;
            btn.classList.remove('taken');
            const takenByOther = gameState.players.some(p => p.name === character && !p.isHost);
            if (takenByOther) {
                btn.classList.add('taken');
            }
            if (character === gameState.playerName) {
                btn.classList.add('selected');
            }
        });
    }
}
function initializeHost() {
    gameState.isHost = true;
    gameState.gameCode = generateGameCode();
    gameState.players = [{ name: gameState.playerName, isHost: true, id: 'host', hasChosenCharacter: true }];
    peer = new Peer('cluedoe-' + gameState.gameCode, {
        debug: 2
    });
    peer.on('open', (id) => {
        document.getElementById('game-code').textContent = gameState.gameCode;
        document.getElementById('player-count').textContent = '1';
        updatePlayerList();
        checkCanStartGame();
    });
    peer.on('connection', (conn) => {
        setupConnection(conn);
    });
    peer.on('error', (err) => {
        alert('Connection error: ' + err.type);
    });
}
function generateGameCode() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}
function checkCanStartGame() {
    const allHaveChosen = gameState.players.every(p => p.hasChosenCharacter);
    const enoughPlayers = gameState.players.length >= 2;
    const startBtn = document.getElementById('start-game-btn');
    if (allHaveChosen && enoughPlayers) {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Game';
    } else if (!enoughPlayers) {
        startBtn.disabled = true;
        startBtn.textContent = 'Start Game (Need 2+ players)';
    } else {
        startBtn.disabled = true;
        startBtn.textContent = 'Start Game (All players must choose character)';
    }
}
function setupConnection(conn) {
    const playerId = conn.peer;
    conn.on('open', () => {
        connections[playerId] = conn;
    });
    conn.on('data', (data) => {
        if (data.type === 'join') {
            if (gameState.players.length >= 6) {
                conn.send({
                    type: 'join_rejected',
                    reason: 'Game is full (maximum 6 players)'
                });
                conn.close();
                return;
            }
            const playerNumber = gameState.players.length + 1;
            const tempName = `Player ${playerNumber}`;
            gameState.players.push({ 
                name: tempName, 
                id: playerId,
                isHost: false,
                hasChosenCharacter: false
            });
            updatePlayerList();
            document.getElementById('player-count').textContent = gameState.players.length;
            updateHostCharacterButtons();
            checkCanStartGame();
            conn.send({
                type: 'connected',
                players: gameState.players,
                yourPlayerId: playerId,
                theme: gameState.selectedTheme
            });
            broadcast({
                type: 'player_list_update',
                players: gameState.players
            });
        } else if (data.type === 'update_character') {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) {
                const newCharacter = data.newCharacter;
                if (gameState.players.some(p => p.name === newCharacter && p.id !== playerId)) {
                    conn.send({
                        type: 'character_taken',
                        character: newCharacter
                    });
                    return;
                }
                player.name = newCharacter;
                player.hasChosenCharacter = true;
                updatePlayerList();
                updateHostCharacterButtons();
                checkCanStartGame();
                broadcast({
                    type: 'player_list_update',
                    players: gameState.players
                });
                conn.send({
                    type: 'character_updated',
                    character: newCharacter
                });
            }
        } else {
            handleMessage(data, playerId);
        }
    });
    conn.on('close', () => {
        removePlayer(playerId);
    });
}
function updatePlayerList() {
    const list = document.getElementById('player-list');
    list.innerHTML = '';
    gameState.players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name + (player.isHost ? ' (Host)' : '');
        list.appendChild(li);
    });
}
function updatePlayerLobbyList() {
    const list = document.getElementById('player-lobby-list');
    list.innerHTML = '';
    gameState.players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name + (player.isHost ? ' (Host)' : '');
        list.appendChild(li);
    });
    document.getElementById('player-lobby-count').textContent = gameState.players.length;
}
function leaveLobby() {
    if (confirm('Are you sure you want to leave the lobby?')) {
        if (peer) peer.destroy();
        location.reload();
    }
}
function showJoinScreen() {
    showScreen('join-screen');
}
// ===== JOIN FUNCTIONS =====
async function joinGame() {
    const codeInput = document.getElementById('game-code-input').value.trim();
    if (codeInput.length !== 8 || !/^\d+$/.test(codeInput)) {
        showStatus('Please enter a valid 8-digit code', 'error');
        return;
    }
    gameState.gameCode = codeInput;
    gameState.isHost = false;
    showStatus('Connecting to game...', 'success');
    peer = new Peer();
    peer.on('open', (id) => {
        const hostId = 'cluedoe-' + gameState.gameCode;
        const conn = peer.connect(hostId);
        conn.on('open', () => {
            showStatus('Connected! Waiting for game to start...', 'success');
            conn.send({
                type: 'join',
                playerName: null
            });
            connections['host'] = conn;
        });
        conn.on('data', (data) => {
            handleMessage(data);
        });
        conn.on('close', () => {
            if (gameState.gameStarted) {
                addLog('Host left the game. Game ended.');
                alert('Host has left the game. The game will now end.');
                setTimeout(() => {
                    if (peer) peer.destroy();
                    location.reload();
                }, 3000);
            } else {
                showStatus('Disconnected from game', 'error');
            }
        });
        conn.on('error', (err) => {
            showStatus('Could not connect. Make sure the code is correct and the host has started the game.', 'error');
        });
    });
    peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
            showStatus('Game not found. Check the code and make sure the host has created the game.', 'error');
        } else {
            showStatus('Connection error: ' + err.type, 'error');
        }
    });
}
function showStatus(message, type) {
    const status = document.getElementById('join-status');
    status.textContent = message;
    status.className = `status-message ${type}`;
}
// ===== GAME LOGIC =====
function startGame() {
    if (gameState.players.length < 2) {
        alert('Need at least 2 players to start!');
        return;
    }
    let turnTimeInput = parseInt(document.getElementById('turn-time-input').value);
    if (isNaN(turnTimeInput) || turnTimeInput < 30) {
        turnTimeInput = 30;
        document.getElementById('turn-time-input').value = 30;
    }
    if (turnTimeInput > 600) {
        turnTimeInput = 600;
        document.getElementById('turn-time-input').value = 600;
    }
    gameState.turnTimeLimit = turnTimeInput;
    gameState.solution = {
        suspect: SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)],
        weapon: WEAPONS[Math.floor(Math.random() * WEAPONS.length)],
        room: ROOMS[Math.floor(Math.random() * ROOMS.length)]
    };
    const remainingCards = [
        ...SUSPECTS.filter(s => s !== gameState.solution.suspect),
        ...WEAPONS.filter(w => w !== gameState.solution.weapon),
        ...ROOMS.filter(r => r !== gameState.solution.room)
    ];
    for (let i = remainingCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingCards[i], remainingCards[j]] = [remainingCards[j], remainingCards[i]];
    }
    const cardsPerPlayer = Math.floor(remainingCards.length / gameState.players.length);
    const playerCards = {};
    gameState.players.forEach((player, index) => {
        const start = index * cardsPerPlayer;
        const end = index === gameState.players.length - 1 ? remainingCards.length : start + cardsPerPlayer;
        const cards = remainingCards.slice(start, end);
        if (player.isHost) {
            gameState.myCards = cards;
        } else {
            playerCards[player.id] = cards;
        }
    });
    if (gameState.isHost) {
        gameState.allPlayerCards = {};
        gameState.players.forEach((player, index) => {
            const start = index * cardsPerPlayer;
            const end = index === gameState.players.length - 1 ? remainingCards.length : start + cardsPerPlayer;
            gameState.allPlayerCards[player.id] = remainingCards.slice(start, end);
        });
    }
    broadcast({
        type: 'game_start',
        players: gameState.players,
        currentTurn: 0,
        turnTimeLimit: gameState.turnTimeLimit,
        theme: gameState.selectedTheme
    });
    Object.keys(playerCards).forEach(playerId => {
        sendToPlayer(playerId, {
            type: 'your_cards',
            cards: playerCards[playerId]
        });
    });
    gameState.gameStarted = true;
    gameState.currentTurn = 0;
    initializeGameUI();
    showScreen('game-screen');
}
function initializeGameUI() {
    document.body.className = `theme-${gameState.selectedTheme}`;
    document.getElementById('player-character-name').innerHTML = 
        `Playing as: <span style="color: var(--text-color);">${gameState.playerName}</span>`;
    populateSelect('suspect-select', SUSPECTS);
    populateSelect('weapon-select', WEAPONS);
    populateSelect('suggestion-room-select', ROOMS);
    updateRoomMoveSelect();
    populateSelect('accuse-suspect-select', SUSPECTS);
    populateSelect('accuse-weapon-select', WEAPONS);
    displayMyCards();
    updateTurnIndicator();
    displayDetectiveNotes();
    updateRoomDisplay();
    updateSuggestionAvailability();
    updateAccusationRoomDisplay();
    if (gameState.isHost) {
        startTurnTimer();
    }
    addLog('Game started! Begin your investigation...');
}
function populateSelect(id, options) {
    const select = document.getElementById(id);
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
}
function updateRoomMoveSelect() {
    const select = document.getElementById('room-move-select');
    select.innerHTML = '<option value="">Choose destination room...</option>';
    ROOMS.forEach(room => {
        const opt = document.createElement('option');
        opt.value = room;
        opt.textContent = room;
        select.appendChild(opt);
    });
}
function displayMyCards() {
    const container = document.getElementById('your-cards');
    container.innerHTML = '';
    const suspects = gameState.myCards.filter(card => SUSPECTS.includes(card));
    const weapons = gameState.myCards.filter(card => WEAPONS.includes(card));
    const rooms = gameState.myCards.filter(card => ROOMS.includes(card));
    const sortedCards = [...suspects, ...weapons, ...rooms];
    sortedCards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card ' + getCardType(card);
        cardDiv.textContent = card;
        container.appendChild(cardDiv);
        gameState.notes[card] = 'owned';
    });
}
function getCardType(card) {
    if (SUSPECTS.includes(card)) return 'suspect';
    if (WEAPONS.includes(card)) return 'weapon';
    if (ROOMS.includes(card)) return 'room';
    return '';
}
function displayDetectiveNotes() {
    const container = document.getElementById('detective-notes');
    container.innerHTML = '';
    const sections = [
        { title: 'WHO (Suspects)', items: SUSPECTS.slice().sort() },
        { title: 'WHAT (Weapons)', items: WEAPONS.slice().sort() },
        { title: 'WHERE (Rooms)', items: ROOMS.slice().sort() }
    ];
    sections.forEach(section => {
        const header = document.createElement('div');
        header.style.cssText = 'font-weight: bold; color: var(--secondary-color); margin-top: 15px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid var(--border-color); font-size: 1.1em;';
        header.textContent = section.title;
        container.appendChild(header);
        section.items.forEach(item => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';
            if (gameState.notes[item] === 'eliminated' || gameState.notes[item] === 'owned') {
                noteDiv.classList.add('eliminated');
                noteDiv.style.cursor = 'default';
            } else if (gameState.notes[item] === 'likely') {
                noteDiv.classList.add('likely');
                noteDiv.style.cursor = 'pointer';
            } else {
                noteDiv.style.cursor = 'pointer';
            }
            const status = gameState.notes[item] === 'owned' ? '✗' : 
                          gameState.notes[item] === 'eliminated' ? '✗' : 
                          gameState.notes[item] === 'likely' ? '⭐' : '?';
            noteDiv.innerHTML = `<span>${item}</span><span>${status}</span>`;
            if (gameState.notes[item] !== 'owned' && gameState.notes[item] !== 'eliminated') {
                noteDiv.onclick = () => toggleNoteStatus(item);
            }
            container.appendChild(noteDiv);
        });
    });
}
function toggleNoteStatus(card) {
    if (gameState.notes[card] === 'owned' || gameState.notes[card] === 'eliminated') {
        return;
    }
    if (gameState.notes[card] === 'unknown') {
        gameState.notes[card] = 'likely';
    } else if (gameState.notes[card] === 'likely') {
        gameState.notes[card] = 'unknown';
    }
    displayDetectiveNotes();
}
function updateTurnIndicator() {
    const currentPlayerName = gameState.players[gameState.currentTurn].name;
    const isMyTurn = gameState.currentTurn === getMyPlayerIndex();
    const myPlayer = gameState.players.find(p => p.name === gameState.playerName);
    const isEliminated = myPlayer && myPlayer.eliminated;
    document.getElementById('current-player').textContent = 
        isMyTurn ? "Your Turn!" : `${currentPlayerName}'s Turn`;
    const selectDestBtn = document.getElementById('select-destination-btn');
    const roomMoveSelect = document.getElementById('room-move-select');
    const rollBtn = document.getElementById('roll-dice-btn');
    const accuseBtn = document.getElementById('accuse-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (isMyTurn && !isEliminated) {
        if (!gameState.destinationRoom) {
            selectDestBtn.disabled = false;
            roomMoveSelect.disabled = false;
        }
        rollBtn.disabled = false;
        accuseBtn.disabled = false;
        endTurnBtn.disabled = false;
        updateSuggestionAvailability();
    } else {
        selectDestBtn.disabled = true;
        roomMoveSelect.disabled = true;
        rollBtn.disabled = true;
        document.getElementById('suggest-btn').disabled = true;
        accuseBtn.disabled = true;
        endTurnBtn.disabled = true;
    }
}
function getMyPlayerIndex() {
    if (gameState.isHost) {
        return gameState.players.findIndex(p => p.isHost);
    }
    return gameState.players.findIndex(p => p.name === gameState.playerName);
}
function selectDestination() {
    const selectedRoom = document.getElementById('room-move-select').value;
    if (!selectedRoom) {
        addLog('Please select a destination room');
        return;
    }
    gameState.destinationRoom = selectedRoom;
    gameState.movesRequired = Math.floor(Math.random() * 25) + 4;
    gameState.movesAccumulated = 0;
    document.getElementById('destination-room').textContent = selectedRoom;
    document.getElementById('moves-required').textContent = gameState.movesRequired;
    document.getElementById('moves-accumulated').textContent = '0';
    document.getElementById('moves-remaining').textContent = gameState.movesRequired;
    document.getElementById('movement-progress').style.display = 'block';
    document.getElementById('select-destination-btn').disabled = true;
    document.getElementById('room-move-select').disabled = true;
    updateRoomDisplay();
    updateMovementStatus();
    updateSuggestionAvailability();
    addLog(`Starting journey to ${selectedRoom} - ${gameState.movesRequired} moves required`);
}
function rollDice() {
    if (!gameState.destinationRoom) {
        addLog('Please select a destination room first');
        return;
    }
    document.getElementById('roll-dice-btn').disabled = true;
    if (gameState.isInRoom && gameState.myCurrentRoom !== 'Hallway') {
        gameState.myCurrentRoom = 'Hallway';
        gameState.isInRoom = false;
        gameState.suggestionRoomThisTurn = null;
        updateRoomDisplay();
        updateSuggestionAvailability();
        updateAccusationRoomDisplay();
        addLog(`Left the room and entered the Hallway`);
    }
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const roll = die1 + die2;
    gameState.movesAccumulated += roll;
    const remaining = gameState.movesRequired - gameState.movesAccumulated;
    document.getElementById('dice-number').textContent = `🎲 You rolled ${die1} + ${die2} = ${roll}!`;
    document.getElementById('dice-result').style.display = 'block';
    document.getElementById('moves-accumulated').textContent = gameState.movesAccumulated;
    document.getElementById('moves-remaining').textContent = Math.max(0, remaining);
    addLog(`Rolled ${die1} + ${die2} = ${roll} - ${gameState.movesAccumulated}/${gameState.movesRequired} moves`);
    const rollData = {
        type: 'dice_roll',
        player: gameState.playerName,
        roll: roll,
        die1: die1,
        die2: die2,
        destination: gameState.destinationRoom,
        accumulated: gameState.movesAccumulated,
        required: gameState.movesRequired,
        arrived: remaining <= 0
    };
    if (gameState.isHost) {
        broadcast(rollData);
    } else {
        sendToHost(rollData);
    }
    if (remaining <= 0) {
        arriveAtRoom();
    } else {
        setTimeout(() => {
            nextTurn();
        }, 1000);
    }
}
function arriveAtRoom() {
    gameState.myCurrentRoom = gameState.destinationRoom;
    gameState.isInRoom = true;
    addLog(`✓ Arrived at ${gameState.myCurrentRoom}!`);
    gameState.destinationRoom = null;
    gameState.movesRequired = 0;
    gameState.movesAccumulated = 0;
    document.getElementById('movement-progress').style.display = 'none';
    document.getElementById('dice-result').style.display = 'none';
    document.getElementById('select-destination-btn').disabled = true;
    document.getElementById('room-move-select').disabled = true;
    document.getElementById('roll-dice-btn').disabled = true;
    updateRoomMoveSelect();
    updateRoomDisplay();
    updateSuggestionAvailability();
    updateAccusationRoomDisplay();
}
function updateMovementStatus() {
    document.getElementById('movement-status').textContent = 
        gameState.destinationRoom ? 
        `Traveling to ${gameState.destinationRoom}...` : 
        'Select a room to travel to';
}
function updateRoomDisplay() {
    document.getElementById('current-room-display').innerHTML = 
        `Currently in: <span style="color: var(--text-color);">${gameState.myCurrentRoom}</span>`;
    updateMovementStatus();
}
function updateSuggestionAvailability() {
    const suggestBtn = document.getElementById('suggest-btn');
    const suggestionStatus = document.getElementById('suggestion-status');
    const suggestionRoomSelect = document.getElementById('suggestion-room-select');
    if (gameState.isInRoom && gameState.myCurrentRoom !== 'Hallway') {
        if (gameState.suggestionRoomThisTurn === gameState.myCurrentRoom) {
            suggestionStatus.textContent = `You already made a suggestion in the ${gameState.myCurrentRoom}. Leave and re-enter to suggest again.`;
            suggestionStatus.style.color = '#ff6b6b';
            suggestionRoomSelect.value = '';
            suggestionRoomSelect.disabled = true;
            suggestBtn.disabled = true;
        } else {
            suggestionStatus.textContent = `Make a suggestion about the ${gameState.myCurrentRoom}`;
            suggestionStatus.style.color = 'var(--secondary-color)';
            suggestionRoomSelect.value = gameState.myCurrentRoom;
            suggestionRoomSelect.disabled = true;
            if (gameState.currentTurn === getMyPlayerIndex()) {
                suggestBtn.disabled = false;
            }
        }
    } else {
        suggestionStatus.textContent = 'You must be in a room to make a suggestion';
        suggestionStatus.style.color = '#ff6b6b';
        suggestionRoomSelect.value = '';
        suggestionRoomSelect.disabled = true;
        suggestBtn.disabled = true;
    }
}
function endTurn() {
    if (gameState.destinationRoom) {
        alert('You must complete your journey before ending your turn. Keep rolling until you arrive!');
        return;
    }
    nextTurn();
}
function makeSuggestion() {
    if (!gameState.isInRoom || gameState.myCurrentRoom === 'Hallway') {
        addLog('You must be in a room to make a suggestion!');
        return;
    }
    if (gameState.suggestionRoomThisTurn === gameState.myCurrentRoom) {
        addLog('You already made a suggestion in this room! Leave and re-enter to suggest again.');
        return;
    }
    const suspect = document.getElementById('suspect-select').value;
    const weapon = document.getElementById('weapon-select').value;
    const room = gameState.myCurrentRoom;
    if (!suspect || !weapon) {
        addLog('Please select a suspect and weapon');
        return;
    }
    const suggestion = { suspect, weapon, room };
    gameState.suggestionRoomThisTurn = gameState.myCurrentRoom;
    updateSuggestionAvailability();
    addLog(`You suggested: ${colorCard(suspect)} with the ${colorCard(weapon)} in the ${colorCard(room)}`);
    document.getElementById('suggest-btn').disabled = true;
    document.getElementById('accuse-btn').disabled = true;
    document.getElementById('roll-dice-btn').disabled = true;
    document.getElementById('end-turn-btn').disabled = true;
    document.getElementById('select-destination-btn').disabled = true;
    document.getElementById('room-move-select').disabled = true;
    if (gameState.isHost) {
        checkSuggestionAsHost(suggestion);
    } else {
        sendToHost({
            type: 'suggestion',
            suggestion: suggestion,
            player: gameState.playerName
        });
    }
}
function checkSuggestionAsHost(suggestion) {
    gameState.currentSuggestion = {
        suggestion: suggestion,
        askedBy: gameState.players[gameState.currentTurn].name,
        askedById: gameState.players[gameState.currentTurn].id,
        currentCheckingPlayerIndex: null,
        disproved: false
    };
    stopTurnTimer();
    broadcast({
        type: 'player_suggestion',
        player: gameState.currentSuggestion.askedBy,
        suggestion: suggestion
    });
    checkNextPlayerForDisproof();
}
function checkNextPlayerForDisproof() {
    if (!gameState.currentSuggestion || gameState.currentSuggestion.disproved) {
        return;
    }
    const suggesterIndex = gameState.currentTurn;
    let nextPlayerIndex;
    if (gameState.currentSuggestion.currentCheckingPlayerIndex === null) {
        nextPlayerIndex = (suggesterIndex + 1) % gameState.players.length;
    } else {
        nextPlayerIndex = (gameState.currentSuggestion.currentCheckingPlayerIndex + 1) % gameState.players.length;
    }
    if (nextPlayerIndex === suggesterIndex) {
        broadcast({
            type: 'hide_waiting_disproof'
        });
        handleNobodyCanDisprove();
        return;
    }
    gameState.currentSuggestion.currentCheckingPlayerIndex = nextPlayerIndex;
    const checkingPlayer = gameState.players[nextPlayerIndex];
    broadcast({
        type: 'player_checking_disproof',
        checkerName: checkingPlayer.name,
        suggesterName: gameState.players[suggesterIndex].name
    });
    if (checkingPlayer.name !== gameState.playerName && gameState.players[suggesterIndex].name !== gameState.playerName) {
        const waitingBox = document.getElementById('waiting-disproof');
        const waitingText = document.getElementById('waiting-disproof-text');
        waitingText.textContent = `${checkingPlayer.name} is currently checking their cards...`;
        waitingBox.style.display = 'block';
    }
    if (checkingPlayer.isHost) {
        const myMatching = findAllMatching(gameState.currentSuggestion.suggestion, gameState.myCards);
        if (myMatching.length > 0) {
            document.getElementById('waiting-disproof').style.display = 'none';
            showDisproofOptions(myMatching, gameState.currentSuggestion.suggestion);
        } else {
            checkNextPlayerForDisproof();
        }
    } else {
        sendToPlayer(checkingPlayer.id, {
            type: 'check_suggestion',
            suggestion: gameState.currentSuggestion.suggestion,
            askedBy: gameState.currentSuggestion.askedBy
        });
    }
}
function handleNobodyCanDisprove() {
    const suggester = gameState.players[gameState.currentTurn];
    if (suggester.isHost) {
        showSuggestionResult('No one could disprove your suggestion!', 'approved');
    } else {
        sendToPlayer(suggester.id, {
            type: 'suggestion_not_disproved'
        });
    }
    setTimeout(() => {
        nextTurn();
    }, 1000);
}
function findAllMatching(suggestion, cards) {
    return cards.filter(card => 
        card === suggestion.suspect || 
        card === suggestion.weapon || 
        card === suggestion.room
    );
}
function showDisproofOptions(matchingCards, suggestion) {
    const section = document.getElementById('disproof-section');
    const textEl = document.getElementById('disproof-suggestion-text');
    const cardsEl = document.getElementById('disproof-cards');
    textEl.textContent = `Suggestion: ${suggestion.suspect} with the ${suggestion.weapon} in the ${suggestion.room}`;
    cardsEl.innerHTML = '';
    matchingCards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card ' + getCardType(card);
        cardDiv.textContent = card;
        cardDiv.onclick = () => selectDisproofCard(card);
        cardsEl.appendChild(cardDiv);
    });
    section.style.display = 'block';
}
function selectDisproofCard(card) {
    document.getElementById('disproof-section').style.display = 'none';
    document.getElementById('waiting-disproof').style.display = 'none';
    const suggesterName = gameState.players[gameState.currentTurn].name;
    if (gameState.isHost) {
        showSuggestionResult(`You showed: ${card}`, 'disproved');
        addLog(`You showed ${colorCard(card)} to ${colorPlayer(suggesterName)}`);
        broadcast({
            type: 'hide_waiting_disproof'
        });
        broadcast({
            type: 'player_disproved_publicly',
            disprover: gameState.playerName,
            suggester: suggesterName
        });
        const suggester = gameState.players[gameState.currentTurn];
        if (!suggester.isHost) {
            sendToPlayer(suggester.id, {
                type: 'suggestion_disproved',
                card: card,
                by: gameState.playerName
            });
        }
        gameState.currentSuggestion.disproved = true;
        setTimeout(() => {
            nextTurn();
        }, 1000);
    } else {
        sendToHost({
            type: 'disproof',
            card: card,
            player: gameState.playerName
        });
        addLog(`You showed ${colorCard(card)} to ${colorPlayer(suggesterName)}`);
        document.getElementById('waiting-disproof').style.display = 'none';
    }
}
function showSuggestionResult(message, type) {
    const resultBox = document.getElementById('suggestion-result');
    resultBox.textContent = message;
    resultBox.className = `result-box show ${type}`;
    setTimeout(() => {
        resultBox.classList.remove('show');
    }, 5000);
}
function updateAccusationRoomDisplay() {
    const roomDisplay = document.getElementById('current-accusation-room');
    const accuseBtn = document.getElementById('accuse-btn');
    if (gameState.isInRoom && gameState.myCurrentRoom !== 'Hallway') {
        roomDisplay.textContent = gameState.myCurrentRoom;
        roomDisplay.style.color = 'var(--text-color)';
        if (gameState.currentTurn === getMyPlayerIndex()) {
            accuseBtn.disabled = false;
        }
    } else {
        roomDisplay.textContent = 'Must be in a room';
        roomDisplay.style.color = '#ff6b6b';
        accuseBtn.disabled = true;
    }
}
function makeAccusation() {
    if (!gameState.isInRoom || gameState.myCurrentRoom === 'Hallway') {
        addLog('You must be in a room to make an accusation!');
        alert('You must be in a room to make a final accusation!');
        return;
    }
    const suspect = document.getElementById('accuse-suspect-select').value;
    const weapon = document.getElementById('accuse-weapon-select').value;
    const room = gameState.myCurrentRoom;
    if (!suspect || !weapon) {
        addLog('Please select a suspect and weapon for your accusation');
        return;
    }
    if (!confirm(`Are you sure you want to accuse ${suspect} with the ${weapon} in the ${room}?\n\nAn incorrect accusation will eliminate you from the game!`)) {
        return;
    }
    const accusation = { suspect, weapon, room };
    if (gameState.isHost) {
        checkAccusation(accusation, gameState.playerName);
    } else {
        sendToHost({
            type: 'accusation',
            accusation: accusation,
            player: gameState.playerName
        });
    }
}
function checkAccusation(accusation, playerName) {
    const correct = 
        accusation.suspect === gameState.solution.suspect &&
        accusation.weapon === gameState.solution.weapon &&
        accusation.room === gameState.solution.room;
    if (correct) {
        endGame(playerName);
    } else {
        addLog(`${colorPlayer(playerName)} made an incorrect accusation and is eliminated!`);
        const player = gameState.players.find(p => p.name === playerName);
        if (player) {
            player.eliminated = true;
        }
        broadcast({
            type: 'accusation_result',
            correct: false,
            player: playerName
        });
        checkForLastPlayer();
        if (gameState.isHost) {
            nextTurn();
        }
    }
}
function disablePlayerUI() {
    document.getElementById('select-destination-btn').disabled = true;
    document.getElementById('room-move-select').disabled = true;
    document.getElementById('roll-dice-btn').disabled = true;
    document.getElementById('suggest-btn').disabled = true;
    document.getElementById('accuse-btn').disabled = true;
    document.getElementById('end-turn-btn').disabled = true;
    document.getElementById('suspect-select').disabled = true;
    document.getElementById('weapon-select').disabled = true;
    document.getElementById('suggestion-room-select').disabled = true;
    document.getElementById('accuse-suspect-select').disabled = true;
    document.getElementById('accuse-weapon-select').disabled = true;
    const resultBox = document.getElementById('suggestion-result');
    resultBox.textContent = 'You have been eliminated from the game! You can still show cards to disprove suggestions.';
    resultBox.className = 'result-box show disproved';
}
function checkForLastPlayer() {
    const activePlayers = gameState.players.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
        endGame(activePlayers[0].name);
    } else if (activePlayers.length === 0) {
        endGame('No one');
    }
}
function endGame(winner) {
    broadcast({
        type: 'game_end',
        winner: winner,
        solution: gameState.solution,
        players: gameState.players
    });
    showWinner(winner, gameState.solution);
}
function showWinner(winner, solution) {
    const eliminatedPlayers = gameState.players.filter(p => p.eliminated);
    const isMe = winner === gameState.playerName;
    const winnerText = isMe 
        ? `<span style="color: var(--secondary-color);">${escapeHtml(winner)}</span> <span style="color: var(--danger-color);">(You)</span>` 
        : `<span style="color: var(--secondary-color);">${escapeHtml(winner)}</span>`;
    document.getElementById('winner-info').innerHTML = `
        <p><strong>${winnerText}</strong> solved the mystery!</p>
    `;
    let eliminatedSection = '';
    if (eliminatedPlayers.length > 0) {
        eliminatedSection = `
            <div style="margin-top: 30px; padding: 20px; background: rgba(139, 0, 0, 0.2); border-radius: 8px; border: 2px solid var(--danger-color);">
                <h3 style="color: var(--danger-color); margin-bottom: 15px;">Eliminated Players:</h3>
                <ul style="list-style: none; padding: 0;">
                    ${eliminatedPlayers.map(p => {
                        const isMe = p.name === gameState.playerName;
                        const playerText = isMe 
                            ? `<span style="color: var(--secondary-color);">${escapeHtml(p.name)}</span> <span style="color: var(--text-color);">(You)</span>`
                            : `<span style="color: var(--secondary-color);">${escapeHtml(p.name)}</span>`;
                        return `<li style="padding: 5px 0; font-size: 1.1em;">${playerText}</li>`;
                    }).join('')}
                </ul>
            </div>
        `;
    } else {
        eliminatedSection = `
            <div style="margin-top: 30px; padding: 20px; background: rgba(45, 80, 22, 0.2); border-radius: 8px; border: 2px solid var(--success-color);">
                <h3 style="color: var(--secondary-color); margin-bottom: 10px;">Perfect Victory!</h3>
                <p style="font-size: 1.1em;">No players were eliminated - the mystery was solved correctly!</p>
            </div>
        `;
    }
    document.getElementById('solution-reveal').innerHTML = `
        <h3>The Solution:</h3>
        <div class="solution-cards">
            <div class="solution-card">
                <strong>Suspect:</strong><br>${escapeHtml(solution.suspect)}
            </div>
            <div class="solution-card">
                <strong>Weapon:</strong><br>${escapeHtml(solution.weapon)}
            </div>
            <div class="solution-card">
                <strong>Room:</strong><br>${escapeHtml(solution.room)}
            </div>
        </div>
        ${eliminatedSection}
    `;
    showScreen('winner-screen');
}
function nextTurn() {
    if (!gameState.isHost) {
        sendToHost({
            type: 'advance_turn'
        });
        return;
    }
    let attempts = 0;
    const maxAttempts = gameState.players.length;
    do {
        gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
        attempts++;
        if (attempts >= maxAttempts) {
            break;
        }
    } while (gameState.players[gameState.currentTurn].eliminated);
    document.getElementById('waiting-disproof').style.display = 'none';
    updateTurnIndicator();
    broadcast({
        type: 'turn_update',
        currentTurn: gameState.currentTurn
    });
    startTurnTimer();
}
function startTurnTimer() {
    stopTurnTimer();
    gameState.turnTimeRemaining = gameState.turnTimeLimit;
    updateTimerDisplay();
    gameState.turnTimer = setInterval(() => {
        gameState.turnTimeRemaining--;
        updateTimerDisplay();
        if (gameState.turnTimeRemaining <= 0) {
            stopTurnTimer();
            handleTimeUp();
        }
    }, 1000);
}
function stopTurnTimer() {
    if (gameState.turnTimer) {
        clearInterval(gameState.turnTimer);
        gameState.turnTimer = null;
    }
}
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.turnTimeRemaining / 60);
    const seconds = gameState.turnTimeRemaining % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const timerEl = document.getElementById('turn-timer');
    timerEl.textContent = `⏱️ ${timeString}`;
    if (gameState.turnTimeRemaining <= 20) {
        timerEl.style.color = '#ff6b6b';
    } else if (gameState.turnTimeRemaining <= 60) {
        timerEl.style.color = '#ffa500';
    } else {
        timerEl.style.color = '#ffffff';
    }
}
function handleTimeUp() {
    const currentPlayerName = gameState.players[gameState.currentTurn].name;
    const isMyTurn = gameState.currentTurn === getMyPlayerIndex();
    if (gameState.isHost) {
        if (isMyTurn) {
            addLog('Your time is up! Turn automatically ended.');
        } else {
            addLog(`Time is up for ${escapeHtml(currentPlayerName)}!`);
        }
        broadcast({
            type: 'time_up',
            playerName: currentPlayerName
        });
        setTimeout(() => {
            nextTurn();
        }, 100);
    }
}
function getCardColor(card) {
    if (SUSPECTS.includes(card)) return '#ff6b6b';
    if (WEAPONS.includes(card)) return '#4ecdc4';
    if (ROOMS.includes(card)) return '#ffe66d';
    return '#ffffff';
}
function colorCard(card) {
    const color = getCardColor(card);
    return `<span style="color: ${color}; font-weight: bold;">${escapeHtml(card)}</span>`;
}
function colorPlayer(playerName) {
    return `<span style="color: var(--secondary-color); font-weight: bold;">${escapeHtml(playerName)}</span>`;
}
function addLog(message) {
    const log = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}
function leaveGame() {
    if (confirm('Are you sure you want to leave the game?')) {
        if (peer) peer.destroy();
        location.reload();
    }
}
// ===== MESSAGING =====
function handleMessage(data, fromPlayerId) {
    switch (data.type) {
        case 'join_rejected':
            showStatus(data.reason, 'error');
            setTimeout(() => {
                showScreen('welcome-screen');
            }, 3000);
            break;
        case 'connected': {
            gameState.players = data.players;
            const myPlayer = gameState.players.find(p => p.id === data.yourPlayerId);
            if (myPlayer) {
                gameState.playerName = myPlayer.name;
            }
            if (data.theme) {
                gameState.selectedTheme = data.theme;
                activeTheme = data.theme;
                SUSPECTS = THEMES[data.theme].suspects;
                WEAPONS = THEMES[data.theme].weapons;
                ROOMS = THEMES[data.theme].rooms;
                CHARACTERS = THEMES[data.theme].characters;
                initializeNotes();
            }
            document.getElementById('player-character-display').textContent = gameState.playerName;
            document.getElementById('lobby-theme-display').textContent = THEMES[gameState.selectedTheme].name;
            document.getElementById('lobby-objective-display').textContent = THEMES[gameState.selectedTheme].objective;
            updatePlayerLobbyList();
            const takenCharacters = gameState.players.map(p => p.name);
            const container = document.getElementById('lobby-character-select');
            container.innerHTML = '';
            CHARACTERS.forEach(character => {
                const btn = document.createElement('button');
                btn.className = 'character-btn';
                btn.textContent = character;
                if (character === gameState.playerName && gameState.playerName.startsWith('Player ')) {
                } else if (character === gameState.playerName) {
                    btn.classList.add('selected');
                } else if (takenCharacters.includes(character)) {
                    btn.classList.add('taken');
                    btn.disabled = true;
                }
                btn.onclick = () => {
                    if (!btn.classList.contains('taken')) {
                        sendToHost({
                            type: 'update_character',
                            newCharacter: character
                        });
                    }
                };
                container.appendChild(btn);
            });
            showScreen('player-lobby-screen');
            break;
        }
        case 'player_list_update': {
            gameState.players = data.players;
            if (!gameState.gameStarted) {
                updatePlayerLobbyList();
                const lobbyContainer = document.getElementById('lobby-character-select');
                if (lobbyContainer && lobbyContainer.children.length > 0) {
                    Array.from(lobbyContainer.children).forEach(btn => {
                        const character = btn.textContent;
                        btn.classList.remove('selected', 'taken');
                        btn.disabled = false;
                        if (character === gameState.playerName) {
                            btn.classList.add('selected');
                        } else if (gameState.players.some(p => p.name === character)) {
                            btn.classList.add('taken');
                            btn.disabled = true;
                        }
                    });
                }
            }
            break;
        }
        case 'character_updated': {
            gameState.playerName = data.character;
            document.getElementById('player-character-display').textContent = gameState.playerName;
            const lobbyContainer = document.getElementById('lobby-character-select');
            if (lobbyContainer && lobbyContainer.children.length > 0) {
                Array.from(lobbyContainer.children).forEach(btn => {
                    const character = btn.textContent;
                    btn.classList.remove('selected', 'taken');
                    btn.disabled = false;
                    if (character === gameState.playerName) {
                        btn.classList.add('selected');
                    } else if (gameState.players.some(p => p.name === character)) {
                        btn.classList.add('taken');
                        btn.disabled = true;
                    }
                });
            }
            break;
        }
        case 'character_taken':
            alert(`${data.character} is already taken. Please select a different character.`);
            break;
        case 'theme_changed': {
            gameState.selectedTheme = data.theme;
            activeTheme = data.theme;
            SUSPECTS = THEMES[data.theme].suspects;
            WEAPONS = THEMES[data.theme].weapons;
            ROOMS = THEMES[data.theme].rooms;
            CHARACTERS = THEMES[data.theme].characters;
            initializeNotes();
            gameState.players = data.players;
            updatePlayerLobbyList();
            const myPlayerEntry = gameState.players.find(p => !p.isHost && p.name.startsWith('Player '));
            if (myPlayerEntry) {
                gameState.playerName = myPlayerEntry.name;
                document.getElementById('player-character-display').textContent = gameState.playerName;
            }
            document.getElementById('lobby-theme-display').textContent = THEMES[data.theme].name;
            document.getElementById('lobby-objective-display').textContent = THEMES[data.theme].objective;
            const container = document.getElementById('lobby-character-select');
            container.innerHTML = '';
            CHARACTERS.forEach(character => {
                const btn = document.createElement('button');
                btn.className = 'character-btn';
                btn.textContent = character;
                const takenCharacters = gameState.players.map(p => p.name);
                if (takenCharacters.includes(character)) {
                    btn.classList.add('taken');
                    btn.disabled = true;
                }
                btn.onclick = () => {
                    if (!btn.classList.contains('taken')) {
                        sendToHost({
                            type: 'update_character',
                            newCharacter: character
                        });
                    }
                };
                container.appendChild(btn);
            });
            break;
        }
        case 'game_start':
            gameState.players = data.players;
            gameState.currentTurn = data.currentTurn;
            gameState.gameStarted = true;
            if (data.turnTimeLimit) {
                gameState.turnTimeLimit = data.turnTimeLimit;
            }
            if (data.theme) {
                gameState.selectedTheme = data.theme;
                activeTheme = data.theme;
                SUSPECTS = THEMES[data.theme].suspects;
                WEAPONS = THEMES[data.theme].weapons;
                ROOMS = THEMES[data.theme].rooms;
                CHARACTERS = THEMES[data.theme].characters;
                initializeNotes();
            }
            break;
        case 'your_cards':
            gameState.myCards = data.cards;
            initializeGameUI();
            showScreen('game-screen');
            break;
        case 'suggestion':
            if (gameState.isHost) {
                addLog(`${colorPlayer(data.player)} suggested: ${colorCard(data.suggestion.suspect)} with the ${colorCard(data.suggestion.weapon)} in the ${colorCard(data.suggestion.room)}`);
                checkSuggestionAsHost(data.suggestion);
            }
            break;
        case 'movement_progress':
            if (gameState.isHost) {
                addLog(`${data.player} traveling to ${data.destination} - ${data.accumulated}/${data.required} moves`);
                broadcast({
                    type: 'movement_progress',
                    player: data.player,
                    destination: data.destination,
                    accumulated: data.accumulated,
                    required: data.required
                });
            }
            break;
        case 'check_suggestion':
            if (data.askedBy === gameState.playerName) {
                break;
            }
            stopTurnTimer();
            const myMatching = findAllMatching(data.suggestion, gameState.myCards);
            if (myMatching.length > 0) {
                showDisproofOptions(myMatching, data.suggestion);
            } else {
                sendToHost({
                    type: 'cannot_disprove',
                    player: gameState.playerName
                });
            }
            break;
        case 'disproof':
            if (gameState.isHost && gameState.currentSuggestion) {
                const suggester = gameState.players[gameState.currentTurn];
                broadcast({
                    type: 'hide_waiting_disproof'
                });
                broadcast({
                    type: 'player_disproved_publicly',
                    disprover: data.player,
                    suggester: suggester.name
                });
                if (!suggester.isHost) {
                    sendToPlayer(suggester.id, {
                        type: 'suggestion_disproved',
                        card: data.card,
                        by: data.player
                    });
                    addLog(`${colorPlayer(data.player)} showed a card to ${colorPlayer(suggester.name)}`);
                } else {
                    showSuggestionResult(`${data.player} showed: ${data.card}`, 'disproved');
                    addLog(`${colorPlayer(data.player)} showed you: ${colorCard(data.card)}`);
                    gameState.notes[data.card] = 'eliminated';
                    displayDetectiveNotes();
                }
                gameState.currentSuggestion.disproved = true;
                setTimeout(() => {
                    nextTurn();
                }, 1000);
            }
            break;
        case 'cannot_disprove':
            if (gameState.isHost && gameState.currentSuggestion) {
                checkNextPlayerForDisproof();
            }
            break;
        case 'suggestion_disproved':
            showSuggestionResult(`${data.by} showed you: ${data.card}`, 'disproved');
            addLog(`${colorPlayer(data.by)} showed you: ${colorCard(data.card)}`);
            gameState.notes[data.card] = 'eliminated';
            displayDetectiveNotes();
            break;
        case 'player_disproved_publicly':
            if (data.suggester !== gameState.playerName && data.disprover !== gameState.playerName) {
                addLog(`${colorPlayer(data.disprover)} showed a card to ${colorPlayer(data.suggester)}`);
            }
            break;
        case 'player_checking_disproof':
            if (data.checkerName !== gameState.playerName && data.suggesterName !== gameState.playerName) {
                const waitingBox = document.getElementById('waiting-disproof');
                const waitingText = document.getElementById('waiting-disproof-text');
                waitingText.textContent = `${data.checkerName} is currently checking their cards...`;
                waitingBox.style.display = 'block';
            } else if (data.checkerName === gameState.playerName || data.suggesterName === gameState.playerName) {
                document.getElementById('waiting-disproof').style.display = 'none';
            }
            break;
        case 'hide_waiting_disproof':
            document.getElementById('waiting-disproof').style.display = 'none';
            break;
        case 'suggestion_not_disproved':
            showSuggestionResult('No one could disprove your suggestion!', 'approved');
            break;
        case 'accusation':
            if (gameState.isHost) {
                checkAccusation(data.accusation, data.player);
            }
            break;
        case 'accusation_result':
            if (!data.correct) {
                const player = gameState.players.find(p => p.name === data.player);
                if (player) {
                    player.eliminated = true;
                }
                if (data.player !== gameState.playerName) {
                    addLog(`${colorPlayer(data.player)} made an incorrect accusation!`);
                } else {
                    disablePlayerUI();
                }
            }
            break;
        case 'game_end':
            if (data.players) {
                gameState.players = data.players;
            }
            showWinner(data.winner, data.solution);
            break;
        case 'dice_roll':
            if (gameState.isHost) {
                broadcast(data);
            }
            if (data.player !== gameState.playerName) {
                const rollText = data.die1 && data.die2 
                    ? `${data.die1} + ${data.die2} = ${data.roll}` 
                    : data.roll;
                addLog(`${data.player} rolled ${rollText} - ${data.accumulated}/${data.required} moves to ${data.destination}`);
                if (data.arrived) {
                    addLog(`${data.player} arrived at ${data.destination}!`);
                }
            }
            break;
        case 'player_suggestion':
            if (data.player !== gameState.playerName) {
                addLog(`${colorPlayer(data.player)} suggested: ${colorCard(data.suggestion.suspect)} with the ${colorCard(data.suggestion.weapon)} in the ${colorCard(data.suggestion.room)}`);
            }
            break;
        case 'movement_progress':
            if (data.player !== gameState.playerName) {
                addLog(`${data.player} traveling to ${data.destination} - ${data.accumulated}/${data.required} moves`);
            }
            break;
        case 'turn_update':
            gameState.currentTurn = data.currentTurn;
            updateTurnIndicator();
            if (gameState.currentTurn === getMyPlayerIndex()) {
                updateSuggestionAvailability();
            }
            document.getElementById('waiting-disproof').style.display = 'none';
            startTurnTimer();
            break;
        case 'time_up':
            if (!gameState.isHost) {
                const isMyTurn = gameState.currentTurn === getMyPlayerIndex();
                if (isMyTurn) {
                    addLog('Your time is up! Turn automatically ended.');
                } else {
                    addLog(`Time is up for ${escapeHtml(data.playerName)}!`);
                }
            }
            break;
        case 'advance_turn':
            if (gameState.isHost) {
                nextTurn();
            }
            break;
        case 'player_left':
            if (!gameState.isHost) {
                addLog(`${escapeHtml(data.playerName)} left the game`);
                gameState.players = gameState.players.filter(p => p.name !== data.playerName);
            }
            if (!gameState.isHost && data.newCurrentTurn !== undefined) {
                gameState.currentTurn = data.newCurrentTurn;
                updateTurnIndicator();
            }
            if (data.playersRemaining <= 1) {
                alert('Not enough players to continue. Game ended.');
                setTimeout(() => {
                    if (peer) peer.destroy();
                    location.reload();
                }, 3000);
            }
            break;
        case 'player_left_cards':
            if (data.cards) {
                data.cards.forEach(card => {
                    gameState.notes[card] = 'eliminated';
                });
                displayDetectiveNotes();
                addLog(`${escapeHtml(data.playerName)}'s cards revealed: ${data.cards.join(', ')}`);
            }
            break;
        case 'game_ended_disconnect':
            addLog(data.message);
            alert(data.message);
            setTimeout(() => {
                if (peer) peer.destroy();
                location.reload();
            }, 3000);
            break;
    }
}
function sendToHost(data) {
    const conn = connections['host'];
    if (conn && conn.open) {
        conn.send(data);
    }
}
function sendToPlayer(playerId, data) {
    const conn = connections[playerId];
    if (conn && conn.open) {
        conn.send(data);
    }
}
function broadcast(data) {
    Object.keys(connections).forEach(playerId => {
        sendToPlayer(playerId, data);
    });
}
function removePlayer(playerId) {
    const leftPlayer = gameState.players.find(p => p.id === playerId);
    if (!leftPlayer) return;
    const playerName = leftPlayer.name;
    const leftPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    gameState.players = gameState.players.filter(p => p.id !== playerId);
    if (connections[playerId]) {
        delete connections[playerId];
    }
    if (!gameState.gameStarted) {
        updatePlayerList();
        document.getElementById('player-count').textContent = gameState.players.length;
        if (gameState.players.length < 2) {
            document.getElementById('start-game-btn').disabled = true;
            document.getElementById('start-game-btn').textContent = 'Start Game (Need 2+ players)';
        }
        return;
    }
    addLog(`${escapeHtml(playerName)} left the game`);
    if (gameState.isHost && gameState.allPlayerCards && gameState.allPlayerCards[playerId]) {
        const leftPlayerCards = gameState.allPlayerCards[playerId];
        broadcast({
            type: 'player_left_cards',
            playerName: playerName,
            cards: leftPlayerCards
        });
        leftPlayerCards.forEach(card => {
            gameState.notes[card] = 'eliminated';
        });
        displayDetectiveNotes();
        addLog(`${escapeHtml(playerName)}'s cards have been revealed: ${leftPlayerCards.join(', ')}`);
    }
    if (leftPlayerIndex < gameState.currentTurn) {
        gameState.currentTurn--;
    } else if (leftPlayerIndex === gameState.currentTurn) {
        if (gameState.currentTurn >= gameState.players.length) {
            gameState.currentTurn = 0;
        }
        if (gameState.isHost) {
            updateTurnIndicator();
            broadcast({
                type: 'turn_update',
                currentTurn: gameState.currentTurn
            });
        }
    }
    broadcast({
        type: 'player_left',
        playerName: playerName,
        playersRemaining: gameState.players.length,
        newCurrentTurn: gameState.currentTurn
    });
    if (gameState.players.length <= 1) {
        endGameDueToDisconnect();
    }
}
function endGameDueToDisconnect() {
    const message = gameState.players.length === 1 
        ? 'All other players have left. Game ended.' 
        : 'Not enough players to continue. Game ended.';
    addLog(message);
    broadcast({
        type: 'game_ended_disconnect',
        message: message
    });
    alert(message);
    setTimeout(() => {
        if (peer) peer.destroy();
        location.reload();
    }, 3000);
}