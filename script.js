// --- Nastavenia obtiažností ---
// Každá úroveň má definovaný počet riadkov, stĺpcov a mín
const difficulties = [
    { rows: 10, cols: 10, mines: 7 },
    { rows: 12, cols: 12, mines: 15 },
    { rows: 16, cols: 16, mines: 30 }
];
let currentLevel = 0; // Aktuálna úroveň (index v poli difficulties)

// --- Herné premenné ---
let rows, cols, minesCount; // Rozmery a počet mín pre aktuálnu úroveň
let board = [];             // Herná plocha (2D pole), kde sú čísla alebo míny
let revealed = [];          // 2D pole: true = políčko je odhalené
let flagged = [];           // 2D pole: true = políčko je označené vlajkou
let gameOver = false;       // Indikátor, či je hra ukončená
let timer = null;           // Interval pre časovač
let timeLeft = 180;         // Zostávajúci čas v sekundách (3 minúty)
let timerRunning = false;   // Indikátor, či časovač beží
let paused = false;         // Indikátor, či je hra pozastavená

// --- Spustenie novej hry ---
function startGame() {
    currentLevel = 0; // Začni vždy od prvej úrovne
    startLevel();     // Inicializuj úroveň
    resetTimer();     // Resetuj časovač
    hideOverlay();    // Skry overlay (prekrytie)
    document.getElementById('new-game-btn').disabled = false;
    paused = false;
    document.getElementById('pause-btn').classList.remove('paused');
    document.getElementById('pause-btn').textContent = "Pause";
}

// --- Inicializácia aktuálnej úrovne ---
function startLevel() {
    // Nastav rozmery a počet mín podľa obtiažnosti
    rows = difficulties[currentLevel].rows;
    cols = difficulties[currentLevel].cols;
    minesCount = difficulties[currentLevel].mines;

    // Pridaj CSS triedu podľa úrovne (pre prípadné štýlovanie)
    document.body.classList.remove('level-1', 'level-2', 'level-3');
    document.body.classList.add(`level-${currentLevel + 1}`);

    // Vynuluj herné polia a stav
    board = [];
    revealed = [];
    flagged = [];
    gameOver = false;

    // Vytvor prázdnu hraciu plochu
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        revealed[r] = [];
        flagged[r] = [];
        for (let c = 0; c < cols; c++) {
            board[r][c] = 0;
            revealed[r][c] = false;
            flagged[r][c] = false;
        }
    }
    // Náhodne rozmiestni míny
    let placed = 0;
    while (placed < minesCount) {
        let r = Math.floor(Math.random() * rows);
        let c = Math.floor(Math.random() * cols);
        if (board[r][c] !== "M") {
            board[r][c] = "M";
            placed++;
        }
    }
    // Spočítaj čísla okolo mín
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c] === "M") continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        if (board[nr][nc] === "M") count++;
                    }
                }
            }
            board[r][c] = count;
        }
    }
    updateTopBar(); // Aktualizuj horný panel (miny, čas, úroveň)
    render();       // Vykresli hraciu plochu
    document.getElementById('message').textContent = '';
    document.getElementById('message').className = '';
    hideOverlay();
}

// --- Aktualizácia horného panela (miny, čas, úroveň) ---
function updateTopBar() {
    let flaggedCount = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (flagged[r][c]) flaggedCount++;
    document.getElementById('mines-left').textContent = `Mines: ${minesCount - flaggedCount}`;
    document.getElementById('timer').textContent = formatTime(timeLeft);
    document.getElementById('level-indicator').textContent = `Level ${currentLevel + 1}/3`;
}

// --- Formátovanie času na MM:SS ---
function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --- Reset časovača ---
function resetTimer() {
    timeLeft = 180;
    timerRunning = false;
    clearInterval(timer);
    updateTopBar();
}

// --- Spustenie časovača ---
function startTimer() {
    if (timerRunning || paused) return;
    timerRunning = true;
    timer = setInterval(() => {
        if (gameOver || paused) {
            clearInterval(timer);
            timerRunning = false;
            return;
        }
        timeLeft--;
        updateTopBar();
        if (timeLeft <= 0) {
            gameOver = true;
            revealAll();
            showMessage("Time's up! Try again.", false);
            clearInterval(timer);
            document.getElementById('new-game-btn').disabled = false;
            showOverlay("Time's up!", false, false);
        }
    }, 1000);
}

