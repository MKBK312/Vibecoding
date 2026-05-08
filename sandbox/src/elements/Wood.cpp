#include "Wood.h"

Wood::Wood(int x, int y) : Element(Element::Type::WOOD, x, y) {
}

void Wood::update(Grid& grid) {
    // 木头是静态元素，不需要移动
}

void Wood::render(sf::RenderWindow& window, int cellSize) {
    sf::RectangleShape cell(sf::Vector2f(cellSize, cellSize));
    cell.setPosition(x * cellSize, y * cellSize);
    cell.setFillColor(sf::Color(139, 69, 19)); // 棕色
    window.draw(cell);
}
