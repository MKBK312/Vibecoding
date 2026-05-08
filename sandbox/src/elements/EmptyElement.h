#ifndef EMPTY_ELEMENT_H
#define EMPTY_ELEMENT_H

#include "core/Element.h"
#include "core/Grid.h"

class EmptyElement : public Element {
public:
    EmptyElement(int x, int y);
    ~EmptyElement() override = default;

    void update(Grid& grid) override;
    void render(sf::RenderWindow& window, int cellSize) override;
};

#endif // EMPTY_ELEMENT_H
