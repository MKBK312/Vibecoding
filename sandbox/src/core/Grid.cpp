#include "Grid.h"
#include "elements/Water.h"
#include "elements/Sand.h"
#include "elements/Wood.h"
#include "elements/Fire.h"
#include "elements/BurningWood.h"
#include "elements/EmptyElement.h"

Grid::Grid(int width, int height) : width(width), height(height) {
    cells.resize(height, std::vector<Element*>(width, nullptr));
    
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            cells[y][x] = new EmptyElement(x, y);
        }
    }
}

Grid::~Grid() {
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            delete cells[y][x];
        }
    }
}

void Grid::update() {
    // 双重缓冲区，避免更新时相互影响
    std::vector<std::vector<Element::Type>> newCellTypes(height, std::vector<Element::Type>(width, Element::Type::EMPTY));
    
    // 记录每个位置的新类型
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            newCellTypes[y][x] = cells[y][x]->getType();
        }
    }
    
    // 更新元素
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            cells[y][x]->update(*this);
        }
    }
}

void Grid::render(sf::RenderWindow& window, int cellSize) {
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            cells[y][x]->render(window, cellSize);
        }
    }
}

void Grid::setElement(int x, int y, Element::Type type) {
    if (!isInBounds(x, y)) return;
    
    delete cells[y][x];
    
    switch (type) {
        case Element::Type::WATER:
            cells[y][x] = new Water(x, y);
            break;
        case Element::Type::SAND:
            cells[y][x] = new Sand(x, y);
            break;
        case Element::Type::WOOD:
            cells[y][x] = new Wood(x, y);
            break;
        case Element::Type::FIRE:
            cells[y][x] = new Fire(x, y);
            break;
        case Element::Type::BURNING_WOOD:
            cells[y][x] = new BurningWood(x, y);
            break;
        default:
            cells[y][x] = new EmptyElement(x, y);
            break;
    }
}

Element* Grid::getElement(int x, int y) const {
    if (!isInBounds(x, y)) return nullptr;
    return cells[y][x];
}

bool Grid::isInBounds(int x, int y) const {
    return x >= 0 && x < width && y >= 0 && y < height;
}
