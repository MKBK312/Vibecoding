# 沙盒物理模拟项目实现计划

## 开发阶段划分

### 阶段一：项目初始化与基础架构（2天）
1. **环境搭建**
   - 安装Visual Studio 2022或VS Code
   - 安装SFML 2.5.1
   - 配置CMake环境

2. **项目初始化**
   - 创建CMakeLists.txt文件
   - 建立项目目录结构
   - 配置构建系统

3. **核心类设计**
   - 实现Element基类
   - 实现Grid类
   - 实现Game类

### 阶段二：元素实现（3天）
1. **基础元素实现**
   - 实现Sand（沙子）元素
   - 实现Water（水）元素
   - 实现Wood（木头）元素

2. **高级元素实现**
   - 实现Fire（火种）元素
   - 实现BurningWood（燃烧的木头）元素
   - 实现元素间的交互逻辑

### 阶段三：游戏逻辑与用户交互（2天）
1. **游戏逻辑实现**
   - 实现网格更新逻辑
   - 实现物理规则
   - 实现燃烧计时逻辑

2. **用户交互实现**
   - 实现鼠标点击放置元素
   - 实现键盘切换元素类型
   - 实现窗口大小调整

### 阶段四：优化与测试（2天）
1. **性能优化**
   - 实现双重缓冲区
   - 优化更新逻辑
   - 内存管理优化

2. **测试与调试**
   - 测试各元素的行为
   - 测试元素间的交互
   - 调试性能问题

3. **文档完善**
   - 编写README.md
   - 完善代码注释
   - 准备项目展示材料

## 代码风格指南

### 命名规范
- **类名**：使用PascalCase（如`Element`, `Grid`）
- **函数名**：使用camelCase（如`update()`, `render()`）
- **变量名**：使用camelCase（如`cellSize`, `currentElement`）
- **常量**：使用全大写加下划线（如`MAX_GRID_WIDTH`）
- **枚举**：使用PascalCase，枚举值使用全大写加下划线（如`Type::WATER`）

### 代码格式
- **缩进**：使用4个空格（不使用制表符）
- **行宽**：每行不超过100个字符
- **括号**：使用K&R风格
- **空格**：
  - 运算符两侧加空格（如`x = y + z`）
  - 逗号后加空格（如`func(a, b, c)`）
  - 大括号前加空格（如`if (condition) {`）

### 注释规范
- **文件头部**：包含文件说明、作者、创建日期
- **类注释**：描述类的功能和用途
- **函数注释**：描述函数的功能、参数和返回值
- **复杂逻辑**：添加必要的注释说明

### 代码结构
- **头文件**：只包含声明，不包含实现
- **源文件**：包含实现
- **类定义**：遵循访问控制顺序：public → protected → private
- **函数实现**：保持函数简洁，每个函数不超过50行

### 异常处理
- 使用异常处理错误情况
- 避免使用try-catch块包裹整个函数
- 只捕获必要的异常

### 内存管理
- 使用智能指针管理动态内存
- 避免内存泄漏
- 合理使用对象池模式

### 性能考虑
- 避免不必要的拷贝操作
- 使用引用传递大对象
- 优化循环和条件判断
- 考虑缓存友好的数据结构

## 实现细节

### 网格更新策略
1. **双重缓冲区**：使用两个网格，一个用于当前状态，一个用于下一状态
2. **更新顺序**：从上到下，从左到右更新元素
3. **状态标记**：标记已更新的元素，避免重复更新

### 元素行为实现

#### 沙子（Sand）
```cpp
void Sand::update(Grid& grid) {
    // 检查下方是否为空
    if (grid.isInBounds(x, y + 1) && grid.getElement(x, y + 1)->getType() == Element::Type::EMPTY) {
        // 下落
        grid.setElement(x, y, Element::Type::EMPTY);
        grid.setElement(x, y + 1, Element::Type::SAND);
        setPosition(x, y + 1);
    }
}
```

#### 水（Water）
```cpp
void Water::update(Grid& grid) {
    // 随机选择流动方向
    int directions[4][2] = {{0, 1}, {-1, 0}, {1, 0}, {0, -1}};
    std::shuffle(std::begin(directions), std::end(directions), Random::getEngine());
    
    for (auto& dir : directions) {
        int nx = x + dir[0];
        int ny = y + dir[1];
        if (grid.isInBounds(nx, ny) && grid.getElement(nx, ny)->getType() == Element::Type::EMPTY) {
            // 流动
            grid.setElement(x, y, Element::Type::EMPTY);
            grid.setElement(nx, ny, Element::Type::WATER);
            setPosition(nx, ny);
            break;
        }
    }
}
```

