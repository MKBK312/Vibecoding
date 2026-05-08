#ifndef BURNING_WOOD_H
#define BURNING_WOOD_H

#include "core/Element.h"
#include "core/Grid.h"
#include "utils/Timer.h"

class BurningWood : public Element {
public:
    BurningWood(int x, int y);
    ~BurningWood() override = default;

    void update(Grid& grid) override;
    void render(sf::RenderWindow& window, int cellSize) override;

private:
    Timer burnTimer;
};

#endif // BURNING_WOOD_H
