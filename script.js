let GRID_SIZE = parseInt(localStorage.getItem('savedGridSize')) || 3; 

// Base DOM Cache Selectors
const board = document.getElementById('board');
const statusDiv = document.getElementById('status');
const opponentSelect = document.getElementById('opponent-type');
const resetBtn = document.getElementById('reset-btn');
const p2Label = document.getElementById('p2-label'); // FIXED: REFERENCE ERROR SOLVED

const modal = document.getElementById('letter-modal');
const letterInput = document.getElementById('letter-input');
const submitBtn = document.getElementById('submit-letter');

const progressionPanel = document.getElementById('progression-panel');
const replayLevelBtn = document.getElementById('replay-level-btn');
const nextLevelBtn = document.getElementById('next-level-btn');

const settingsModal = document.getElementById('settings-modal');
const menuTriggerBtn = document.getElementById('menu-trigger-btn');
const closeSettingsBtn = document.getElementById('close-settings');

// NEW: Leaderboard DOM Selectors
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardTriggerBtn = document.getElementById('leaderboard-trigger-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
const clearLeaderboardBtn = document.getElementById('clear-leaderboard');
const leaderboardList = document.getElementById('leaderboard-list');

let currentPlayer = 1;
let scores = { 1: 0, 2: 0 };
let moveCounts = { 1: 0, 2: 0 };
let linesState = {};
let squaresToClaim = [];
let isAILocked = false;

function triggerGameSound(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'click') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(450, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'score') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'win') {
            osc.type = 'square'; osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.5);
        }
    } catch(e) {}
}

function initGame() {
    board.innerHTML = '';
    currentPlayer = 1;
    scores = { 1: 0, 2: 0 };
    moveCounts = { 1: 0, 2: 0 };
    linesState = {};
    squaresToClaim = [];
    isAILocked = false;
    
    localStorage.setItem('savedGridSize', GRID_SIZE);
    
    if (progressionPanel) progressionPanel.style.display = 'none';
    if (settingsModal) settingsModal.style.display = 'none';
    if (leaderboardModal) leaderboardModal.style.display = 'none';
    
    document.getElementById('score-p1').textContent = '0';
    if (document.getElementById('score-p2')) document.getElementById('score-p2').textContent = '0';
    
    if (window.onGameReset) window.onGameReset(GRID_SIZE);
    buildMatrix();
    updateUIStates();
    // Add this line at the very bottom inside your existing initGame() function in game.js:
    // NEW: Automatically centers game workspace view frame on layout calculation updates
    setTimeout(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, 100);

}

function buildMatrix() {
    const cellSize = 90;
    board.style.width = `${GRID_SIZE * cellSize + 14}px`;
    board.style.height = `${GRID_SIZE * cellSize + 14}px`;

    for (let r = 0; r <= GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE; c++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.style.top = `${r * cellSize}px`; dot.style.left = `${c * cellSize}px`;
            board.appendChild(dot);
        }
    }
    for (let r = 0; r <= GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            createLine('h', r, c, r * cellSize, c * cellSize + 14);
        }
    }
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE; c++) {
            createLine('v', r, c, r * cellSize + 14, c * cellSize);
        }
    }
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const box = document.createElement('div');
            box.className = 'box'; box.id = `box-${r}-${c}`;
            box.style.top = `${r * cellSize}px`; box.style.left = `${c * cellSize}px`;
            board.appendChild(box);
        }
    }
    if (window.syncMiniMapStructure) window.syncMiniMapStructure(GRID_SIZE);
}

function createLine(type, r, c, top, left) {
    const line = document.createElement('div');
    line.className = `line ${type === 'h' ? 'horizontal' : 'vertical'}`;
    line.style.top = `${top}px`; line.style.left = `${left}px`;
    line.id = `line-${type}-${r}-${c}`;
    line.dataset.type = type; line.dataset.row = r; line.dataset.col = c;
    line.addEventListener('click', handleLineSelection);
    board.appendChild(line);
}

