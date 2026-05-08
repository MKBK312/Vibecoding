#ifndef WATER_H
#define WATER_H

#include "core/Element.h"
#include "core/Grid.h"

class Water : public Element {
public:
    Water(int x, int y);
    ~Water() override = default;

    void update(Grid& grid) override;
    void render(sf::RenderWindow& window, int cellSize) override;
};

#endif // WATER_H
