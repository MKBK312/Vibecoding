#include "Element.h"

Element::Element(Type type, int x, int y) : type(type), x(x), y(y) {
}

Element::Type Element::getType() const {
    return type;
}

int Element::getX() const {
    return x;
}

int Element::getY() const {
    return y;
}

void Element::setPosition(int x, int y) {
    this->x = x;
    this->y = y;
}
