import { ElementType } from './elements.js';

/**
 * 网格管理器类
 */
export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = new Uint8Array(width * height);
        this.initialize();
    }

    /**
     * 初始化网格
     */
    initialize() {
        for (let i = 0; i < this.width * this.height; i++) {
            this.cells[i] = ElementType.EMPTY;
        }
    }

    /**
     * 获取元素类型
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {number} 元素类型
     */
    get(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return -1;
        }
        return this.cells[y * this.width + x];
    }

    /**
     * 设置元素类型
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @param {number} type - 元素类型
     */
    set(x, y, type) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        this.cells[y * this.width + x] = type;
    }

    /**
     * 检查坐标是否在边界内
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     * @returns {boolean}
     */
    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * 清空网格
     */
    clear() {
        this.initialize();
    }
}
