import { ElementType, ELEMENT_NAMES, KEY_MAP } from './elements.js';

/**
 * 用户界面控制器类
 */
export class UIController {
    constructor(canvas, grid, cellSize) {
        this.canvas = canvas;
        this.grid = grid;
        this.cellSize = cellSize;
        this.currentElement = ElementType.SAND;
        this.isDrawing = false;

        this.initEventListeners();
        this.updateCurrentElementDisplay();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());

        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // 元素选择按钮
        document.querySelectorAll('.element-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const element = btn.dataset.element;
                this.setCurrentElement(ElementType[element]);
            });
        });

        // 清空按钮
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.grid.clear();
        });
    }

    /**
     * 处理鼠标按下
     * @param {MouseEvent} e
     */
    handleMouseDown(e) {
        this.isDrawing = true;
        this.placeElement(e);
    }

    /**
     * 处理鼠标移动
     * @param {MouseEvent} e
     */
    handleMouseMove(e) {
        if (this.isDrawing) {
            this.placeElement(e);
        }
    }

    /**
     * 处理鼠标释放
     */
    handleMouseUp() {
        this.isDrawing = false;
    }

    /**
     * 处理触摸开始
     * @param {TouchEvent} e
     */
    handleTouchStart(e) {
        e.preventDefault();
        this.isDrawing = true;
        this.placeElementFromTouch(e);
    }

    /**
     * 处理触摸移动
     * @param {TouchEvent} e
     */
    handleTouchMove(e) {
        e.preventDefault();
        if (this.isDrawing) {
            this.placeElementFromTouch(e);
        }
    }

    /**
     * 从触摸事件获取坐标并放置元素
     * @param {TouchEvent} e
     */
    placeElementFromTouch(e) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((touch.clientX - rect.left) / this.cellSize);
        const y = Math.floor((touch.clientY - rect.top) / this.cellSize);
        this.tryPlaceElement(x, y);
    }

    /**
     * 从鼠标事件获取坐标并放置元素
     * @param {MouseEvent} e
     */
    placeElement(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        this.tryPlaceElement(x, y);
    }

    /**
     * 尝试放置元素
     * @param {number} x - x坐标
     * @param {number} y - y坐标
     */
    tryPlaceElement(x, y) {
        const targetCell = this.grid.get(x, y);

        if (targetCell === ElementType.WOOD) {
            if (this.currentElement === ElementType.FIRE) {
                this.grid.set(x, y, ElementType.FIRE);
            }
        } else if (targetCell === ElementType.BURNING_WOOD) {
            // 燃烧的木头不能被覆盖
        } else {
            this.grid.set(x, y, this.currentElement);
        }
    }

    /**
     * 处理键盘按下
     * @param {KeyboardEvent} e
     */
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (KEY_MAP.hasOwnProperty(key)) {
            this.setCurrentElement(KEY_MAP[key]);
        }
    }

    /**
     * 设置当前元素
     * @param {number} type - 元素类型
     */
    setCurrentElement(type) {
        this.currentElement = type;
        this.updateCurrentElementDisplay();
        this.highlightSelectedButton();
    }

    /**
     * 更新当前元素显示
     */
    updateCurrentElementDisplay() {
        const nameElement = document.getElementById('currentElementName');
        nameElement.textContent = ELEMENT_NAMES[this.currentElement];

        // 设置颜色
        const colorMap = {
            [ElementType.EMPTY]: '#ccc',
            [ElementType.SAND]: 'rgb(255, 255, 0)',
            [ElementType.WATER]: 'rgb(0, 0, 255)',
            [ElementType.WOOD]: 'rgb(139, 69, 19)',
            [ElementType.FIRE]: 'rgb(255, 0, 0)',
            [ElementType.BURNING_WOOD]: 'rgb(255, 165, 0)',
            [ElementType.MUD]: 'rgb(101, 67, 33)'
        };
        nameElement.style.color = colorMap[this.currentElement];
    }

    /**
     * 高亮选中的按钮
     */
    highlightSelectedButton() {
        document.querySelectorAll('.element-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.element === ElementType[this.currentElement]) {
                btn.classList.add('active');
            }
        });
    }
}
