#include "Sand.h"

Sand::Sand(int x, int y) : Element(Element::Type::SAND, x, y) {
}

void Sand::update(Grid& grid) {
    // 重力影响：优先向下移动
    if (grid.isInBounds(x, y + 1) && grid.getElement(x, y + 1)->getType() == Element::Type::EMPTY) {
        // 下落
        grid.setElement(x, y, Element::Type::EMPTY);
        grid.setElement(x, y + 1, Element::Type::SAND);
        setPosition(x, y + 1);
    } else if (grid.isInBounds(x - 1, y + 1) && grid.getElement(x - 1, y + 1)->getType() == Element::Type::EMPTY) {
        // 向左下方移动
        grid.setElement(x, y, Element::Type::EMPTY);
        grid.setElement(x - 1, y + 1, Element::Type::SAND);
        setPosition(x - 1, y + 1);
    } else if (grid.isInBounds(x + 1, y + 1) && grid.getElement(x + 1, y + 1)->getType() == Element::Type::EMPTY) {
        // 向右下方移动
        grid.setElement(x, y, Element::Type::EMPTY);
        grid.setElement(x + 1, y + 1, Element::Type::SAND);
        setPosition(x + 1, y + 1);
    }
}

void Sand::render(sf::RenderWindow& window, int cellSize) {
    sf::RectangleShape cell(sf::Vector2f(cellSize, cellSize));
    cell.setPosition(x * cellSize, y * cellSize);
    cell.setFillColor(sf::Color(255, 255, 0)); // 黄色
    window.draw(cell);
}
