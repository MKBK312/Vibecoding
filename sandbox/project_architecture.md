# 沙盒物理模拟项目架构设计

## 技术栈选择

### 核心技术
- **编程语言**：C++17
- **图形库**：SFML 2.5.1
- **构建系统**：CMake 3.16+
- **开发环境**：Visual Studio 2022 或 VS Code

### 依赖库
- **SFML**：用于窗口管理、渲染和用户输入
- **CMake**：跨平台构建系统

## 项目目录结构

```
sandbox/
├── CMakeLists.txt          # CMake配置文件
├── src/
│   ├── main.cpp            # 主入口
│   ├── core/
│   │   ├── Game.h          # 游戏核心类
│   │   ├── Game.cpp        # 游戏核心实现
│   │   ├── Grid.h          # 网格管理类
│   │   ├── Grid.cpp        # 网格管理实现
│   │   ├── Element.h       # 元素基类
│   │   └── Element.cpp     # 元素基类实现
│   ├── elements/
│   │   ├── Water.h         # 水元素
│   │   ├── Water.cpp       # 水元素实现
│   │   ├── Sand.h          # 沙子元素
│   │   ├── Sand.cpp        # 沙子元素实现
│   │   ├── Wood.h          # 木头元素
│   │   ├── Wood.cpp        # 木头元素实现
│   │   ├── Fire.h          # 火种元素
│   │   ├── Fire.cpp        # 火种元素实现
│   │   ├── BurningWood.h   # 燃烧的木头
│   │   └── BurningWood.cpp # 燃烧的木头实现
│   ├── utils/
│   │   ├── Timer.h         # 计时器
│   │   ├── Timer.cpp       # 计时器实现
│   │   ├── Random.h        # 随机数生成
│   │   └── Random.cpp      # 随机数实现
│   └── config/
│       └── Config.h        # 配置文件
├── include/                # 头文件目录
├── assets/                 # 资源目录
│   └── textures/           # 纹理目录
└── build/                  # 构建输出目录
```

## 核心类设计

### 1. Element 基类
```cpp
class Element {
public:
    enum class Type {
        EMPTY,
        WATER,
        SAND,
        WOOD,
        FIRE,
        BURNING_WOOD
    };

    Element(Type type, int x, int y);
    virtual ~Element() = default;

    virtual void update(Grid& grid) = 0;
    virtual void render(sf::RenderWindow& window, int cellSize) = 0;

    Type getType() const;
    int getX() const;
    int getY() const;
    void setPosition(int x, int y);

protected:
    Type type;
    int x, y;
};
```

### 2. Grid 类
```cpp
class Grid {
public:
    Grid(int width, int height);
    ~Grid();

    void update();
    void render(sf::RenderWindow& window, int cellSize);
    void setElement(int x, int y, Element::Type type);
    Element* getElement(int x, int y) const;
    bool isInBounds(int x, int y) const;

private:
    int width, height;
    std::vector<std::vector<Element*>> cells;
};
```

### 3. Game 类
```cpp
class Game {
public:
    Game(int width, int height, int cellSize);
    ~Game();

    void run();

private:
    sf::RenderWindow window;
    Grid grid;
    int cellSize;
    Element::Type currentElement;

    void handleInput();
    void update();
    void render();
};
```

### 4. 具体元素类
- **Water**：实现水流逻辑
- **Sand**：实现沙子下落逻辑
- **Wood**：实现木头放置逻辑
- **Fire**：实现火种燃烧逻辑
- **BurningWood**：实现燃烧的木头逻辑

## 技术实现要点

### 1. 网格更新策略
- 使用双重缓冲区技术，避免在更新过程中相互影响
- 按特定顺序更新元素（从上到下，从左到右）
- 优化更新逻辑，只处理需要更新的元素

### 2. 物理规则实现
- **沙子**：检查下方是否为空，为空则下落
- **水**：检查四个方向是否为空，随机选择一个方向流动
- **火种**：检查周围是否有木头，触发燃烧
- **燃烧**：使用计时器管理燃烧时间
- **灭火**：水与燃烧的木头接触时触发

### 3. 性能优化
- 使用内存池管理元素对象
- 避免频繁的内存分配和释放
- 考虑使用多线程处理网格更新

### 4. 用户交互
- 鼠标点击放置元素
- 键盘按键切换元素类型
- 窗口大小可调整

## 构建系统配置

### CMakeLists.txt
```cmake
cmake_minimum_required(VERSION 3.16)
project(SandboxSimulation)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找SFML
find_package(SFML 2.5 COMPONENTS graphics window system REQUIRED)

# 包含目录
include_directories(include src)

# 源文件
set(SOURCES
    src/main.cpp
    src/core/Game.cpp
    src/core/Grid.cpp
    src/core/Element.cpp
    src/elements/Water.cpp
    src/elements/Sand.cpp
    src/elements/Wood.cpp
    src/elements/Fire.cpp
    src/elements/BurningWood.cpp
    src/utils/Timer.cpp
    src/utils/Random.cpp
)

# 可执行文件
add_executable(SandboxSimulation ${SOURCES})

# 链接SFML
target_link_libraries(SandboxSimulation sfml-graphics sfml-window sfml-system)

# 复制资源文件
file(COPY assets DESTINATION ${CMAKE_BINARY_DIR})
```

## 技术难点及解决方案

### 1. 元素状态管理
- **问题**：元素状态转换复杂，需要跟踪燃烧时间等信息
- **解决方案**：为每个元素添加状态属性，使用计时器管理时间相关逻辑

### 2. 网格更新性能
- **问题**：大规模网格更新可能导致性能问题
- **解决方案**：使用双重缓冲区，只更新需要变化的元素

### 3. 内存管理
- **问题**：频繁创建和销毁元素对象会影响性能
- **解决方案**：使用对象池模式，预分配元素对象

### 4. 物理规则实现
- **问题**：实现真实的物理行为需要复杂的逻辑
- **解决方案**：简化物理模型，专注于核心规则的实现

## 扩展性考虑

### 未来功能扩展
- 添加更多元素类型（如石头、植物等）
- 实现重力系统
- 添加天气系统（如雨、雪等）
- 支持保存和加载场景
- 实现粒子效果

### 代码扩展性
- 使用面向对象设计，便于添加新元素类型
- 模块化设计，便于修改和扩展功能
- 配置文件支持，便于调整参数