function handleLineSelection(e) {
    if (isAILocked || e.target.classList.contains('taken')) return;
    triggerGameSound('click');
    executeMove(e.target);
}

function executeMove(lineElement) {
    const type = lineElement.dataset.type;
    const r = parseInt(lineElement.dataset.row);
    const c = parseInt(lineElement.dataset.col);
    
    lineElement.classList.add('taken', `p${currentPlayer}`);
    linesState[`${type}-${r}-${c}`] = currentPlayer;
    moveCounts[currentPlayer]++;

    if (window.onMoveExecuted) window.onMoveExecuted(currentPlayer, moveCounts, GRID_SIZE);

    const completedBoxes = checkSquareCompletion(type, r, c);

    if (completedBoxes.length > 0) {
        squaresToClaim = completedBoxes;
        triggerGameSound('score');
        if (opponentSelect && opponentSelect.value === 'ai' && currentPlayer === 2) {
            setTimeout(() => claimSquaresWithLetter("AI"), 500);
        } else {
            openModal();
        }
    } else {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateUIStates();
        if (opponentSelect && opponentSelect.value === 'ai' && currentPlayer === 2) {
            triggerAIMove();
        }
    }
}

function checkSquareCompletion(type, r, c) {
    let completed = [];
    if (type === 'h') {
        if (r > 0 && isSquareFull(r - 1, c)) completed.push({ r: r - 1, c: c });
        if (r < GRID_SIZE && isSquareFull(r, c)) completed.push({ r: r, c: c });
    } else if (type === 'v') {
        if (c > 0 && isSquareFull(r, c - 1)) completed.push({ r: r, c: c - 1 });
        if (c < GRID_SIZE && isSquareFull(r, c)) completed.push({ r: r, c: c });
    }
    return completed;
}

function isSquareFull(r, c) {
    return linesState[`h-${r}-${c}`] && linesState[`h-${r+1}-${c}`] && 
           linesState[`v-${r}-${c}`] && linesState[`v-${r}-${c+1}`];
}

function openModal() {
    if (!modal) return;
    modal.style.display = 'flex';
    if (letterInput) { letterInput.value = ''; letterInput.focus(); }
}

function claimSquaresWithLetter(letter) {
    squaresToClaim.forEach(square => {
        const boxElement = document.getElementById(`box-${square.r}-${square.c}`);
        if (boxElement) {
            boxElement.textContent = letter;
            boxElement.classList.add(`p${currentPlayer}`);
        }
        scores[currentPlayer]++;
    });

    squaresToClaim = [];
    if (modal) modal.style.display = 'none';
    updateUIStates();

    if ((scores[1] + scores[2]) === (GRID_SIZE * GRID_SIZE)) {
        triggerGameSound('win');
        saveMatchToLeaderboard(); // Save to leaderboard on match end
        declareWinner();
    } else if (opponentSelect && opponentSelect.value === 'ai' && currentPlayer === 2) {
        triggerAIMove();
    }
}

if (submitBtn) {
    submitBtn.addEventListener('click', () => {
        let letter = letterInput ? letterInput.value.trim().toUpperCase() : '';
        if (!letter) letter = currentPlayer === 1 ? 'P1' : 'P2';
        claimSquaresWithLetter(letter);
    });
}

function triggerAIMove() {
    isAILocked = true;
    if (statusDiv) statusDiv.textContent = "AI Turn Thinking...";
    
    setTimeout(() => {
        const unclickedLines = Array.from(document.querySelectorAll('.line:not(.taken)'));
        if (unclickedLines.length === 0) { isAILocked = false; return; }
        
        let chosenLine = null;
        for (let line of unclickedLines) {
            const type = line.dataset.type; const r = parseInt(line.dataset.row); const c = parseInt(line.dataset.col);
            linesState[`${type}-${r}-${c}`] = 2;
            const testComplete = checkSquareCompletion(type, r, c);
            delete linesState[`${type}-${r}-${c}`];
            if (testComplete.length > 0) { chosenLine = line; break; }
        }
        
        if (!chosenLine) {
            const randomIndex = Math.floor(Math.random() * unclickedLines.length);
            chosenLine = unclickedLines[randomIndex];
        }
        isAILocked = false; triggerGameSound('click'); executeMove(chosenLine);
    }, 600);
}

