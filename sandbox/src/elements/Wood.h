#ifndef WOOD_H
#define WOOD_H

#include "core/Element.h"

class Wood : public Element {
public:
    Wood(int x, int y);
    ~Wood() override = default;

    void update(Grid& grid) override;
    void render(sf::RenderWindow& window, int cellSize) override;
};

#endif // WOOD_H
