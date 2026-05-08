#include "Game.h"

Game::Game(int width, int height, int cellSize) : 
    window(sf::VideoMode(width, height), "Sandbox Simulation"),
    grid(width / cellSize, height / cellSize),
    cellSize(cellSize),
    currentElement(Element::Type::SAND) {
    
    // 加载字体
    font.loadFromFile("assets/fonts/Arial.ttf");
    
    // 初始化元素提示
    elementHint.setFont(font);
    elementHint.setCharacterSize(16);
    elementHint.setFillColor(sf::Color::White);
    elementHint.setPosition(10, 10);
    updateElementHint();
    
    // 初始化退出按钮
    exitButton.setSize(sf::Vector2f(100, 40));
    exitButton.setFillColor(sf::Color::Red);
    exitButton.setPosition(width - 110, 10);
    
    exitButtonText.setFont(font);
    exitButtonText.setString("退出");
    exitButtonText.setCharacterSize(16);
    exitButtonText.setFillColor(sf::Color::White);
    exitButtonText.setPosition(width - 100, 15);
}

Game::~Game() {
}

void Game::run() {
    sf::Clock clock;
    while (window.isOpen()) {
        handleInput();
        update();
        render();
        sf::sleep(sf::milliseconds(16)); // 约60fps
    }
}

void Game::handleInput() {
    sf::Event event;
    while (window.pollEvent(event)) {
        if (event.type == sf::Event::Closed) {
            window.close();
        }
        
        // 键盘输入
        if (event.type == sf::Event::KeyPressed) {
            switch (event.key.code) {
                case sf::Keyboard::A:
                    currentElement = Element::Type::SAND;
                    updateElementHint();
                    break;
                case sf::Keyboard::S:
                    currentElement = Element::Type::WATER;
                    updateElementHint();
                    break;
                case sf::Keyboard::D:
                    currentElement = Element::Type::WOOD;
                    updateElementHint();
                    break;
                case sf::Keyboard::F:
                    currentElement = Element::Type::FIRE;
                    updateElementHint();
                    break;
                case sf::Keyboard::E:
                    currentElement = Element::Type::EMPTY;
                    updateElementHint();
                    break;
                case sf::Keyboard::Escape:
                    window.close();
                    break;
            }
        }
        
        // 鼠标输入
        if (event.type == sf::Event::MouseButtonPressed) {
            if (event.mouseButton.button == sf::Mouse::Left) {
                sf::Vector2i mousePos = sf::Mouse::getPosition(window);
                if (isMouseOverExitButton(mousePos)) {
                    window.close();
                } else {
                    // 计算网格坐标
                    int gridX = mousePos.x / cellSize;
                    int gridY = mousePos.y / cellSize;
                    // 放置元素
                    grid.setElement(gridX, gridY, currentElement);
                }
            }
        }
    }
}

void Game::update() {
    grid.update();
}

void Game::render() {
    window.clear(sf::Color::Black);
    
    // 渲染网格
    grid.render(window, cellSize);
    
    // 渲染元素提示
    window.draw(elementHint);
    
    // 渲染退出按钮
    window.draw(exitButton);
    window.draw(exitButtonText);
    
    window.display();
}

void Game::updateElementHint() {
    std::string hint = "当前元素: ";
    switch (currentElement) {
        case Element::Type::SAND:
            hint += "沙子 (A)";
            break;
        case Element::Type::WATER:
            hint += "水 (S)";
            break;
        case Element::Type::WOOD:
            hint += "木头 (D)";
            break;
        case Element::Type::FIRE:
            hint += "火种 (F)";
            break;
        case Element::Type::EMPTY:
            hint += "空地 (E)";
            break;
    }
    hint += " | 退出: 点击按钮或按ESC";
    elementHint.setString(hint);
}

bool Game::isMouseOverExitButton(sf::Vector2i mousePos) {
    return exitButton.getGlobalBounds().contains(static_cast<sf::Vector2f>(mousePos));
}