#### 火种（Fire）
```cpp
void Fire::update(Grid& grid) {
    // 检查周围是否有木头
    int directions[4][2] = {{0, 1}, {-1, 0}, {1, 0}, {0, -1}};
    for (auto& dir : directions) {
        int nx = x + dir[0];
        int ny = y + dir[1];
        if (grid.isInBounds(nx, ny) && grid.getElement(nx, ny)->getType() == Element::Type::WOOD) {
            // 触发燃烧
            grid.setElement(nx, ny, Element::Type::BURNING_WOOD);
        }
    }
}
```

#### 燃烧的木头（BurningWood）
```cpp
void BurningWood::update(Grid& grid) {
    // 检查燃烧时间
    if (burnTimer.getElapsedTime().asSeconds() >= 3.0f) {
        // 燃烧结束，变为空地
        grid.setElement(x, y, Element::Type::EMPTY);
        return;
    }
    
    // 检查周围是否有其他木头
    int directions[4][2] = {{0, 1}, {-1, 0}, {1, 0}, {0, -1}};
    for (auto& dir : directions) {
        int nx = x + dir[0];
        int ny = y + dir[1];
        if (grid.isInBounds(nx, ny) && grid.getElement(nx, ny)->getType() == Element::Type::WOOD) {
            // 触发周围木头燃烧
            grid.setElement(nx, ny, Element::Type::BURNING_WOOD);
        }
    }
}
```

### 灭火逻辑
```cpp
// 在Water的update方法中添加
void Water::update(Grid& grid) {
    // 检查周围是否有燃烧的木头
    int directions[4][2] = {{0, 1}, {-1, 0}, {1, 0}, {0, -1}};
    for (auto& dir : directions) {
        int nx = x + dir[0];
        int ny = y + dir[1];
        if (grid.isInBounds(nx, ny) && grid.getElement(nx, ny)->getType() == Element::Type::BURNING_WOOD) {
            // 浇灭燃烧的木头
            grid.setElement(nx, ny, Element::Type::EMPTY);
        }
    }
    
    // 原有流动逻辑
    // ...
}
```

## 测试计划

### 功能测试
1. **沙子测试**：验证沙子是否正确下落
2. **水测试**：验证水是否正确流动
3. **燃烧测试**：验证火种是否正确点燃木头
4. **灭火测试**：验证水是否正确浇灭燃烧的木头
5. **交互测试**：验证用户是否可以正确放置和切换元素

### 性能测试
1. **网格大小测试**：测试不同网格大小下的性能
2. **元素数量测试**：测试大量元素时的性能
3. **更新频率测试**：测试不同更新频率下的性能

### 兼容性测试
1. **不同编译器测试**：在不同编译器下测试
2. **不同操作系统测试**：在不同操作系统下测试

## 项目交付物

1. **源代码**：完整的C++源代码
2. **可执行文件**：编译好的可执行文件
3. **文档**：
   - README.md：项目说明
   - 技术文档：架构设计和实现细节
   - 使用说明：如何运行和使用项目
4. **演示视频**：项目功能演示视频

## 风险评估

### 潜在风险
1. **性能问题**：大规模网格可能导致性能下降
2. **内存泄漏**：不正确的内存管理可能导致内存泄漏
3. **逻辑错误**：物理规则实现可能存在逻辑错误
4. **兼容性问题**：不同编译器和操作系统可能存在兼容性问题

### 风险缓解策略
1. **性能优化**：使用双重缓冲区和优化算法
2. **内存管理**：使用智能指针和对象池
3. **测试**：进行充分的测试和调试
4. **跨平台测试**：在不同环境下测试

## 总结

本实现计划提供了一个详细的沙盒物理模拟项目开发指南，包括开发阶段划分、代码风格指南、实现细节和测试计划。按照此计划，预计可以在1-2周内完成一个功能完整、性能良好的沙盒物理模拟项目。该项目将展示C++的性能优势和面向对象设计能力，适合作为面试展示项目。