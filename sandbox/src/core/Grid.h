#ifndef GRID_H
#define GRID_H

#include <SFML/Graphics.hpp>
#include <vector>
#include "Element.h"

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

#endif // GRID_H
