#include "Water.h"
#include "utils/Random.h"

Water::Water(int x, int y) : Element(Element::Type::WATER, x, y) {
}

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
    
    // 重力影响：优先向下流动
    if (grid.isInBounds(x, y + 1) && grid.getElement(x, y + 1)->getType() == Element::Type::EMPTY) {
        // 向下流动
        grid.setElement(x, y, Element::Type::EMPTY);
        grid.setElement(x, y + 1, Element::Type::WATER);
        setPosition(x, y + 1);
    } else {
        // 水平流动
        int horizontalDirs[2][2] = {{-1, 0}, {1, 0}};
        std::shuffle(std::begin(horizontalDirs), std::end(horizontalDirs), Random::getEngine());
        
        for (auto& dir : horizontalDirs) {
            int nx = x + dir[0];
            int ny = y + dir[1];
            if (grid.isInBounds(nx, ny) && grid.getElement(nx, ny)->getType() == Element::Type::EMPTY) {
                // 水平流动
                grid.setElement(x, y, Element::Type::EMPTY);
                grid.setElement(nx, ny, Element::Type::WATER);
                setPosition(nx, ny);
                break;
            }
        }
    }
}

void Water::render(sf::RenderWindow& window, int cellSize) {
    sf::RectangleShape cell(sf::Vector2f(cellSize, cellSize));
    cell.setPosition(x * cellSize, y * cellSize);
    cell.setFillColor(sf::Color(0, 0, 255)); // 蓝色
    window.draw(cell);
}
