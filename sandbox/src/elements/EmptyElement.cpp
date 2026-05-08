#include "EmptyElement.h"

EmptyElement::EmptyElement(int x, int y) : Element(Element::Type::EMPTY, x, y) {
}

void EmptyElement::update(Grid& grid) {
}

void EmptyElement::render(sf::RenderWindow& window, int cellSize) {
}
