#ifndef ELEMENT_H
#define ELEMENT_H

#include <SFML/Graphics.hpp>

class Grid;

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

#endif // ELEMENT_H
