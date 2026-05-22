(function() {
    const ROOT_ELEMENT = document.documentElement;
    const INITIAL_THICKNESS = 6;
    const MAX_THICKNESS = 12;
    
    // Theme Initializer with LocalStorage validation logic
    const savedTheme = localStorage.getItem('savedGameWallpaper') || 'default';
    applyWallpaperClass(savedTheme);

    window.onGameReset = function(activeGridSize) {
        ROOT_ELEMENT.style.setProperty('--line-thickness', `${INITIAL_THICKNESS}px`);
        const maxLines = 2 * activeGridSize * (activeGridSize + 1);
        const logP1 = document.getElementById('log-p1');
        const logP2 = document.getElementById('log-p2');
        if (logP1) logP1.textContent = `Placed: 0 | Open: ${maxLines}`;
        if (logP2) logP2.textContent = `Placed: 0 | Lock: 0%`;
    };

    window.onMoveExecuted = function(activePlayer, accumulatedMoveCounts, currentGrid) {
        const totalGameMoves = accumulatedMoveCounts[1] + accumulatedMoveCounts[2];
        const maxLinesInLevel = 2 * currentGrid * (currentGrid + 1);
        
        const growthStep = (MAX_THICKNESS - INITIAL_THICKNESS) / maxLinesInLevel;
        const computedThickness = INITIAL_THICKNESS + (totalGameMoves * growthStep);
        ROOT_ELEMENT.style.setProperty('--line-thickness', `${Math.min(computedThickness, MAX_THICKNESS)}px`);
        
        const logP1 = document.getElementById('log-p1');
        const logP2 = document.getElementById('log-p2');
        if (logP1 && logP2) {
            logP1.textContent = `Placed: ${accumulatedMoveCounts[1]} | Open: ${maxLinesInLevel - totalGameMoves}`;
            logP2.textContent = `Placed: ${accumulatedMoveCounts[2]} | Lock: ${Math.round((accumulatedMoveCounts[2]/maxLinesInLevel)*100)}%`;
        }
        triggerPulseAnimation(activePlayer);
    };

    function triggerPulseAnimation(playerNum) {
        const targetCard = document.getElementById(`card-p${playerNum}`);
        if (targetCard) {
            targetCard.style.transform = 'scale(1.04)';
            setTimeout(() => targetCard.style.transform = 'scale(1)', 120);
        }
    }

    // FIXED: Mini-map setup handles expanding layouts dynamically
    window.syncMiniMapStructure = function(size) {
        const miniGridContainer = document.getElementById('minimap-grid');
        if (!miniGridContainer) return;
        
        miniGridContainer.innerHTML = '';
        miniGridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        miniGridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;
        
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement('div');
                cell.className = 'mini-cell';
                cell.id = `mini-cell-${r}-${c}`;
                miniGridContainer.appendChild(cell);
            }
        }
    };

    window.updateMiniMapSelection = function(size) {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const boardBox = document.getElementById(`box-${r}-${c}`);
                const miniCell = document.getElementById(`mini-cell-${r}-${c}`);
                
                if (boardBox && miniCell) {
                    if (boardBox.classList.contains('p1')) {
                        miniCell.className = 'mini-cell p1';
                    } else if (boardBox.classList.contains('p2')) {
                        miniCell.className = 'mini-cell p2';
                    }
                }
            }
        }
    };

    // Theme Picker Click Registration Engine
    document.querySelectorAll('.theme-tile').forEach(tile => {
        tile.addEventListener('click', (e) => {
            const selectedTheme = e.target.dataset.theme;
            localStorage.setItem('savedGameWallpaper', selectedTheme);
            applyWallpaperClass(selectedTheme);
        });
    });

    function applyWallpaperClass(themeName) {
        document.body.className = ''; // Wipe existing active settings
        if (themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
    }
})();
