class ElementSimulation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 10;
        this.gridWidth = Math.floor(this.canvas.width / this.cellSize);
        this.gridHeight = Math.floor(this.canvas.height / this.cellSize);
        this.grid = this.createGrid();
        this.selectedElement = 'wood';
        this.isMouseDown = false;
        this.gravity = 0.05;
        this.mudGravityInWater = 0.04;
        this.elements = {
            wood: { color: '#8B4513', solid: true, flammable: true },
            water: { color: '#1E90FF', solid: false, flows: true, speed: 2 },
            sand: { color: '#F4A460', solid: true, flows: true, speed: 1 },
            fire: { color: '#FF4500', solid: false, temporary: true, duration: 500 },
            char: { color: '#696969', solid: true, flammable: false },
            mud: { color: '#5D4037', solid: false, flows: true, speed: 1.5 }
        };
        this.fireTimers = new Map();
        this.initEventListeners();
        this.animate();
    }

    createGrid() {
        const grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            const row = [];
            for (let x = 0; x < this.gridWidth; x++) {
                row.push(null);
            }
            grid.push(row);
        }
        return grid;
    }

    initEventListeners() {
        document.getElementById('wood').addEventListener('click', () => this.selectElement('wood'));
        document.getElementById('water').addEventListener('click', () => this.selectElement('water'));
        document.getElementById('sand').addEventListener('click', () => this.selectElement('sand'));
        document.getElementById('fire').addEventListener('click', () => this.selectElement('fire'));

        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.placeElement(e);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isMouseDown) {
                this.placeElement(e);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
        });
    }

    selectElement(element) {
        this.selectedElement = element;
        document.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
        document.getElementById(element).classList.add('selected');
    }

    placeElement(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);

        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
            if (this.selectedElement === 'fire') {
                if (this.grid[y][x] === 'wood') {
                    this.grid[y][x] = 'fire';
                    this.fireTimers.set(`${x},${y}`, {
                        type: 'wood',
                        startTime: Date.now(),
                        duration: 3000
                    });
                } else if (this.grid[y][x] === 'char') {
                    this.grid[y][x] = 'fire';
                    this.fireTimers.set(`${x},${y}`, {
                        type: 'char',
                        startTime: Date.now(),
                        duration: 3000
                    });
                } else if (this.grid[y][x] === null) {
                    this.grid[y][x] = 'fire';
                    this.fireTimers.set(`${x},${y}`, {
                        type: 'other',
                        startTime: Date.now(),
                        duration: 500
                    });
                }
            } else {
                this.grid[y][x] = this.selectedElement;
            }
        }
    }

    update() {
        this.updateFire();
        this.updateMud();
        this.updateWater();
        this.updateSand();
        this.checkWaterCharInteractions();
        this.handleSandWaterInteraction();
    }

    updateFire() {
        const now = Date.now();
        const timersToRemove = [];

        for (const [key, timer] of this.fireTimers.entries()) {
            const [x, y] = key.split(',').map(Number);

            if (now - timer.startTime >= timer.duration) {
                if (timer.type === 'wood') {
                    this.grid[y][x] = 'char';
                } else if (timer.type === 'char') {
                    this.grid[y][x] = 'char';
                } else {
                    this.grid[y][x] = null;
                }
                timersToRemove.push(key);
            }
        }

        for (const key of timersToRemove) {
            this.fireTimers.delete(key);
        }
    }

    updateMud() {
        const newGrid = this.createGrid();

        for (let y = this.gridHeight - 1; y >= 0; y--) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 'mud') {
                    let moved = false;

                    if (y + 1 < this.gridHeight) {
                        if (this.grid[y + 1][x] === null) {
                            newGrid[y + 1][x] = 'mud';
                            moved = true;
                        } else if (this.grid[y + 1][x] === 'water') {
                            newGrid[y + 1][x] = 'mud';
                            moved = true;
                        } else if (x - 1 >= 0 && (this.grid[y + 1][x - 1] === null || this.grid[y + 1][x - 1] === 'water')) {
                            newGrid[y + 1][x - 1] = 'mud';
                            moved = true;
                        } else if (x + 1 < this.gridWidth && (this.grid[y + 1][x + 1] === null || this.grid[y + 1][x + 1] === 'water')) {
                            newGrid[y + 1][x + 1] = 'mud';
                            moved = true;
                        }
                    }

                    if (!moved) {
                        newGrid[y][x] = 'mud';
                    }
                } else if (this.grid[y][x] !== null) {
                    newGrid[y][x] = this.grid[y][x];
                }
            }
        }

        this.grid = newGrid;
    }

    updateWater() {
        const newGrid = this.createGrid();

        for (let y = this.gridHeight - 1; y >= 0; y--) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 'water') {
                    let moved = false;
                    const speed = this.elements.water.speed;

                    for (let i = 0; i < speed && !moved; i++) {
                        if (y + 1 < this.gridHeight) {
                            if (this.grid[y + 1][x] === null) {
                                newGrid[y + 1][x] = 'water';
                                moved = true;
                            } else if (x - 1 >= 0 && this.grid[y + 1][x - 1] === null) {
                                newGrid[y + 1][x - 1] = 'water';
                                moved = true;
                            } else if (x + 1 < this.gridWidth && this.grid[y + 1][x + 1] === null) {
                                newGrid[y + 1][x + 1] = 'water';
                                moved = true;
                            }
                        } else {
                            moved = true;
                        }
                    }

                    if (!moved) {
                        newGrid[y][x] = 'water';
                    }
                } else if (this.grid[y][x] !== null) {
                    newGrid[y][x] = this.grid[y][x];
                }
            }
        }

        this.grid = newGrid;
    }

    updateSand() {
        const newGrid = this.createGrid();

        for (let y = this.gridHeight - 1; y >= 0; y--) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 'sand') {
                    let moved = false;
                    const speed = this.elements.sand.speed;

                    for (let i = 0; i < speed && !moved; i++) {
                        if (y + 1 < this.gridHeight) {
                            if (this.grid[y + 1][x] === null) {
                                newGrid[y + 1][x] = 'sand';
                                moved = true;
                            } else if (x - 1 >= 0 && this.grid[y + 1][x - 1] === null) {
                                newGrid[y + 1][x - 1] = 'sand';
                                moved = true;
                            } else if (x + 1 < this.gridWidth && this.grid[y + 1][x + 1] === null) {
                                newGrid[y + 1][x + 1] = 'sand';
                                moved = true;
                            }
                        } else {
                            moved = true;
                        }
                    }

                    if (!moved) {
                        newGrid[y][x] = 'sand';
                    }
                } else if (this.grid[y][x] !== null) {
                    newGrid[y][x] = this.grid[y][x];
                }
            }
        }

        this.grid = newGrid;
    }

    checkWaterCharInteractions() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 'water' || this.grid[y][x] === 'mud') {
                    if (y + 1 < this.gridHeight && this.grid[y + 1][x] === 'char') {
                        this.grid[y + 1][x] = null;
                    }
                    if (x - 1 >= 0 && this.grid[y][x - 1] === 'char') {
                        this.grid[y][x - 1] = null;
                    }
                    if (x + 1 < this.gridWidth && this.grid[y][x + 1] === 'char') {
                        this.grid[y][x + 1] = null;
                    }
                    if (y - 1 >= 0 && this.grid[y - 1][x] === 'char') {
                        this.grid[y - 1][x] = null;
                    }
                }
            }
        }
    }

    handleSandWaterInteraction() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x] === 'sand') {
                    let isInWater = false;

                    if (y - 1 >= 0 && this.grid[y - 1][x] === 'water') isInWater = true;
                    if (y + 1 < this.gridHeight && this.grid[y + 1][x] === 'water') isInWater = true;
                    if (x - 1 >= 0 && this.grid[y][x - 1] === 'water') isInWater = true;
                    if (x + 1 < this.gridWidth && this.grid[y][x + 1] === 'water') isInWater = true;

                    if (isInWater) {
                        this.grid[y][x] = 'mud';
                    }
                }
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const element = this.grid[y][x];
                if (element) {
                    this.ctx.fillStyle = this.elements[element].color;
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

window.onload = function() {
    new ElementSimulation('canvas');
};