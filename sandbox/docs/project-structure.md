# 沙盒游戏项目结构文档

## 项目概述

这是一个基于 Canvas 的像素风格沙盒模拟游戏，前端使用纯 HTML/CSS/JS，后端 C++ 版本作为参考。当前活跃版本是 Web 版本。

---

## 1. 项目结构

```
E:/COLIN/vibecoding/sandbox/
├── index.html              # 主入口 - 独立运行的 Web 版本
├── css/
│   └── style.css           # UI 样式
├── js/
│   ├── main.js             # 入口点，Sandbox 类
│   ├── grid.js             # Grid 类，使用 Uint8Array 存储
│   ├── elements.js          # 元素类型、颜色、键盘映射
│   ├── physics.js          # 物理引擎（沙→泥、水流动等）
│   ├── renderer.js         # Canvas 渲染器（双缓冲）
│   └── ui.js               # 鼠标/键盘/触摸输入处理
├── src/                    # C++ 后端（参考实现）
│   ├── main.cpp
│   ├── core/               # 核心类
│   │   ├── Game.h/cpp
│   │   ├── Grid.h/cpp
│   │   └── Element.h/cpp
│   ├── elements/           # 元素实现
│   │   ├── Water.h/cpp
│   │   ├── Sand.h/cpp
│   │   ├── Wood.h/cpp
│   │   ├── Fire.h/cpp
│   │   ├── BurningWood.h/cpp
│   │   └── EmptyElement.h/cpp
│   └── utils/
│       ├── Timer.h/cpp
│       └── Random.h/cpp
├── assets/                 # 字体和纹理
├── CMakeLists.txt
└── docs/                   # 文档目录（本文件）
```

---

## 2. 前端架构 (Web 版本)

### 2.1 核心类

| 文件 | 类 | 职责 |
|------|-----|------|
| `js/main.js` | `Sandbox` | 游戏主循环，初始化各模块 |
| `js/grid.js` | `Grid` | 使用 `Uint8Array` 高效存储格子数据 |
| `js/renderer.js` | `Renderer` | Canvas 渲染，双缓冲机制 |
| `js/physics.js` | `PhysicsEngine` | 物理模拟逻辑 |
| `js/ui.js` | `UIController` | 用户输入处理 |

### 2.2 元素系统

**元素类型定义在 `js/elements.js`：**

| 常量 | 值 | 颜色 | 行为 |
|------|---|------|------|
| `EMPTY` | 0 | 黑色 | 空单元格 |
| `SAND` | 1 | 黄色 | 受重力下落，接触水变成泥 |
| `WATER` | 2 | 蓝色 | 向下流动，然后水平流动 |
| `WOOD` | 3 | 棕色 | 静态，可被点燃 |
| `FIRE` | 4 | 红色 | 有 500ms 生命周期，点燃木头 |
| `BURNING_WOOD` | 5 | 橙色 | 燃烧 3 秒，蔓延到附近木头 |
| `MUD` | 6 | 深棕色 | 沙+水生成，可沉入水中 |
| `ASH` | 7 | 灰色 | 燃烧完毕后的灰烬 |

### 2.3 物理规则

1. **沙粒下落**：优先向下 → 斜向下 → 保持
2. **泥巴形成**：沙粒接触水 → 泥巴（保留水）
3. **水流**：向下 → 斜向下 → 水平随机扩散
4. **火焰蔓延**：燃烧木头相邻的木头 5 秒后点燃
5. **灭火**：水接触火或燃烧木头 → 移除火元素
6. **燃烧计时**：火=500ms，燃烧木头=3000ms

### 2.4 放置规则

- 不能放置在 WOOD、BURNING_WOOD、FIRE、MUD、ASH 上
- 只有 FIRE 可以放置在 WOOD 上（点燃）
- 水不能放置在木系元素上

---

## 3. 游戏配置 (index.html)

```javascript
CANVAS_WIDTH = 800
CANVAS_HEIGHT = 560
CELL_SIZE = 10              // 每格像素大小
GRID_WIDTH = 80             // 80 格
GRID_HEIGHT = 56            // 56 格
UPDATE_INTERVAL = 50ms      // 更新间隔
```

---

## 4. 前后端通信

**无活跃桥接层。** 项目有两个独立实现：
- **Web 版本**（index.html + js/）：独立运行，功能完整
- **C++ 版本**（src/）：SFML 实现，仅作参考

---

## 5. 扩展开发指南

### 5.1 添加新元素步骤

1. **在 `js/elements.js` 中添加：**
   - 添加新的元素常量值
   - 在 `COLORS` 中添加颜色
   - 在 `ELEMENT_NAMES` 中添加名称
   - 在 `KEY_MAP` 中添加快捷键

2. **在 `js/physics.js` 中实现物理行为：**
   - 在 `PhysicsEngine` 类中添加新的处理方法
   - 在 `update()` 方法中调用

3. **在 `js/ui.js` 中添加放置规则：**
   - 修改 `canPlaceElement()` 检查新元素的放置条件
   - 修改 `tryPlaceElement()` 处理放置逻辑

4. **如需渲染特殊效果：**
   - 在 `js/renderer.js` 中添加特殊渲染逻辑

### 5.2 关键文件对应关系

| 操作 | 修改文件 |
|------|----------|
| 添加新元素类型 | `js/elements.js` |
| 添加物理行为 | `js/physics.js` |
| 添加放置规则 | `js/ui.js` |
| 添加视觉效果 | `js/renderer.js` |
| 修改布局/UI | `index.html`, `css/style.css` |

---

## 6. 元素扩展规划（下一阶段）

详见 `docs/item-expansion-plan.md`