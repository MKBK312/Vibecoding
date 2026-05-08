#ifndef FIRE_H
#define FIRE_H

#include "core/Element.h"
#include "core/Grid.h"

class Fire : public Element {
public:
    Fire(int x, int y);
    ~Fire() override = default;

    void update(Grid& grid) override;
    void render(sf::RenderWindow& window, int cellSize) override;
};

#endif // FIRE_H
