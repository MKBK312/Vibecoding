#ifndef TIMER_H
#define TIMER_H

#include <SFML/System.hpp>

class Timer {
public:
    Timer();
    ~Timer() = default;

    void start();
    void stop();
    void reset();
    sf::Time getElapsedTime() const;
    bool isRunning() const;

private:
    sf::Clock clock;
    sf::Time elapsedTime;
    bool running;
};

#endif // TIMER_H
