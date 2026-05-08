#include "Fire.h"

Fire::Fire(int x, int y) : Element(Element::Type::FIRE, x, y) {
}

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

void Fire::render(sf::RenderWindow& window, int cellSize) {
    sf::RectangleShape cell(sf::Vector2f(cellSize, cellSize));
    cell.setPosition(x * cellSize, y * cellSize);
    cell.setFillColor(sf::Color(255, 0, 0)); // 红色
    window.draw(cell);
}