function updateUIStates() {
    const cardP1 = document.getElementById('card-p1');
    const cardP2 = document.getElementById('card-p2');
    const s1 = document.getElementById('score-p1');
    const s2 = document.getElementById('score-p2');

    if (s1) s1.textContent = scores[1];
    if (s2) s2.textContent = scores[2];
    if (cardP1) cardP1.classList.toggle('active', currentPlayer === 1);
    if (cardP2) cardP2.classList.toggle('active', currentPlayer === 2);
    
    if (p2Label && opponentSelect) {
        p2Label.textContent = opponentSelect.value === 'ai' ? 'AI Engine (Blue)' : 'Player 2 (Blue)';
    }
    if (statusDiv) {
        if (currentPlayer === 1) {
            statusDiv.textContent = "Player 1's Turn"; statusDiv.style.color = 'var(--p1-color)';
        } else {
            statusDiv.textContent = (opponentSelect && opponentSelect.value === 'ai') ? "AI Turn..." : "Player 2's Turn";
            statusDiv.style.color = 'var(--p2-color)';
        }
    }
    if (window.updateMiniMapSelection) window.updateMiniMapSelection(GRID_SIZE);
}

function declareWinner() {
    if (statusDiv) {
        if (scores[1] > scores[2]) statusDiv.textContent = `🏆 Player 1 Wins (${scores[1]}-${scores[2]})!`;
        else if (scores[2] > scores[1]) statusDiv.textContent = `🏆 AI Wins (${scores[2]}-${scores[1]})!`;
        else statusDiv.textContent = `🤝 Draw Match (${scores[1]}-${scores[2]})!`;
    }
    if (progressionPanel) {
        document.getElementById('progression-title').textContent = `Match Finished! Grid: ${GRID_SIZE}x${GRID_SIZE}`;
        progressionPanel.style.display = 'flex';
    }
}

// NEW: Top 10 Highscore Storage Management Methods
function saveMatchToLeaderboard() {
    let history = JSON.parse(localStorage.getItem('gridLetterLeaderboard')) || [];
    let opponentName = (opponentSelect && opponentSelect.value === 'ai') ? 'AI' : 'P2';
    
    const newRecord = {
        grid: `${GRID_SIZE}x${GRID_SIZE}`,
        p1: scores[1],
        p2: scores[2],
        opp: opponentName,
        time: new Date().toLocaleDateString(undefined, {month: 'short', day: 'numeric'})
    };
    
    history.push(newRecord);
    // Sort records descending based on Player 1 score performance
    history.sort((a, b) => b.p1 - a.p1);
    // Keep only the Top 10 rows
    history = history.slice(0, 10);
    localStorage.setItem('gridLetterLeaderboard', JSON.stringify(history));
}

