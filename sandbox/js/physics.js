import { Grid } from './grid.js';
import { ElementType } from './elements.js';

/**
 * 物理引擎类
 */
export class PhysicsEngine {
    constructor(grid) {
        this.grid = grid;
    }

    /**
     * 更新物理状态
     */
    update() {
        // 第一步：沙子接触水变成泥巴
        this.sandToMud();

        // 第二步：泥巴下沉（与水交换位置）
        this.mudFalling();

        // 第三步：水流动（只移动到空单元格）
        this.waterFlow();
    }

    /**
     * 沙子接触水变成泥巴
     */
    sandToMud() {
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                if (this.grid.get(x, y) === ElementType.SAND) {
                    const hasWater = this.checkAdjacentWater(x, y);
                    if (hasWater) {
                        this.grid.set(x, y, ElementType.MUD);
                    }
                }
            }
        }
    }

    /**
     * 检查周围是否有水
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {boolean}
     */
    checkAdjacentWater(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (this.grid.get(nx, ny) === ElementType.WATER) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 泥巴下沉（与水交换位置）
     */
    mudFalling() {
        for (let y = this.grid.height - 2; y >= 0; y--) {
            for (let x = 0; x < this.grid.width; x++) {
                if (this.grid.get(x, y) === ElementType.MUD) {
                    let moved = false;

                    // 优先向下移动
                    if (this.grid.get(x, y + 1) === ElementType.EMPTY) {
                        this.grid.set(x, y + 1, ElementType.MUD);
                        this.grid.set(x, y, ElementType.EMPTY);
                        moved = true;
                    } else if (this.grid.get(x, y + 1) === ElementType.WATER) {
                        this.grid.set(x, y + 1, ElementType.MUD);
                        this.grid.set(x, y, ElementType.WATER);
                        moved = true;
                    }

                    // 如果不能直接向下，尝试斜向下
                    if (!moved) {
                        const canLeft = (x > 0 && (this.grid.get(x - 1, y + 1) === ElementType.EMPTY || this.grid.get(x - 1, y + 1) === ElementType.WATER));
                        const canRight = (x < this.grid.width - 1 && (this.grid.get(x + 1, y + 1) === ElementType.EMPTY || this.grid.get(x + 1, y + 1) === ElementType.WATER));

                        if (canLeft && canRight) {
                            if (Math.random() < 0.5) {
                                if (this.grid.get(x - 1, y + 1) === ElementType.WATER) {
                                    this.grid.set(x - 1, y + 1, ElementType.MUD);
                                    this.grid.set(x, y, ElementType.WATER);
                                } else {
                                    this.grid.set(x - 1, y + 1, ElementType.MUD);
                                    this.grid.set(x, y, ElementType.EMPTY);
                                }
                            } else {
                                if (this.grid.get(x + 1, y + 1) === ElementType.WATER) {
                                    this.grid.set(x + 1, y + 1, ElementType.MUD);
                                    this.grid.set(x, y, ElementType.WATER);
                                } else {
                                    this.grid.set(x + 1, y + 1, ElementType.MUD);
                                    this.grid.set(x, y, ElementType.EMPTY);
                                }
                            }
                        } else if (canLeft) {
                            if (this.grid.get(x - 1, y + 1) === ElementType.WATER) {
                                this.grid.set(x - 1, y + 1, ElementType.MUD);
                                this.grid.set(x, y, ElementType.WATER);
                            } else {
                                this.grid.set(x - 1, y + 1, ElementType.MUD);
                                this.grid.set(x, y, ElementType.EMPTY);
                            }
                        } else if (canRight) {
                            if (this.grid.get(x + 1, y + 1) === ElementType.WATER) {
                                this.grid.set(x + 1, y + 1, ElementType.MUD);
                                this.grid.set(x, y, ElementType.WATER);
                            } else {
                                this.grid.set(x + 1, y + 1, ElementType.MUD);
                                this.grid.set(x, y, ElementType.EMPTY);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * 水流动（只移动到空单元格）
     */
    waterFlow() {
        for (let y = this.grid.height - 1; y >= 0; y--) {
            for (let x = 0; x < this.grid.width; x++) {
                if (this.grid.get(x, y) === ElementType.WATER) {
                    if (y < this.grid.height - 1 && this.grid.get(x, y + 1) === ElementType.EMPTY) {
                        this.grid.set(x, y + 1, ElementType.WATER);
                        this.grid.set(x, y, ElementType.EMPTY);
                    } else {
                        if (x > 0 && this.grid.get(x - 1, y) === ElementType.EMPTY) {
                            this.grid.set(x - 1, y, ElementType.WATER);
                            this.grid.set(x, y, ElementType.EMPTY);
                        } else if (x < this.grid.width - 1 && this.grid.get(x + 1, y) === ElementType.EMPTY) {
                            this.grid.set(x + 1, y, ElementType.WATER);
                            this.grid.set(x, y, ElementType.EMPTY);
                        }
                    }
                }
            }
        }
    }
}
