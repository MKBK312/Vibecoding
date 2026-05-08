import { Grid } from './grid.js';
import { PhysicsEngine } from './physics.js';
import { Renderer } from './renderer.js';
import { UIController } from './ui.js';

/**
 * 配置常量
 */
const CONFIG = {
    CELL_SIZE: 10,
    GRID_WIDTH: 80,
    GRID_HEIGHT: 56,
    UPDATE_INTERVAL: 50  // ms
};

/**
 * 主游戏类
 */
class Sandbox {
    constructor() {
        // 初始化网格
        this.grid = new Grid(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT);

        // 获取Canvas
        this.canvas = document.getElementById('sandboxCanvas');

        // 初始化渲染器
        this.renderer = new Renderer(this.canvas, this.grid, CONFIG.CELL_SIZE);

        // 初始化物理引擎
        this.physics = new PhysicsEngine(this.grid);

        // 初始化UI控制器
        this.ui = new UIController(this.canvas, this.grid, CONFIG.CELL_SIZE);

        // 初始化游戏循环
        this.lastUpdate = 0;
        this.startGameLoop();
    }

    /**
     * 开始游戏循环
     */
    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (timestamp - this.lastUpdate >= CONFIG.UPDATE_INTERVAL) {
                this.update();
                this.renderer.render();
                this.lastUpdate = timestamp;
            }
            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }

    /**
     * 更新游戏状态
     */
    update() {
        this.physics.update();
    }
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    new Sandbox();
});
