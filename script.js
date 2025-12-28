const game = {
    board: [],
    size: 8,
    gems: ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'],
    selected: null,
    score: 0,
    moves: 30,
    level: 1,
    targetScore: 1000,
    combo: 0,
    animating: false,

    init() {
        this.createBoard();
        this.render();
    },

    createBoard() {
        this.board = [];
        for (let row = 0; row < this.size; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.size; col++) {
                this.board[row][col] = this.randomGem();
            }
        }
        
        // Remove any initial matches
        while (this.hasMatches()) {
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    if (this.isPartOfMatch(row, col)) {
                        this.board[row][col] = this.randomGem();
                    }
                }
            }
        }
    },

    randomGem() {
        return this.gems[Math.floor(Math.random() * this.gems.length)];
    },

    render() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = this.board[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.onclick = () => this.selectCell(row, col);
                boardEl.appendChild(cell);
            }
        }

        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.moves;
        document.getElementById('level').textContent = this.level;
        
        const progress = Math.min((this.score / this.targetScore) * 100, 100);
        document.getElementById('progress').style.width = progress + '%';
        document.getElementById('progressText').textContent = `${this.score} / ${this.targetScore}`;
    },

    selectCell(row, col) {
        if (this.animating) return;

        const cells = document.querySelectorAll('.cell');
        const index = row * this.size + col;

        if (this.selected === null) {
            this.selected = { row, col };
            cells[index].classList.add('selected');
        } else {
            const prevIndex = this.selected.row * this.size + this.selected.col;
            cells[prevIndex].classList.remove('selected');

            if (this.isAdjacent(this.selected.row, this.selected.col, row, col)) {
                this.swap(this.selected.row, this.selected.col, row, col);
            } else {
                this.selected = { row, col };
                cells[index].classList.add('selected');
            }
        }
    },

    isAdjacent(r1, c1, r2, c2) {
        return (Math.abs(r1 - r2) === 1 && c1 === c2) || 
               (Math.abs(c1 - c2) === 1 && r1 === r2);
    },

    async swap(r1, c1, r2, c2) {
        this.animating = true;
        
        // Swap gems
        const temp = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = temp;
        
        this.render();
        await this.delay(200);

        if (this.hasMatches()) {
            this.moves--;
            this.combo = 0;
            await this.processMatches();
            
            if (this.score >= this.targetScore) {
                this.levelUp();
            }
            
            if (this.moves <= 0) {
                this.gameOver();
            }
        } else {
            // Swap back if no match
            this.board[r2][c2] = this.board[r1][c1];
            this.board[r1][c1] = temp;
            this.render();
            this.showMessage('No match! Try again');
        }

        this.selected = null;
        this.animating = false;
    },

    hasMatches() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.isPartOfMatch(row, col)) {
                    return true;
                }
            }
        }
        return false;
    },

    isPartOfMatch(row, col) {
        const gem = this.board[row][col];
        
        // Check horizontal
        let hCount = 1;
        let left = col - 1;
        while (left >= 0 && this.board[row][left] === gem) {
            hCount++;
            left--;
        }
        let right = col + 1;
        while (right < this.size && this.board[row][right] === gem) {
            hCount++;
            right++;
        }

        // Check vertical
        let vCount = 1;
        let up = row - 1;
        while (up >= 0 && this.board[up][col] === gem) {
            vCount++;
            up--;
        }
        let down = row + 1;
        while (down < this.size && this.board[down][col] === gem) {
            vCount++;
            down++;
        }

        return hCount >= 3 || vCount >= 3;
    },

    async processMatches() {
        let matchFound = true;
        
        while (matchFound) {
            matchFound = false;
            const toRemove = [];

            // Find all matches
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    if (this.isPartOfMatch(row, col)) {
                        toRemove.push({ row, col });
                        matchFound = true;
                    }
                }
            }

            if (toRemove.length > 0) {
                this.combo++;
                const points = toRemove.length * 10 * this.combo;
                this.score += points;

                if (this.combo > 1) {
                    this.showCombo();
                }

                // Animate matched gems
                toRemove.forEach(({ row, col }) => {
                    const index = row * this.size + col;
                    const cells = document.querySelectorAll('.cell');
                    cells[index].classList.add('matched');
                    this.createParticles(cells[index]);
                });

                await this.delay(500);

                // Remove matched gems
                toRemove.forEach(({ row, col }) => {
                    this.board[row][col] = null;
                });

                this.dropGems();
                this.render();
                await this.delay(300);
            }
        }
    },

    dropGems() {
        for (let col = 0; col < this.size; col++) {
            let emptyRow = this.size - 1;
            
            // Drop existing gems
            for (let row = this.size - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    if (row !== emptyRow) {
                        this.board[emptyRow][col] = this.board[row][col];
                        this.board[row][col] = null;
                    }
                    emptyRow--;
                }
            }

            // Fill empty spaces with new gems
            for (let row = 0; row <= emptyRow; row++) {
                this.board[row][col] = this.randomGem();
            }
        }
    },

    createParticles(element) {
        const rect = element.getBoundingClientRect();
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3'];
        
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = rect.left + rect.width / 2 + 'px';
            particle.style.top = rect.top + rect.height / 2 + 'px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80 + 40;
            particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
            particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }
    },

    showCombo() {
        const combo = document.createElement('div');
        combo.className = 'combo-popup';
        combo.textContent = `${this.combo}x COMBO! 🔥`;
        document.body.appendChild(combo);
        setTimeout(() => combo.remove(), 1000);
    },

    showMessage(text) {
        const msg = document.getElementById('message');
        msg.textContent = text;
        setTimeout(() => msg.textContent = '', 2000);
    },

    hint() {
        // Find a valid move
        for (let r1 = 0; r1 < this.size; r1++) {
            for (let c1 = 0; c1 < this.size; c1++) {
                const directions = [[0,1], [1,0], [0,-1], [-1,0]];
                for (let [dr, dc] of directions) {
                    const r2 = r1 + dr;
                    const c2 = c1 + dc;
                    if (r2 >= 0 && r2 < this.size && c2 >= 0 && c2 < this.size) {
                        // Try swap
                        const temp = this.board[r1][c1];
                        this.board[r1][c1] = this.board[r2][c2];
                        this.board[r2][c2] = temp;
                        
                        if (this.hasMatches()) {
                            // Swap back
                            this.board[r2][c2] = this.board[r1][c1];
                            this.board[r1][c1] = temp;
                            
                            // Highlight the hint
                            const cells = document.querySelectorAll('.cell');
                            const i1 = r1 * this.size + c1;
                            const i2 = r2 * this.size + c2;
                            cells[i1].style.background = '#ffd700';
                            cells[i2].style.background = '#ffd700';
                            setTimeout(() => {
                                cells[i1].style.background = '';
                                cells[i2].style.background = '';
                            }, 1500);
                            return;
                        }
                        
                        // Swap back
                        this.board[r2][c2] = this.board[r1][c1];
                        this.board[r1][c1] = temp;
                    }
                }
            }
        }
        this.showMessage('No moves available! 😅');
    },

    levelUp() {
        this.level++;
        this.targetScore += 1000;
        this.moves += 20;
        
        const popup = document.createElement('div');
        popup.className = 'combo-popup';
        popup.textContent = `Level ${this.level}! 🎉`;
        popup.style.color = '#4caf50';
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1500);
        
        this.render();
    },

    gameOver() {
        const overlay = document.createElement('div');
        overlay.className = 'game-over';
        overlay.innerHTML = `
            <h2>🎮 Game Over! 🎮</h2>
            <p>Final Score: ${this.score}</p>
            <p>Level Reached: ${this.level}</p>
            <button class="btn" onclick="game.newGame(); this.parentElement.remove()">Play Again</button>
        `;
        document.body.appendChild(overlay);
    },

    endGame() {
        if (confirm('Are you sure you want to end the current game?')) {
            clearInterval(this.gameLoop);
            clearInterval(this.spawnInterval);
            document.getElementById('inputBox')?.setAttribute('disabled', 'true');
            
            this.activeWords?.forEach(w => w.element?.remove());
            this.activeWords = [];
            
            const overlay = document.createElement('div');
            overlay.className = 'game-over';
            overlay.innerHTML = `
                <h2>🎮 Game Ended! 🎮</h2>
                <p>Final Score: ${this.score}</p>
                <p>Level Reached: ${this.level}</p>
                <p>You ended the game with ${this.moves} moves remaining.</p>
                <button class="btn" onclick="game.newGame(); this.parentElement.remove()">Play Again</button>
            `;
            document.body.appendChild(overlay);
        }
    },

    newGame() {
        this.score = 0;
        this.moves = 30;
        this.level = 1;
        this.targetScore = 1000;
        this.combo = 0;
        this.selected = null;
        this.createBoard();
        this.render();
        document.getElementById('message').textContent = '';
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

window.onload = () => game.init();