// --- Vykreslenie hracej plochy ---
function render() {
    updateTopBar();
    const game = document.getElementById('game');
    game.innerHTML = '';
    for (let r = 0; r < rows; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            // Odhalené políčko
            if (revealed[r][c]) {
                cell.classList.add('revealed');
                if (board[r][c] === "M") {
                    cell.classList.add('mine');
                    cell.textContent = "💣";
                } else if (board[r][c] > 0) {
                    cell.textContent = board[r][c];
                    cell.setAttribute('data-num', board[r][c]);
                    // Chording: klik na číslo odhalí susedné políčka ak je správny počet vlajok
                    cell.addEventListener('click', (e) => {
                        if (gameOver || paused) return;
                        chordReveal(r, c);
                    });
                }
            }
            // Označené vlajkou
            else if (flagged[r][c]) {
                cell.classList.add('flagged');
                cell.textContent = "🚩";
            }
            // Kliknutie na neodhalené políčko
            if (!revealed[r][c]) {
                cell.addEventListener('click', (e) => {
                    if (gameOver || paused) return;
                    if (!timerRunning) startTimer();
                    if (e.button === 0) reveal(r, c);
                });
            }
            // Pravý klik na označenie vlajky
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (gameOver || paused) return;
                toggleFlag(r, c);
            });
            rowDiv.appendChild(cell);
        }
        game.appendChild(rowDiv);
    }
}

// --- Odhalenie políčka ---
function reveal(r, c) {
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    // Ak je tam mína, hra končí
    if (board[r][c] === "M") {
        gameOver = true;
        revealAll();
        clearInterval(timer);
        document.getElementById('new-game-btn').disabled = false;
        showOverlay("You hit a mine!", false, false, true);
        updateTopBar();
        render();
        return;
    }
    // Ak je tam nula, rekurzívne odhaľ susedné políčka
    if (board[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (!revealed[nr][nc]) reveal(nr, nc);
                }
            }
        }
    }
    checkWin();
    render();
}

// --- Označenie alebo odznačenie vlajky ---
function toggleFlag(r, c) {
    if (revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    updateTopBar();
    render();
}

// --- Odhalenie všetkých políčok (pri prehre alebo výhre) ---
function revealAll() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            revealed[r][c] = true;
        }
    }
    render();
}

// --- Kontrola výhry ---
function checkWin() {
    let safe = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!revealed[r][c] && board[r][c] !== "M") safe++;
        }
    }
    // Ak sú všetky bezpečné políčka odhalené
    if (safe === 0) {
        if (currentLevel < 2) {
            showMessage(`Level ${currentLevel + 1}/3 complete!`, true);
            showOverlay(`Level ${currentLevel + 1}/3 complete!`, true, true);
            clearInterval(timer);
            timerRunning = false;
        } else {
            gameOver = true;
            revealAll();
            showMessage("Congratulations! You won the game! 🎉", true);
            clearInterval(timer);
            document.getElementById('new-game-btn').disabled = false;
            showOverlay("Congratulations! You won the game! 🎉", true, false);
        }
    }
}

// --- Zobrazenie správy dole (už sa používa len pri výhre) ---
function showMessage(text, win) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = win ? 'win' : '';
}

// --- Chording: klik na číslo odhalí susedné políčka ak je správny počet vlajok ---
function chordReveal(r, c) {
    if (!revealed[r][c] || board[r][c] <= 0) return;
    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (flagged[nr][nc]) flagCount++;
            }
        }
    }
    if (flagCount !== board[r][c]) return;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (!revealed[nr][nc] && !flagged[nr][nc]) {
                    reveal(nr, nc);
                }
            }
        }
    }
    render();
}

// --- Overlay: zobrazenie správy v strede hry (výhra, prehra, pauza, ďalšia úroveň) ---
function showOverlay(message, win, showNext, lose = false) {
    const overlay = document.getElementById('overlay');
    const overlayMsg = document.getElementById('overlay-message');
    const nextBtn = document.getElementById('next-level-btn');
    overlayMsg.textContent = message;
    overlayMsg.className = win ? 'win' : (lose ? 'lose' : '');
    overlay.classList.remove('hidden');
    if (showNext) {
        nextBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.add('hidden');
    }
    // Skry spodnú správu, keď je overlay aktívny
    document.getElementById('message').textContent = '';
    document.getElementById('message').className = '';
}

// --- Skry overlay ---
function hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('next-level-btn').classList.add('hidden');
}

// --- Prechod na ďalšiu úroveň ---
function nextLevel() {
    if (currentLevel < 2) {
        currentLevel++;
        startLevel();
        hideOverlay();
    }
}

// --- Pozastavenie a obnovenie hry ---
function togglePause() {
    if (!document.getElementById('overlay').classList.contains('hidden')) return;
    if (gameOver) return;
    paused = !paused;
    const pauseBtn = document.getElementById('pause-btn');
    if (paused) {
        pauseBtn.classList.add('paused');
        pauseBtn.textContent = "Resume";
        showOverlay("Paused", false, false);
        clearInterval(timer);
        timerRunning = false;
    } else {
        pauseBtn.classList.remove('paused');
        pauseBtn.textContent = "Pause";
        hideOverlay();
        startTimer();
    }
}

// --- Spustenie hry po načítaní stránky ---
window.onload = () => {
    document.getElementById('new-game-btn').disabled = false;
    startGame();
};