function updateLeaderboardUI() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    const history = JSON.parse(localStorage.getItem('gridLetterLeaderboard')) || [];
    
    if (history.length === 0) {
        leaderboardList.innerHTML = `<li style="justify-content:center;color:#888;">No highscores logged yet</li>`;
        return;
    }
    
    history.forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>[${item.grid}] P1 vs ${item.opp} (${item.time})</div>
            <span class="score-val">${item.p1} - ${item.p2}</span>
        `;
        leaderboardList.appendChild(li);
    });
}

// Modal View Component Toggle Logic
if (menuTriggerBtn) menuTriggerBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');

if (leaderboardTriggerBtn) {
    leaderboardTriggerBtn.addEventListener('click', () => {
        updateLeaderboardUI();
        leaderboardModal.style.display = 'flex';
    });
}
if (closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', () => leaderboardModal.style.display = 'none');
if (clearLeaderboardBtn) {
    clearLeaderboardBtn.addEventListener('click', () => {
        if (confirm("Clear all scoreboard history records?")) {
            localStorage.removeItem('gridLetterLeaderboard');
            updateLeaderboardUI();
        }
    });
}

if (replayLevelBtn) replayLevelBtn.addEventListener('click', initGame);
if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', () => {
        if (GRID_SIZE < 10) { GRID_SIZE++; initGame(); }
    });
}
if (opponentSelect) opponentSelect.addEventListener('change', initGame);
if (resetBtn) resetBtn.addEventListener('click', initGame);

window.addEventListener('DOMContentLoaded', initGame);
// Dynamic Minimap Toggle Feature
document.addEventListener('DOMContentLoaded', () => {
    const mapHeader = document.querySelector('.minimap-header');
    const mapBox = document.querySelector('.minimap-box');
    
    if (mapHeader && mapBox) {
        mapHeader.addEventListener('click', () => {
            mapBox.classList.toggle('collapsed');
        });
        
        // Auto-collapse on small horizontal viewports to maximize workspace immediately
        if (window.innerHeight < 500) {
            mapBox.classList.add('collapsed');
        }
    }
});
// Register Service Worker for PWA Installation Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered successfully!', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
// --- PWA NATIVE APPLICATION INSTALL CONTROLLER ENGINE ---
(function() {
    let deferredPrompt = null;
    const installSection = document.getElementById('pwa-install-section');
    const installBtn = document.getElementById('pwa-install-btn');
    const iosTip = document.getElementById('pwa-ios-tip');

    // Helper method to detect Apple iOS platform rules
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    // 1. Initial Visibility Filter Checks
    if (isStandalone) {
        // App is already running as an installed application, hide the installation row completely
        if (installSection) installSection.style.display = 'none';
        return;
    }

    if (isIOS) {
        // Display iOS specific installation tips instead of an incompatible script button
        if (installBtn) installBtn.style.display = 'none';
        if (iosTip) iosTip.style.display = 'block';
    } else {
        // Default behavior for Android/Chrome/PC: Hide the button until the browser fires the install event
        if (installSection) installSection.style.display = 'none';
    }

    // 2. Catch the Chromium Native Installation Prompt Event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent older Android systems from forcing their own pop-ups automatically
        e.preventDefault();
        deferredPrompt = e;
        
        // Unhide the section for Desktop/Android platforms since an installer is ready
        if (installSection && !isIOS) {
            installSection.style.display = 'block';
        }
    });

    // 3. Handle the Installation Click Event
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            // Open the browser's system confirmation popup dialogue box
            deferredPrompt.prompt();
            
            // Await user response (Accepted or Cancelled)
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA Deployment Choice Result Outcome: ${outcome}`);
            
            // Clear the deferred prompt variable so it can only be clicked once
            deferredPrompt = null;
            
            // Hide the layout row once installation begins
            if (installSection) installSection.style.display = 'none';
        });
    }

    // 4. Hide the button immediately if the user completes installation via the browser address bar instead
    window.addEventListener('appinstalled', (evt) => {
        console.log('Grid to Letter game has been installed successfully!');
        if (installSection) installSection.style.display = 'none';
    });
})();
// --- APP SPLASH SCREEN DISMISS CONTROLLER ENGINE ---
(function() {
    window.addEventListener('load', () => {
        const splashScreen = document.getElementById('app-splash-screen');
        if (!splashScreen) return;
        
        // Hold the splash overlay active for exactly 1.8 seconds, then fade it out
        setTimeout(() => {
            splashScreen.classList.add('fade-out');
        }, 1800);
    });
})();
