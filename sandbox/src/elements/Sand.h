#ifndef SAND_H
#define SAND_H

#include "core/Element.h"
#include "core/Grid.h"

class Sand : public Element {
public:
    Sand(int x, int y);
    ~Sand() override = default;

    void update(Grid& grid) override;
    void render(sf::RenderWindow& window, int cellSize) override;
};

#endif // SAND_H
