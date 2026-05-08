#include "BurningWood.h"

BurningWood::BurningWood(int x, int y) : Element(Element::Type::BURNING_WOOD, x, y), burnTimer() {
    burnTimer.start();
}

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

void BurningWood::render(sf::RenderWindow& window, int cellSize) {
    sf::RectangleShape cell(sf::Vector2f(cellSize, cellSize));
    cell.setPosition(x * cellSize, y * cellSize);
    cell.setFillColor(sf::Color(255, 165, 0)); // 橙色
    window.draw(cell);
}
