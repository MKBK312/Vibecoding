import { Grid } from './grid.js';
import { COLORS } from './elements.js';

/**
 * Canvas渲染器类
 */
export class Renderer {
    constructor(canvas, grid, cellSize) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.grid = grid;
        this.cellSize = cellSize;

        // 设置Canvas尺寸
        this.canvas.width = grid.width * cellSize;
        this.canvas.height = grid.height * cellSize;

        // 创建离屏Canvas（双缓冲）
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    /**
     * 渲染网格
     */
    render() {
        const ctx = this.offscreenCtx;

        // 清空画布
        ctx.fillStyle = COLORS[0];
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制所有元素
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const type = this.grid.get(x, y);
                if (type !== 0) {
                    ctx.fillStyle = COLORS[type];
                    ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }

        // 复制到主Canvas
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
}
