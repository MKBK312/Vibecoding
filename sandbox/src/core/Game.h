#ifndef GAME_H
#define GAME_H

#include <SFML/Graphics.hpp>
#include "Grid.h"

class Game {
public:
    Game(int width, int height, int cellSize);
    ~Game();

    void run();

private:
    sf::RenderWindow window;
    Grid grid;
    int cellSize;
    Element::Type currentElement;
    sf::Font font;
    sf::Text elementHint;
    sf::RectangleShape exitButton;
    sf::Text exitButtonText;

    void handleInput();
    void update();
    void render();
    void updateElementHint();
    bool isMouseOverExitButton(sf::Vector2i mousePos);
};

#endif // GAME_H
